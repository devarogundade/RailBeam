import type { X402SupportedAsset } from '@beam/stardorm-api-contract';
import { BEAM_EVM_CHAIN_IDS } from './beam-evm-chain';

/** Uniswap V3-style swap router on 0G mainnet. */
export const BEAM_MAINNET_SWAP_ROUTER =
  '0x8b598a7c136215a95ba0282b4d832b9f9801f2e2' as const;

export const BEAM_MAINNET_CAIP2 = `eip155:${BEAM_EVM_CHAIN_IDS.mainnet}` as const;

export const BEAM_TESTNET_CAIP2 = `eip155:${BEAM_EVM_CHAIN_IDS.testnet}` as const;

/** Canonical bridged USDC on 0G mainnet. */
export const BEAM_MAINNET_USDC_E =
  '0x1f3aa82227281ca364bfb3d253b0f1af1da6473e' as const;

/**
 * Wrapped native 0G for router `tokenIn` / `tokenOut` (set via env if deployment differs).
 * Uniswap-style deployments often use 0x4200…0006 on OP-stack chains.
 */
export function beamMainnetWrappedNativeAddress(): `0x${string}` | undefined {
  const raw = process.env.BEAM_WETH_ADDRESS_MAINNET?.trim();
  if (!raw?.startsWith('0x') || raw.length < 42) return undefined;
  return raw.toLowerCase() as `0x${string}`;
}

export function beamMainnetSwapSupportedAssets(): X402SupportedAsset[] {
  const assets: X402SupportedAsset[] = [
    {
      name: 'Bridged USDC',
      symbol: 'USDC.e',
      icon: '/images/usdc.png',
      decimals: 6,
      address: BEAM_MAINNET_USDC_E,
    },
  ];
  const wNative = beamMainnetWrappedNativeAddress();
  if (wNative) {
    assets.unshift({
      name: 'Wrapped 0G',
      symbol: 'W0G',
      icon: '/images/0g.png',
      decimals: 18,
      address: wNative,
    });
  }
  return assets;
}

export function beamMainnetSwapNetworks(): Array<{ id: string; label: string }> {
  return [{ id: BEAM_MAINNET_CAIP2, label: '0G Mainnet' }];
}

export function defaultBeamSwapFormPayload() {
  return {
    supportedAssets: beamMainnetSwapSupportedAssets(),
    networks: beamMainnetSwapNetworks(),
    defaultPoolFee: 3000 as const,
  };
}

/** Reject testnet swap targets while the connected wallet is on mainnet. */
export function assertSwapNetworkAllowed(args: {
  network: string;
  clientEvmChainId?: number;
}): void {
  const net = args.network.trim();
  if (net === BEAM_TESTNET_CAIP2) {
    throw new Error(
      'Token swaps on 0G testnet are disabled. Switch your wallet to 0G mainnet or ask for a mainnet swap (`eip155:16661`).',
    );
  }
  if (net !== BEAM_MAINNET_CAIP2) {
    throw new Error(
      `Unsupported swap network ${net}. Swaps are available on ${BEAM_MAINNET_CAIP2} only.`,
    );
  }
}
