import type { ConfigService } from '@nestjs/config';

/** Default JSON-RPC endpoints for 0G (override with `OG_RPC_URL_MAINNET` / `OG_RPC_URL_TESTNET`). */
export const OG_RPC = {
  mainnet: process.env.OG_RPC_URL_MAINNET?.trim() || 'https://evmrpc.0g.ai',
  testnet:
    process.env.OG_RPC_URL_TESTNET?.trim() || 'https://evmrpc-testnet.0g.ai',
} as const;

/** Blockscout-style Chainscan API roots (`.../open/api`); override with env per tier. */
export const CHAINSCAN_API = {
  mainnet:
    process.env.CHAINSCAN_API_URL_MAINNET?.trim() ||
    'https://chainscan.0g.ai/open/api',
  testnet:
    process.env.CHAINSCAN_API_URL_TESTNET?.trim() ||
    'https://chainscan-testnet.0g.ai/open/api',
} as const;

export const OG_CONTRACT_ADDRESSES: {
  mainnet: Record<string, `0x${string}`>;
  testnet: Record<string, `0x${string}`>;
} = {
  mainnet: {},
  testnet: {},
};

export type OgTokenConfig = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  name?: string;
  /** HTTPS URL (or app root-relative path) for token icon in UI / rich payloads. */
  image?: string;
  /** Optional spot USD reference for analytics or checkout hints. */
  usdValue?: number;
};

/** Gas / native coin metadata per OG tier (no contract address). */
export type OgNativeCoinConfig = {
  symbol: string;
  decimals: number;
  name?: string;
  /** HTTPS URL or root-relative path (e.g. `/images/0g-native.png` on the Beam app). */
  image?: string;
  /** Optional spot USD reference for analytics or checkout hints. */
  usdValue?: number;
};

/** Native 0G on each OG EVM tier (same artwork as `app/public/images/0g-native.png`). */
export const OG_NATIVE: {
  mainnet: OgNativeCoinConfig;
  testnet: OgNativeCoinConfig;
} = {
  mainnet: {
    symbol: '0G',
    decimals: 18,
    name: '0G',
    image: '/images/0g.png',
    usdValue: 0.5921,
  },
  testnet: {
    symbol: '0G',
    decimals: 18,
    name: '0G',
    image: '/images/0g.png',
    usdValue: 0.592,
  },
};

/** Canonical bridged USDC on 0G mainnet (chain id 16661). */
const MAINNET_USDC_E: OgTokenConfig = {
  address: '0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E',
  symbol: 'USDC.e',
  decimals: 6,
  name: 'Bridged USDC',
  image:
    'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  usdValue: 1,
};

export const OG_TOKENS: { mainnet: OgTokenConfig[]; testnet: OgTokenConfig[] } =
  {
    mainnet: [MAINNET_USDC_E],
    testnet: [],
  };

/**
 * RPC URL for OG modules that expect a single endpoint: explicit mainnet URL,
 * else explicit testnet URL, else default mainnet (matches previous default tier).
 */
export function activeOgRpcUrl(config: ConfigService): string {
  const mainnet = config.get<string>('OG_RPC_URL_MAINNET')?.trim();
  if (mainnet) return mainnet;
  const testnet = config.get<string>('OG_RPC_URL_TESTNET')?.trim();
  if (testnet) return testnet;
  return OG_RPC.mainnet;
}

/**
 * Base URL for Chainscan account APIs (`txlist`, `tokentx`).
 * `CHAINSCAN_API_URL` wins if set; otherwise same tier resolution as {@link activeOgRpcUrl}.
 */
export function activeChainscanApiUrl(config: ConfigService): string {
  const single = config.get<string>('CHAINSCAN_API_URL')?.trim();
  if (single) return single;
  const mainnet = config.get<string>('CHAINSCAN_API_URL_MAINNET')?.trim();
  if (mainnet) return mainnet;
  const testnet = config.get<string>('CHAINSCAN_API_URL_TESTNET')?.trim();
  if (testnet) return testnet;
  return CHAINSCAN_API.mainnet;
}
