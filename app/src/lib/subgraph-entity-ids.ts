/**
 * Matches `agentIdToBytes` in the subgraph mapping (big-endian minimal bytes).
 * Used for `agent(id:)` lookups.
 */
export function agentGraphEntityIdFromChainAgentId(agentId: bigint): string {
  if (agentId < 0n) {
    throw new Error("agentId must be non-negative");
  }
  if (agentId === 0n) {
    return "0x00";
  }
  let hex = agentId.toString(16);
  if (hex.length % 2 === 1) {
    hex = `0${hex}`;
  }
  return `0x${hex.toLowerCase()}`;
}
