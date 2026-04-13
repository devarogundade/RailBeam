import type { Hex } from "viem";

function envAddress(key: string, fallback: Hex): Hex {
  const v = import.meta.env[key];
  if (typeof v === "string" && /^0x[a-fA-F0-9]{40}$/.test(v)) {
    return v as Hex;
  }
  return fallback;
}

/** Deploy Beam modules on 0G per https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/deploy-contracts then set env overrides. */
export const HOOK_MANAGER_ADDRESS = envAddress(
  "VITE_HOOK_MANAGER_ADDRESS",
  "0x6bAaEdD503FcdF573E28a4a9Ea7d9CeF8C901e67"
);

export const MERCHANT_MODULE_ADDRESS = envAddress(
  "VITE_MERCHANT_MODULE_ADDRESS",
  "0xc4Bf9Fe6A0E9104b03f290C80fC1C2058529bD6c"
);
