import type { X402SupportedAsset } from "@railbeam/stardorm-api-contract";
import { BEAM_CAIP2, BEAM_TOKENS } from "@/lib/beam-chain-config";
import { beamMainnetWrappedNativeAddress } from "@/lib/beam-swap-config";

export const X402_CHECKOUT_NETWORKS = [
  { id: BEAM_CAIP2.mainnet, label: "0G Mainnet" },
  { id: BEAM_CAIP2.testnet, label: "0G Galileo testnet" },
] as const;

/** Selectable assets for manual x402 checkout (dashboard + forms). */
export function x402CheckoutSupportedAssets(): X402SupportedAsset[] {
  const assets: X402SupportedAsset[] = [
    {
      name: "0G",
      symbol: "0G",
      icon: "/images/0g.png",
      decimals: 18,
      address: "native",
    },
  ];

  for (const t of BEAM_TOKENS.mainnet) {
    assets.push({
      name: t.name ?? t.symbol,
      symbol: t.symbol,
      icon: t.symbol.includes("USDC") ? "/images/usdc.png" : "/images/0g.png",
      decimals: t.decimals,
      address: t.address.toLowerCase(),
    });
  }

  const wNative = beamMainnetWrappedNativeAddress();
  if (wNative && !assets.some((a) => a.address === wNative)) {
    assets.push({
      name: "Wrapped 0G",
      symbol: "W0G",
      icon: "/images/0g.png",
      decimals: 18,
      address: wNative,
    });
  }

  return assets;
}
