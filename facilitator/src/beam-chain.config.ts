import type { Chain } from 'viem';
import { zeroGMainnet, zeroGTestnet } from 'viem/chains';

export const BEAM_RPC = {
  mainnet: 'https://evmrpc.0g.ai',
  testnet: 'https://evmrpc-testnet.0g.ai',
} as const;

export const BEAM_TOKENS: { mainnet: readonly []; testnet: readonly [] } = {
  mainnet: [],
  testnet: [],
};

export const BEAM_CONTRACT_ADDRESSES: {
  mainnet: Record<string, `0x${string}`>;
  testnet: Record<string, `0x${string}`>;
} = {
  mainnet: {},
  testnet: {},
};

export const ZERO_G_CHAIN_BY_CAIP: Record<string, Chain> = {
  'eip155:16661': zeroGMainnet,
  'eip155:16602': zeroGTestnet,
};
