import { beamNetworkFromChainId } from "@/lib/beam-chain-config";

/** Env helpers shared by subgraph GraphQL client and UI. */

export function getStardormSubgraphUrl(): string | undefined {
  const u = import.meta.env.VITE_STARDORM_SUBGRAPH_URL?.trim();
  const main = import.meta.env.VITE_STARDORM_SUBGRAPH_URL_MAINNET?.trim();
  const test = import.meta.env.VITE_STARDORM_SUBGRAPH_URL_TESTNET?.trim();
  return u || main || test || undefined;
}

/** Resolves the indexer URL for a chain id; falls back to `VITE_STARDORM_SUBGRAPH_URL` when per-network URLs are unset. */
export function getStardormSubgraphUrlForChain(chainId: number | undefined): string | undefined {
  const legacy = import.meta.env.VITE_STARDORM_SUBGRAPH_URL?.trim();
  const main = import.meta.env.VITE_STARDORM_SUBGRAPH_URL_MAINNET?.trim();
  const test = import.meta.env.VITE_STARDORM_SUBGRAPH_URL_TESTNET?.trim();
  const tier = beamNetworkFromChainId(chainId) ?? "testnet";
  if (tier === "mainnet") return main || legacy || undefined;
  return test || legacy || undefined;
}

export function getStardormPaymentTokenDecimals(): number {
  const raw = import.meta.env.VITE_STARDORM_PAYMENT_TOKEN_DECIMALS?.trim();
  if (!raw) return 18;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 80) return 18;
  return n;
}
