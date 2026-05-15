import type { X402SupportedAsset } from "@railbeam/stardorm-api-contract";
import { BEAM_CAIP2, BEAM_TOKENS } from "@/lib/beam-chain-config";

export const X402_CHECKOUT_NETWORKS = [
  { id: BEAM_CAIP2.mainnet, label: "0G Mainnet" },
] as const;

/** USDC.e only — x402 exact scheme on 0G mainnet. */
export function x402CheckoutSupportedAssets(): X402SupportedAsset[] {
  const usdc = BEAM_TOKENS.mainnet.find((t) =>
    t.symbol.toUpperCase().includes("USDC"),
  );
  if (!usdc) {
    return [];
  }
  return [
    {
      name: usdc.name ?? "Bridged USDC",
      symbol: usdc.symbol,
      icon: "/images/usdc.png",
      decimals: usdc.decimals,
      address: usdc.address.toLowerCase(),
    },
  ];
}
