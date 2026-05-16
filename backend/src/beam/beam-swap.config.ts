import type { X402SupportedAsset } from '@beam/stardorm-api-contract';
import { BEAM_EVM_CHAIN_IDS } from './beam-evm-chain';
import { BEAM_USDC_E_ADDRESS, beamUsdcESupportedAsset } from './beam-usdc-e.config';

/** Uniswap V3-style swap router on 0G mainnet. */
export const BEAM_MAINNET_SWAP_ROUTER =
  '0x8b598a7c136215a95ba0282b4d832b9f9801f2e2' as const;

export const BEAM_MAINNET_CAIP2 = `eip155:${BEAM_EVM_CHAIN_IDS.mainnet}` as const;

export const BEAM_TESTNET_CAIP2 = `eip155:${BEAM_EVM_CHAIN_IDS.testnet}` as const;

/** Canonical bridged USDC on 0G mainnet. */
export const BEAM_MAINNET_USDC_E = BEAM_USDC_E_ADDRESS;

/** Wrapped native 0G on 0G mainnet (18 decimals). */
export const BEAM_MAINNET_W0G_ADDRESS =
  '0x1cd0690ff9a693f5ef2dd976660a8dafc81a109c' as const;

/** PandaAI (PAI) on 0G mainnet (18 decimals). */
export const BEAM_MAINNET_PAI_ADDRESS =
  '0x59ef6f3943bbdfef2fb19565037ac85071223e94c' as const;

/**
 * Wrapped native 0G for router `tokenIn` / `tokenOut`.
 * Override with `BEAM_WETH_ADDRESS_MAINNET` when the deployment address differs.
 */
export function beamMainnetWrappedNativeAddress(): `0x${string}` {
  const raw = process.env.BEAM_WETH_ADDRESS_MAINNET?.trim();
  if (raw?.startsWith('0x') && raw.length >= 42) {
    return raw.toLowerCase() as `0x${string}`;
  }
  return BEAM_MAINNET_W0G_ADDRESS;
}

function beamMainnetW0gSupportedAsset(): X402SupportedAsset {
  return {
    name: 'Wrapped 0G',
    symbol: 'W0G',
    icon: '/images/0g.png',
    decimals: 18,
    address: beamMainnetWrappedNativeAddress(),
  };
}

function beamMainnetPaiSupportedAsset(): X402SupportedAsset {
  return {
    name: 'PandaAI',
    symbol: 'PAI',
    icon: '/images/pai.png',
    decimals: 18,
    address: BEAM_MAINNET_PAI_ADDRESS,
  };
}

/** W0G, USDC.e, and PAI on 0G mainnet — shared by swap and ERC-20 transfer flows. */
export function beamMainnetErc20SupportedAssets(): X402SupportedAsset[] {
  return [
    beamMainnetW0gSupportedAsset(),
    beamUsdcESupportedAsset(),
    beamMainnetPaiSupportedAsset(),
  ];
}

export function beamMainnetSwapSupportedAssets(): X402SupportedAsset[] {
  return beamMainnetErc20SupportedAssets();
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
