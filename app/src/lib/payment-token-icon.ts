import { BEAM_TOKENS } from "@/lib/beam-chain-config";
import { beamMainnetSwapSupportedAssets } from "@/lib/beam-swap-config";
import { isBeamUsdcEAddress } from "@/lib/x402-checkout";
import { x402CheckoutSupportedAssets } from "@/lib/x402-checkout-config";

const NATIVE_TOKEN_ICON = "/images/0g.png";
const USDC_TOKEN_ICON = "/images/usdc.png";

function isNativeAsset(asset: string): boolean {
  const a = asset.trim().toLowerCase();
  return (
    a === "native" ||
    a === "a0gi" ||
    a === "eth" ||
    a === `0x${"0".repeat(40)}`
  );
}

let iconByKey: Map<string, string> | null = null;

function iconLookup(): Map<string, string> {
  if (iconByKey) return iconByKey;
  const map = new Map<string, string>();
  const register = (key: string, icon: string) => {
    const k = key.trim().toLowerCase();
    if (k) map.set(k, icon);
  };

  for (const asset of [...beamMainnetSwapSupportedAssets(), ...x402CheckoutSupportedAssets()]) {
    register(asset.address, asset.icon);
    register(asset.symbol, asset.icon);
  }
  for (const tier of [BEAM_TOKENS.mainnet, BEAM_TOKENS.testnet]) {
    for (const token of tier) {
      register(token.address, USDC_TOKEN_ICON);
      register(token.symbol, USDC_TOKEN_ICON);
    }
  }
  register("usdc", USDC_TOKEN_ICON);
  register("usdc.e", USDC_TOKEN_ICON);

  iconByKey = map;
  return map;
}

/** Icon URL for a checkout payment asset (native, symbol, or contract address). */
export function resolvePaymentTokenIcon(asset: string): string | null {
  const trimmed = asset.trim();
  if (!trimmed) return null;
  if (isNativeAsset(trimmed)) return NATIVE_TOKEN_ICON;
  if (isBeamUsdcEAddress(trimmed)) return USDC_TOKEN_ICON;
  return iconLookup().get(trimmed.toLowerCase()) ?? null;
}

/** Human-readable symbol when the asset is a known Beam token. */
export function resolvePaymentTokenSymbol(asset: string): string | undefined {
  const trimmed = asset.trim();
  if (!trimmed) return undefined;
  if (isNativeAsset(trimmed)) return "0G";
  if (isBeamUsdcEAddress(trimmed)) return "USDC.e";
  const lower = trimmed.toLowerCase();
  for (const tier of [BEAM_TOKENS.mainnet, BEAM_TOKENS.testnet]) {
    for (const token of tier) {
      if (token.address.toLowerCase() === lower || token.symbol.toLowerCase() === lower) {
        return token.symbol;
      }
    }
  }
  for (const token of beamMainnetSwapSupportedAssets()) {
    if (token.address.toLowerCase() === lower || token.symbol.toLowerCase() === lower) {
      return token.symbol;
    }
  }
  return undefined;
}
