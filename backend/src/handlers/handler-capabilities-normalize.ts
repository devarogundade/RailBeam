import { toUtf8String } from 'ethers';
import type { HandlerActionId } from './handler.types';
import { isHandlerActionId } from './handler.types';

/**
 * Legacy ids written to registry `handlerCapabilities` metadata before handler
 * names were aligned with `@beam/stardorm-api-contract` / `handlers.service.ts`.
 */
const LEGACY_HANDLER_CAPABILITY_ALIASES: Record<string, HandlerActionId> = {
  generate_financial_report: 'generate_financial_activity_report',
  generate_audit_report: 'generate_financial_activity_report',
  payroll_settlement: 'generate_payment_invoice',
  defi_strategy: 'draft_token_swap',
};

/** Parse comma-separated (or hex-encoded UTF-8) `handlerCapabilities` metadata. */
export function parseHandlerCapabilitiesMetadataValue(
  raw: string,
): string[] {
  let s = raw.trim();
  if (/^0x[0-9a-fA-F]+$/.test(s) && s.length >= 4 && s.length % 2 === 0) {
    try {
      s = toUtf8String(s);
    } catch {
      return [];
    }
  }
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function normalizeHandlerCapabilityIds(
  ids: Iterable<string>,
): HandlerActionId[] {
  const out = new Set<HandlerActionId>();
  for (const raw of ids) {
    const token = raw.trim();
    if (!token) continue;
    const mapped =
      isHandlerActionId(token)
        ? token
        : LEGACY_HANDLER_CAPABILITY_ALIASES[token];
    if (mapped) out.add(mapped);
  }
  return [...out];
}
