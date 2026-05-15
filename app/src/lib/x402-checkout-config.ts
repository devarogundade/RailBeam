import type { X402SupportedAsset } from "@railbeam/stardorm-api-contract";
import { BEAM_CAIP2 } from "@/lib/beam-chain-config";
import { isBeamUsdcEAddress } from "@/lib/x402-checkout";

export const X402_CHECKOUT_NETWORKS = [
  { id: BEAM_CAIP2.mainnet, label: "0G Mainnet" },
] as const;

const USDC_E_CHECKOUT_ASSET: X402SupportedAsset = {
  name: "Bridged USDC",
  symbol: "USDC.e",
  icon: "/images/usdc.png",
  decimals: 6,
  address: "0x1f3aa82227281ca364bfb3d253b0f1af1da6473e",
  usdValue: 1,
};

/** USDC.e only — x402 exact scheme on 0G mainnet. */
export function x402CheckoutSupportedAssets(): X402SupportedAsset[] {
  return [USDC_E_CHECKOUT_ASSET];
}

/** Keep only canonical USDC.e rows (e.g. from chat rich blocks). */
export function filterX402CheckoutSupportedAssets(
  assets: X402SupportedAsset[],
): X402SupportedAsset[] {
  const usdc = assets.filter((a) => isBeamUsdcEAddress(a.address));
  return usdc.length > 0 ? [USDC_E_CHECKOUT_ASSET] : x402CheckoutSupportedAssets();
}
