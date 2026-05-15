export const BEAM_RPC = {
  mainnet: "https://evmrpc.0g.ai",
  testnet: "https://evmrpc-testnet.0g.ai",
} as const;

export type BeamTokenConfig = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  name?: string;
};

/** Canonical bridged USDC on 0G mainnet (chain id 16661). */
const MAINNET_USDC_E: BeamTokenConfig = {
  address: "0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E",
  symbol: "USDC.e",
  decimals: 6,
  name: "Bridged USDC",
};

export const BEAM_TOKENS: {
  mainnet: BeamTokenConfig[];
  testnet: BeamTokenConfig[];
} = {
  mainnet: [MAINNET_USDC_E],
  testnet: [],
};

export const BEAM_CONTRACT_ADDRESSES: {
  mainnet: Record<string, `0x${string}`>;
  testnet: Record<string, `0x${string}`>;
} = {
  mainnet: {},
  testnet: {},
};

/** 0G EVM chains (must match presets used by the Beam app). */
export const ZERO_G_CHAIN_ID_BY_CAIP: Record<string, number> = {
  "eip155:16661": 16661,
  "eip155:16602": 16602,
};
