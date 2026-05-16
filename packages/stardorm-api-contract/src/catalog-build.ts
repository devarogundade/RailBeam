/**
 * Ignition seed registration order → on-chain `agentId` (1-based).
 * Keep aligned with `smart-contracts/ignition/data/seedAgentUris.ts`
 * `STARDORM_CATALOG_AGENT_KEYS_ORDERED` (explicit array, not object key order).
 */
export const STARDORM_CATALOG_AGENT_KEYS_ORDERED = [
  "beam-default",
  "ledger",
  "fiscus",
  "scribe",
  "yieldr",
  "audita",
  "settler",
  "quanta",
  "ramp",
  "passport",
  "capita",
] as const;

/**
 * Resolve catalog / chat `agentKey` values to ERC-8004 registry `agentId`.
 * Supports numeric strings, catalog slugs (`capita`, `ledger`, …), `beam-default`, and `chain-{id}`.
 */
export function resolveStardormChainAgentId(agentKey: string): number | null {
  const trimmed = agentKey.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (/^beam-default$/i.test(trimmed)) return 1;
  const m = /^chain-(\d+)$/i.exec(trimmed);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const slug = trimmed.toLowerCase();
  const idx = (
    STARDORM_CATALOG_AGENT_KEYS_ORDERED as readonly string[]
  ).indexOf(slug);
  if (idx >= 0) return idx + 1;
  return null;
}

/** Reverse of `resolveStardormChainAgentId`: registry id → catalog slug when known. */
export function resolveStardormAgentKey(
  chainAgentId: number | bigint | string,
): string | null {
  const n =
    typeof chainAgentId === "string"
      ? Number.parseInt(chainAgentId, 10)
      : Number(chainAgentId);
  if (!Number.isFinite(n) || n <= 0) return null;
  const idx = n - 1;
  if (
    idx >= 0 &&
    idx < STARDORM_CATALOG_AGENT_KEYS_ORDERED.length &&
    STARDORM_CATALOG_AGENT_KEYS_ORDERED[idx]
  ) {
    return STARDORM_CATALOG_AGENT_KEYS_ORDERED[idx];
  }
  return `chain-${n}`;
}
