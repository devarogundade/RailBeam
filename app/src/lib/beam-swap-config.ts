import type { X402SupportedAsset } from "@railbeam/stardorm-api-contract";
import { BEAM_CHAIN_IDS } from "@/lib/beam-chain-config";

/** Uniswap V3-style swap router on 0G mainnet. */
export const BEAM_MAINNET_SWAP_ROUTER =
  "0x8b598a7c136215a95ba0282b4d832b9f9801f2e2" as const;

export const BEAM_MAINNET_CAIP2 = `eip155:${BEAM_CHAIN_IDS.mainnet}` as const;

export const BEAM_TESTNET_CAIP2 = `eip155:${BEAM_CHAIN_IDS.testnet}` as const;

export const BEAM_MAINNET_USDC_E =
  "0x1f3aa82227281ca364bfb3d253b0f1af1da6473e" as const;

function parseAddr(raw: string | undefined): `0x${string}` | undefined {
  const s = raw?.trim() ?? "";
  if (!s.startsWith("0x") || s.length < 42) return undefined;
  return s.toLowerCase() as `0x${string}`;
}

export function beamMainnetWrappedNativeAddress(): `0x${string}` | undefined {
  return parseAddr(import.meta.env.VITE_BEAM_WETH_ADDRESS_MAINNET);
}

export function beamMainnetSwapSupportedAssets(): X402SupportedAsset[] {
  const assets: X402SupportedAsset[] = [
    {
      name: "Bridged USDC",
      symbol: "USDC.e",
      icon: "/images/usdc.png",
      decimals: 6,
      address: BEAM_MAINNET_USDC_E,
    },
  ];
  const wNative = beamMainnetWrappedNativeAddress();
  if (wNative) {
    assets.unshift({
      name: "Wrapped 0G",
      symbol: "W0G",
      icon: "/images/0g.png",
      decimals: 18,
      address: wNative,
    });
  }
  return assets;
}

export function beamMainnetSwapNetworks(): Array<{ id: string; label: string }> {
  return [{ id: BEAM_MAINNET_CAIP2, label: "0G Mainnet" }];
}

export function isSwapNetworkBlocked(network: string): string | null {
  const n = network.trim();
  if (n === BEAM_TESTNET_CAIP2) {
    return "Swaps on 0G testnet are disabled. Use 0G mainnet (eip155:16661).";
  }
  if (n !== BEAM_MAINNET_CAIP2) {
    return `Swaps are only supported on ${BEAM_MAINNET_CAIP2}.`;
  }
  return null;
}
