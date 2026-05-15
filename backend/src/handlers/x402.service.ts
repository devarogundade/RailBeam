import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  HandlerContext,
  HandlerMessage,
  HandlerService,
} from './handler.types';
import { X402InputSchema, type X402Input } from './handler-inputs.schema';
import { PaymentRequestsService } from '../payments/payment-requests.service';
import {
  assertBeamUsdcEAsset,
  BEAM_USDC_E_ADDRESS,
  BEAM_USDC_E_DECIMALS,
  beamUsdcEX402PaymentExtra,
  normalizeBeamUsdcEAsset,
} from '../beam/beam-usdc-e.config';
import { normalizeX402Network } from '../payments/payment-required.util';

/**
 * Builds x402-style payment instructions for a paywalled HTTP resource
 * and persists a {@link PaymentRequest} row for `/payments/:id` + `/pay/:id`.
 * @see https://www.x402.org/
 */
@Injectable()
export class X402Service implements HandlerService {
  readonly id = 'create_x402_payment' as const;

  constructor(private readonly paymentRequests: PaymentRequestsService) {}

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = X402InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const {
      checkoutType,
      id,
      amount,
      currency,
      network,
      payTo,
      title,
      description,
      resourceUrl,
      expiresAt,
      decimals,
      attachment,
    }: X402Input = parsed.data;

    const payer = ctx.walletAddress.trim().toLowerCase();
    const displayTitle = title ?? (checkoutType === 'on-chain' ? 'Payment' : `Resource ${id?.trim() ?? ''}`);

    if (checkoutType === 'on-chain') {
      const row = await this.paymentRequests.createOnChainPayment({
        title: displayTitle,
        description,
        attachment,
        asset: currency,
        amount,
        payTo,
        network,
        expiresAt,
        createdByWallet: payer,
        decimals,
      });

      const paymentRequestId = row._id.toHexString();

      return {
        message:
          'Your checkout link is ready. Share it so payers can complete the transfer from a crypto wallet.',
        data: {
          checkoutType: 'on-chain',
          paymentRequestId,
          payPath: `/pay/${paymentRequestId}`,
        },
      };
    }

    const resourceId = id?.trim();
    if (!resourceId) {
      throw new BadRequestException('id is required for x402 checkouts');
    }
    assertBeamUsdcEAsset(currency);
    const usdcAsset = normalizeBeamUsdcEAsset(currency);
    const tokenDecimals = decimals ?? BEAM_USDC_E_DECIMALS;
    const resourceKey = `${network}:${resourceId}`;
    const caipNetwork = normalizeX402Network(network);
    const acceptDescription =
      description ?? title ?? `Payment for ${resourceId}`;

    const handlerData: Record<string, unknown> = {
      x402Version: 2,
      resource: {
        url: resourceUrl?.trim() || resourceKey,
        description: acceptDescription,
        mimeType: 'application/json',
        serviceName: 'Beam',
      },
      payerWallet: payer,
      payment: {
        scheme: 'exact',
        network: caipNetwork,
        asset: usdcAsset,
        amount,
        payTo,
      },
      accepts: [
        {
          scheme: 'exact',
          network: caipNetwork,
          amount,
          asset: usdcAsset,
          payTo,
          maxTimeoutSeconds: 600,
          extra: beamUsdcEX402PaymentExtra(),
          description: acceptDescription,
        },
      ],
    };

    const row = await this.paymentRequests.createX402Payment({
      title: displayTitle,
      description,
      attachment,
      asset: usdcAsset,
      amount,
      payTo,
      network,
      expiresAt,
      resourceId,
      resourceUrl,
      createdByWallet: payer,
      decimals: tokenDecimals,
      x402Payload: handlerData,
    });

    const paymentRequestId = row._id.toHexString();

    return {
      message:
        'Your payment checkout is ready. Use the buttons below to open or copy the pay link ' +
        'so you or someone else can pay from a crypto wallet.',
      data: {
        checkoutType: 'x402',
        ...handlerData,
        ...(decimals !== undefined ? { decimals } : {}),
        paymentRequestId,
        payPath: `/pay/${paymentRequestId}`,
      },
    };
  }
}
