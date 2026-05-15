import type {
  PaymentRequired,
  PaymentRequirements,
  ResourceInfo,
} from '@x402/core/types';
import type { PaymentRequestDocument } from '../mongo/schemas/payment-request.schema';
import {
  assertBeamUsdcEAsset,
  beamUsdcEX402PaymentExtra,
  isBeamUsdcEAsset,
  normalizeBeamUsdcEAsset,
} from '../beam/beam-usdc-e.config';

export function normalizeX402Network(network: string): string {
  const n = network.trim();
  if (n.includes(':')) return n;
  if (/^\d+$/.test(n)) return `eip155:${n}`;
  return n;
}

/**
 * Builds facilitator {@link PaymentRequirements} from a persisted checkout row.
 * Stored x402 handler data may use `maxAmountRequired`; v2 uses `amount`.
 */
export function buildPaymentRequirementsFromDoc(
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
  const network = normalizeX402Network(
    networkRaw,
  ) as PaymentRequirements['network'];

  const amount =
    typeof a0.maxAmountRequired === 'string'
      ? a0.maxAmountRequired
      : typeof a0.amount === 'string'
        ? a0.amount
        : doc.amount;

  const scheme = typeof a0.scheme === 'string' ? a0.scheme : 'exact';
  const assetRaw = typeof a0.asset === 'string' ? a0.asset : doc.asset;
  if (doc.type === 'x402') {
    assertBeamUsdcEAsset(assetRaw);
  }
  const asset =
    doc.type === 'x402' ? normalizeBeamUsdcEAsset(assetRaw) : assetRaw;
  const payTo = typeof a0.payTo === 'string' ? a0.payTo : doc.payTo;

  const maxTimeoutSeconds =
    typeof a0.maxTimeoutSeconds === 'number' &&
    Number.isFinite(a0.maxTimeoutSeconds)
      ? a0.maxTimeoutSeconds
      : 600;

  let extra: Record<string, unknown> =
    typeof a0.extra === 'object' &&
    a0.extra !== null &&
    !Array.isArray(a0.extra)
      ? { ...(a0.extra as Record<string, unknown>) }
      : {};
  if (
    doc.type === 'x402' &&
    isBeamUsdcEAsset(asset) &&
    (typeof extra.name !== 'string' || typeof extra.version !== 'string')
  ) {
    extra = { ...beamUsdcEX402PaymentExtra(), ...extra };
  }

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

/** v2 {@link PaymentRequired} for HTTP 402 + PAYMENT-REQUIRED header. */
export function buildPaymentRequiredFromDoc(
  doc: PaymentRequestDocument,
  accessUrl: string,
): PaymentRequired {
  const description =
    doc.description?.trim() ||
    (typeof doc.x402Payload?.accepts === 'object' &&
    Array.isArray(doc.x402Payload.accepts) &&
    doc.x402Payload.accepts[0] &&
    typeof doc.x402Payload.accepts[0] === 'object' &&
    typeof (doc.x402Payload.accepts[0] as Record<string, unknown>)
      .description === 'string'
      ? String(
          (doc.x402Payload.accepts[0] as Record<string, unknown>).description,
        )
      : doc.title);

  const resource: ResourceInfo = {
    url: accessUrl,
    description,
    mimeType: 'application/json',
    serviceName: 'Beam',
  };

  return {
    x402Version: 2,
    resource,
    accepts: [buildPaymentRequirementsFromDoc(doc)],
  };
}
