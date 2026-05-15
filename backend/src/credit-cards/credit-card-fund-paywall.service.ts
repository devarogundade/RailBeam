import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from '@x402/core/http';
import type {
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  SettleResponse,
} from '@x402/core/types';
import { parsePaymentPayload } from '@x402/core/schemas';
import { BEAM_EVM_CHAIN_IDS } from '../beam/beam-evm-chain';
import {
  assertBeamUsdcEAsset,
  BEAM_USDC_E_ADDRESS,
  usdcBaseUnitsFromUsdCents,
} from '../beam/beam-usdc-e.config';
import { normalizeX402Network } from '../payments/payment-required.util';
import { X402FacilitatorService } from '../payments/x402-facilitator.service';
import { FinancialSnapshotsService } from '../mongo/financial-snapshots.service';
import { CreditCardsService } from './credit-cards.service';
import { CreditCardFundingService } from './credit-card-funding.service';

@Injectable()
export class CreditCardFundPaywallService {
  constructor(
    private readonly cards: CreditCardsService,
    private readonly cardFunding: CreditCardFundingService,
    private readonly x402Facilitator: X402FacilitatorService,
    private readonly financialSnapshots: FinancialSnapshotsService,
  ) {}

  /**
   * x402 paywall for virtual card funding: payer wallet signs USDC.e (1:1 USD) to treasury.
   */
  async handleFundAccess(
    walletAddress: string,
    cardId: string,
    amountCents: number,
    req: Request,
    res: Response,
  ): Promise<void> {
    const recipient = this.cardFunding.getFundRecipient();
    if (!recipient) {
      throw new BadRequestException('Card funding treasury is not configured');
    }
    if (!this.x402Facilitator.isConfigured()) {
      throw new BadRequestException(
        'x402 card funding requires X402_FACILITATOR_URL to be configured.',
      );
    }

    const wallet = walletAddress.trim().toLowerCase();
    await this.cards.assertOwnedCard(wallet, cardId);

    const paymentSignature = this.readPaymentSignatureHeader(req);
    const accessUrl = this.accessUrl(req, cardId, amountCents);
    const usdcAmount = usdcBaseUnitsFromUsdCents(amountCents);
    const chainId = BEAM_EVM_CHAIN_IDS.mainnet;

    if (!paymentSignature) {
      this.sendPaymentRequired(res, {
        accessUrl,
        amountCents,
        usdcAmount,
        recipient,
        chainId,
      });
      return;
    }

    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = decodePaymentSignatureHeader(paymentSignature);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Invalid PAYMENT-SIGNATURE header: ${msg}`);
    }

    const parsed = parsePaymentPayload(paymentPayload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const requirements = this.buildFundRequirements({
      amountCents,
      usdcAmount,
      recipient,
      chainId,
    });

    const settled = await this.x402Facilitator.verifyAndSettle(
      this.x402Facilitator.getBaseUrl()!,
      parsed.data as PaymentPayload,
      requirements,
    );

    let releaseClaim: (() => Promise<void>) | undefined;
    try {
      releaseClaim = await this.cardFunding.lockFundSettlementTx({
        walletAddress: wallet,
        txHash: settled.transaction,
      });
      const doc = await this.cards.fund(wallet, cardId, amountCents);
      releaseClaim = undefined;
      void this.financialSnapshots
        .recordVirtualCardFund(wallet, amountCents)
        .catch(() => {
          /* best-effort rollup */
        });

      const settleResponse: SettleResponse = {
        success: true,
        transaction: settled.transaction,
        payer: settled.payer ?? wallet,
        network: requirements.network,
      };
      res.setHeader(
        'PAYMENT-RESPONSE',
        encodePaymentResponseHeader(settleResponse),
      );
      res.setHeader(
        'Access-Control-Expose-Headers',
        'PAYMENT-RESPONSE,PAYMENT-REQUIRED,PAYMENT-SIGNATURE',
      );
      res.status(200).json(this.cards.toPublic(doc));
    } finally {
      if (releaseClaim) {
        await releaseClaim();
      }
    }
  }

  private buildFundRequirements(input: {
    amountCents: number;
    usdcAmount: string;
    recipient: `0x${string}`;
    chainId: number;
  }): PaymentRequirements {
    assertBeamUsdcEAsset(BEAM_USDC_E_ADDRESS);
    return {
      scheme: 'exact',
      network: normalizeX402Network(
        String(input.chainId),
      ) as PaymentRequirements['network'],
      asset: BEAM_USDC_E_ADDRESS,
      amount: input.usdcAmount,
      payTo: input.recipient,
      maxTimeoutSeconds: 600,
      extra: {},
    };
  }

  private sendPaymentRequired(
    res: Response,
    input: {
      accessUrl: string;
      amountCents: number;
      usdcAmount: string;
      recipient: `0x${string}`;
      chainId: number;
    },
  ): void {
    const paymentRequired: PaymentRequired = {
      x402Version: 2,
      resource: {
        url: input.accessUrl,
        description: `Fund virtual card with $${(input.amountCents / 100).toFixed(2)} USDC.e`,
        mimeType: 'application/json',
        serviceName: 'Beam',
      },
      accepts: [this.buildFundRequirements(input)],
    };
    res.setHeader(
      'PAYMENT-REQUIRED',
      encodePaymentRequiredHeader(paymentRequired),
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'PAYMENT-REQUIRED,PAYMENT-RESPONSE,PAYMENT-SIGNATURE',
    );
    res.status(402).json(paymentRequired);
  }

  private accessUrl(req: Request, cardId: string, amountCents: number): string {
    const proto =
      (typeof req.headers['x-forwarded-proto'] === 'string'
        ? req.headers['x-forwarded-proto'].split(',')[0]?.trim()
        : undefined) ?? req.protocol;
    const host = req.get('host') ?? 'localhost';
    return `${proto}://${host}/users/me/credit-cards/${encodeURIComponent(cardId)}/fund/access?amountCents=${amountCents}`;
  }

  private readPaymentSignatureHeader(req: Request): string | undefined {
    const raw =
      req.headers['payment-signature'] ?? req.headers['x-payment'];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim()) {
      return raw[0].trim();
    }
    return undefined;
  }
}
