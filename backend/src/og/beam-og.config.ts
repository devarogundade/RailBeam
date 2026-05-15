import type { ConfigService } from '@nestjs/config';
import {
  beamEvmTierFromChainId,
  type BeamEvmTier,
} from '../beam/beam-evm-chain';
import {
  BEAM_USDC_E_ADDRESS,
  BEAM_USDC_E_DECIMALS,
  BEAM_USDC_E_ICON,
} from '../beam/beam-usdc-e.config';

/** Default JSON-RPC endpoints for 0G (override with `OG_RPC_URL_MAINNET` / `OG_RPC_URL_TESTNET`). */
export const OG_RPC = {
  mainnet: process.env.OG_RPC_URL_MAINNET?.trim() || 'https://evmrpc.0g.ai',
  testnet:
    process.env.OG_RPC_URL_TESTNET?.trim() || 'https://evmrpc-testnet.0g.ai',
} as const;

/** Default 0G Storage turbo indexer URLs (see 0G network overview docs). */
export const OG_STORAGE_INDEXER = {
  mainnet: 'https://indexer-storage-turbo.0g.ai',
  testnet: 'https://indexer-storage-testnet-turbo.0g.ai',
} as const;

export type OgStorageEndpoints = {
  tier: BeamEvmTier | undefined;
  rpcUrl: string;
  indexerRpc: string;
};

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
  address: BEAM_USDC_E_ADDRESS,
  symbol: 'USDC.e',
  decimals: BEAM_USDC_E_DECIMALS,
  name: 'Bridged USDC',
  image: BEAM_USDC_E_ICON,
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

export function ogRpcUrlForTier(
  config: ConfigService,
  tier: BeamEvmTier | undefined,
): string {
  if (tier === 'testnet') {
    return config.get<string>('OG_RPC_URL_TESTNET')?.trim() || OG_RPC.testnet;
  }
  if (tier === 'mainnet') {
    return config.get<string>('OG_RPC_URL_MAINNET')?.trim() || OG_RPC.mainnet;
  }
  return activeOgRpcUrl(config);
}

/**
 * Storage indexer HTTP endpoint for the client’s 0G EVM tier (`X-Beam-Chain-Id`).
 * RPC and indexer must target the same network or uploads fail on `market()`.
 */
export function ogStorageIndexerRpcForTier(
  config: ConfigService,
  tier: BeamEvmTier | undefined,
): string {
  const legacy = config.get<string>('OG_STORAGE_INDEXER_RPC')?.trim();
  const mainnet = config.get<string>('OG_STORAGE_INDEXER_RPC_MAINNET')?.trim();
  const testnet = config.get<string>('OG_STORAGE_INDEXER_RPC_TESTNET')?.trim();
  if (tier === 'mainnet') {
    return mainnet || legacy || OG_STORAGE_INDEXER.mainnet;
  }
  if (tier === 'testnet') {
    return testnet || legacy || OG_STORAGE_INDEXER.testnet;
  }
  return mainnet || legacy || testnet || OG_STORAGE_INDEXER.mainnet;
}

export function ogStorageEndpointsForClientEvmChain(
  _: ConfigService,
  __?: number,
): OgStorageEndpoints {
  // const tier = beamEvmTierFromChainId(clientEvmChainId);
  // return {
  //   tier,
  //   rpcUrl: ogRpcUrlForTier(config, tier),
  //   indexerRpc: ogStorageIndexerRpcForTier(config, tier),
  // };

  // TODO: remove this once we have a proper way to determine the tier
  return {
    tier: 'testnet',
    rpcUrl: OG_RPC.testnet,
    indexerRpc: OG_STORAGE_INDEXER.testnet,
  };
}

/**
 * Base URL for Chainscan account APIs (`txlist`, `tokentx`).
 * `CHAINSCAN_API_URL` wins if set; otherwise first of mainnet / testnet env that is set.
 */
export function activeChainscanApiUrl(
  config: ConfigService,
): string | undefined {
  const single = config.get<string>('CHAINSCAN_API_URL')?.trim();
  if (single) return single;
  const mainnet = config.get<string>('CHAINSCAN_API_URL_MAINNET')?.trim();
  if (mainnet) return mainnet;
  const testnet = config.get<string>('CHAINSCAN_API_URL_TESTNET')?.trim();
  if (testnet) return testnet;
  return undefined;
}

function chainscanApiUrlForTier(
  config: ConfigService,
  tier: BeamEvmTier,
): string | undefined {
  const single = config.get<string>('CHAINSCAN_API_URL')?.trim();
  const mainnet = config.get<string>('CHAINSCAN_API_URL_MAINNET')?.trim();
  const testnet = config.get<string>('CHAINSCAN_API_URL_TESTNET')?.trim();
  if (tier === 'mainnet') {
    return mainnet || single || undefined;
  }
  return testnet || single || undefined;
}

/**
 * Chainscan API base for account modules (`txlist`, `tokentx`).
 * When the client sends `X-Beam-Chain-Id`, use the matching tier; otherwise
 * {@link activeChainscanApiUrl}.
 */
export function chainscanApiUrlForClientEvmChain(
  config: ConfigService,
  clientEvmChainId?: number,
): string | undefined {
  const tier = beamEvmTierFromChainId(clientEvmChainId);
  if (tier) return chainscanApiUrlForTier(config, tier);
  return activeChainscanApiUrl(config);
}
