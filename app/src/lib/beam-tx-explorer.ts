import { beamNetworkFromChainId } from "@/lib/beam-chain-config";

/** Parse `eip155:<chainId>` from payment / on-ramp payloads. */
export function chainIdFromPaymentNetwork(network: string): number | undefined {
  const m = /^eip155:(\d+)$/i.exec(network.trim());
  if (!m) return undefined;
  const id = Number.parseInt(m[1]!, 10);
  return Number.isFinite(id) ? id : undefined;
}

export function beamTxExplorerUrl(chainId: number, txHash: string): string | undefined {
  if (!/^0x[a-fA-F0-9]{64}$/i.test(txHash.trim())) return undefined;
  const tier = beamNetworkFromChainId(chainId);
  const h = txHash.trim();
  if (tier === "mainnet") return `https://chainscan.0g.ai/tx/${h}`;
  if (tier === "testnet") return `https://chainscan-testnet.0g.ai/tx/${h}`;
  return undefined;
}
