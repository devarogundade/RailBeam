import { beamNetworkFromChainId } from "@/lib/beam-chain-config";

/** Env helpers shared by subgraph GraphQL client and UI. */

/** Resolves the indexer URL for a chain id from per-network env vars only. */
export function getStardormSubgraphUrlForChain(chainId: number | undefined): string | undefined {
  const main = import.meta.env.VITE_STARDORM_SUBGRAPH_URL_MAINNET?.trim();
  const test = import.meta.env.VITE_STARDORM_SUBGRAPH_URL_TESTNET?.trim();
  const tier = beamNetworkFromChainId(chainId) ?? "testnet";
  if (tier === "mainnet") return main || undefined;
  return test || undefined;
}

export function getStardormPaymentTokenDecimals(): number {
  const raw = import.meta.env.VITE_STARDORM_PAYMENT_TOKEN_DECIMALS?.trim();
  if (!raw) return 18;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 80) return 18;
  return n;
}
