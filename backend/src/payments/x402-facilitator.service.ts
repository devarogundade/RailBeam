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

function normalizeNetwork(network: string): string {
  const n = network.trim();
  if (n.includes(':')) return n;
  if (/^\d+$/.test(n)) return `eip155:${n}`;
  return n;
}

/**
 * Builds facilitator {@link PaymentRequirements} from a persisted checkout row.
 * Stored x402 handler data may use `maxAmountRequired`; v2 uses `amount`.
 */
function buildPaymentRequirementsFromDoc(
  doc: PaymentRequestDocument,
): PaymentRequirements {
  const accepts = doc.x402Payload?.accepts;
  const a0 =
    Array.isArray(accepts) && accepts[0] && typeof accepts[0] === 'object'
      ? (accepts[0] as Record<string, unknown>)
      : {};

  const networkRaw = String(
    (typeof a0.network === 'string' && a0.network) || doc.network,
  );
  const network = normalizeNetwork(
    networkRaw,
  ) as PaymentRequirements['network'];

  const amount =
    typeof a0.maxAmountRequired === 'string'
      ? a0.maxAmountRequired
      : typeof a0.amount === 'string'
        ? a0.amount
        : doc.amount;

  const scheme = typeof a0.scheme === 'string' ? a0.scheme : 'exact';
  const asset = typeof a0.asset === 'string' ? a0.asset : doc.asset;
  const payTo = typeof a0.payTo === 'string' ? a0.payTo : doc.payTo;

  const maxTimeoutSeconds =
    typeof a0.maxTimeoutSeconds === 'number' &&
    Number.isFinite(a0.maxTimeoutSeconds)
      ? a0.maxTimeoutSeconds
      : 600;

  const extra =
    typeof a0.extra === 'object' &&
    a0.extra !== null &&
    !Array.isArray(a0.extra)
      ? (a0.extra as Record<string, unknown>)
      : {};

  return {
    scheme,
    network,
    asset,
    amount,
    payTo,
    maxTimeoutSeconds,
    extra,
  };
}

@Injectable()
export class X402FacilitatorService {
  constructor(private readonly config: ConfigService) {}

  /** Base URL for {@link https://docs.x402.org/core-concepts/facilitator | x402 facilitator} HTTP API. */
  getBaseUrl(): string | undefined {
    const raw = this.config.get<string>('X402_FACILITATOR_URL')?.trim();
    if (!raw) return undefined;
    return raw.replace(/\/$/, '');
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
    return { transaction: settle.transaction, payer: settle.payer };
  }
}
