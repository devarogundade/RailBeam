import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HTTPFacilitatorClient } from '@x402/core/http';
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from '@x402/core/types';
import type { PaymentRequestDocument } from '../mongo/schemas/payment-request.schema';
import { buildPaymentRequirementsFromDoc } from './payment-required.util';

@Injectable()
export class X402FacilitatorService {
  constructor(private readonly config: ConfigService) {}

  /** Base URL for {@link https://docs.x402.org/core-concepts/facilitator | x402 facilitator} HTTP API. */
  getBaseUrl(): string | undefined {
    const raw = this.config.get<string>('X402_FACILITATOR_URL')?.trim();
    if (!raw) return undefined;
    return raw.replace(/\/$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.getBaseUrl());
  }

  requirementsFor(doc: PaymentRequestDocument): PaymentRequirements {
    return buildPaymentRequirementsFromDoc(doc);
  }

  /**
   * Verifies then settles via facilitator; returns on-chain tx hash from settlement.
   */
  async verifyAndSettle(
    facilitatorUrl: string,
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<{ transaction: string; payer?: string }> {
    const client = new HTTPFacilitatorClient({ url: facilitatorUrl });
    let verify: VerifyResponse | undefined;
    try {
      verify = await client.verify(paymentPayload, paymentRequirements);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Facilitator verify failed: ${msg}`);
    }
    if (!verify.isValid) {
      throw new BadRequestException(
        verify.invalidMessage ??
          verify.invalidReason ??
          'Facilitator rejected payment verification.',
      );
    }
    let settle: SettleResponse | undefined;
    try {
      settle = await client.settle(paymentPayload, paymentRequirements);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Facilitator settle failed: ${msg}`);
    }
    if (!settle.success) {
      throw new BadRequestException(
        settle.errorMessage ??
          settle.errorReason ??
          'Facilitator settlement did not succeed.',
      );
    }
    const transaction = settle.transaction?.trim();
    if (!transaction) {
      throw new BadRequestException(
        'Facilitator reported success but did not return a transaction hash.',
      );
    }
    return { transaction, payer: settle.payer };
  }
}
