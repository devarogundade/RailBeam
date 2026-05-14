/**
 * Resolve catalog / chat `agentKey` values to ERC-8004 registry `agentId`.
 * Supports numeric strings, `beam-default` (token 1), and `chain-{id}`.
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
  return null;
}

/** Reverse of `resolveStardormChainAgentId`: registry id → canonical catalog id. */
export function resolveStardormAgentKey(
  chainAgentId: number | bigint | string,
): string | null {
  const n =
    typeof chainAgentId === "string"
      ? Number.parseInt(chainAgentId, 10)
      : Number(chainAgentId);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n === 1) return "beam-default";
  return `chain-${n}`;
}
