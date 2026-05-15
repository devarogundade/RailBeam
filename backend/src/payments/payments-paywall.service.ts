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
import type { PaymentPayload, SettleResponse } from '@x402/core/types';
import { parsePaymentPayload } from '@x402/core/schemas';
import type { PaymentRequestDocument } from '../mongo/schemas/payment-request.schema';
import { PaymentRequestsService } from './payment-requests.service';
import { X402FacilitatorService } from './x402-facilitator.service';
import { buildPaymentRequiredFromDoc } from './payment-required.util';

export type PaywallAccessBody = {
  status: string;
  id: string;
  txHash?: string;
  paidByWallet?: string;
  resourceUrl?: string;
};

@Injectable()
export class PaymentsPaywallService {
  constructor(
    private readonly paymentRequests: PaymentRequestsService,
    private readonly x402Facilitator: X402FacilitatorService,
  ) {}

  /**
   * x402 paywall for hosted checkout: 402 + PAYMENT-REQUIRED until the payer
   * retries with PAYMENT-SIGNATURE (wallet-signed payload, not server PK).
   */
  async handleAccess(
    id: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const doc = await this.paymentRequests.findDocumentById(id);
    if (!doc) {
      throw new NotFoundException();
    }
    if (doc.type !== 'x402') {
      throw new BadRequestException(
        'x402 paywall access is only available for x402 checkouts.',
      );
    }
    if (!this.x402Facilitator.isConfigured()) {
      throw new BadRequestException(
        'Facilitator settlement is not configured (X402_FACILITATOR_URL).',
      );
    }

    const accessUrl = this.accessUrl(req, id);
    const paymentSignature = this.readPaymentSignatureHeader(req);

    if (doc.status === 'paid') {
      this.sendPaid(res, doc);
      return;
    }

    if (doc.status === 'expired' || doc.status === 'cancelled') {
      throw new BadRequestException(
        `This payment request is ${doc.status} and cannot be settled.`,
      );
    }

    if (doc.status !== 'pending') {
      throw new BadRequestException(
        `Cannot access paywall while status is ${doc.status}.`,
      );
    }

    if (!paymentSignature) {
      this.sendPaymentRequired(res, doc, accessUrl);
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

    const requirements = this.x402Facilitator.requirementsFor(doc);
    const updated = await this.paymentRequests.confirmSettlement(id, {
      x402PaymentPayload: parsed.data as Record<string, unknown>,
    });

    const settleResponse: SettleResponse = {
      success: true,
      transaction: updated.txHash ?? '',
      payer: updated.paidByWallet,
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
    res.status(200).json({
      status: updated.status,
      id: updated.id,
      txHash: updated.txHash,
      paidByWallet: updated.paidByWallet,
      resourceUrl: updated.resourceUrl,
    } satisfies PaywallAccessBody);
  }

  private sendPaymentRequired(
    res: Response,
    doc: PaymentRequestDocument,
    accessUrl: string,
  ): void {
    const paymentRequired = buildPaymentRequiredFromDoc(doc, accessUrl);
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

  private sendPaid(res: Response, doc: PaymentRequestDocument): void {
    res.status(200).json({
      status: doc.status,
      id: doc._id.toHexString(),
      txHash: doc.txHash,
      paidByWallet: doc.paidByWallet,
      resourceUrl: doc.resourceUrl,
    } satisfies PaywallAccessBody);
  }

  private accessUrl(req: Request, id: string): string {
    const proto =
      (typeof req.headers['x-forwarded-proto'] === 'string'
        ? req.headers['x-forwarded-proto'].split(',')[0]?.trim()
        : undefined) ?? req.protocol;
    const host = req.get('host') ?? 'localhost';
    return `${proto}://${host}/payments/${encodeURIComponent(id)}/access`;
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
