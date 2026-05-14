/**
 * 0G / Beam EVM chain ids (aligned with `app/src/lib/beam-chain-config.ts`).
 * Backend avoids a `viem` dependency — keep literals in sync with the app.
 */
export const BEAM_EVM_CHAIN_IDS = {
  mainnet: 16661,
  testnet: 16602,
} as const;

const LEGACY_TESTNET_IDS = new Set<number>([16601]);

export type BeamEvmTier = 'mainnet' | 'testnet';

export function beamEvmTierFromChainId(
  chainId: number | undefined,
): BeamEvmTier | undefined {
  if (chainId == null) return undefined;
  if (chainId === BEAM_EVM_CHAIN_IDS.mainnet) return 'mainnet';
  if (chainId === BEAM_EVM_CHAIN_IDS.testnet || LEGACY_TESTNET_IDS.has(chainId)) {
    return 'testnet';
  }
  return undefined;
}

export function parseClientEvmChainIdHeader(
  raw: string | string[] | undefined,
): number | undefined {
  if (raw == null) return undefined;
  const one = Array.isArray(raw) ? raw[0] : raw;
  if (typeof one !== 'string' || !one.trim()) return undefined;
  const n = Number.parseInt(one.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return beamEvmTierFromChainId(n) != null ? n : undefined;
}
