import type { ConfigService } from '@nestjs/config';

export type OgEvmNetwork = 'mainnet' | 'testnet';

/** Default JSON-RPC endpoints for 0G (override with `OG_RPC_URL` or per-tier env vars). */
export const OG_RPC = {
  mainnet:
    process.env.OG_RPC_URL_MAINNET?.trim() || 'https://evmrpc.0g.ai',
  testnet:
    process.env.OG_RPC_URL_TESTNET?.trim() || 'https://evmrpc-testnet.0g.ai',
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
};

export const OG_TOKENS: { mainnet: OgTokenConfig[]; testnet: OgTokenConfig[] } = {
  mainnet: [],
  testnet: [],
};

function parseOgNetwork(raw: string | undefined): OgEvmNetwork {
  const n = raw?.trim().toLowerCase();
  if (n === 'testnet') return 'testnet';
  return 'mainnet';
}

/** Single RPC override, else tier from `OG_EVM_NETWORK` (default mainnet). */
export function activeOgRpcUrl(config: ConfigService): string {
  const override = config.get<string>('OG_RPC_URL')?.trim();
  if (override) return override;
  const tier = parseOgNetwork(config.get<string>('OG_EVM_NETWORK'));
  return tier === 'testnet' ? OG_RPC.testnet : OG_RPC.mainnet;
}
