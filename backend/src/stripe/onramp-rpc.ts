import type { ConfigService } from '@nestjs/config';
import { OG_RPC } from '../og/beam-og.config';

const MAINNET_IDS = new Set([16661]);
const TESTNET_IDS = new Set([16602]);

export function chainIdFromCaip2(caip2: string): number | null {
  const m = /^eip155:(\d+)$/i.exec(caip2.trim());
  if (!m) return null;
  const id = Number.parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}

export function rpcUrlForCaip2(caip2: string, config: ConfigService): string {
  const id = chainIdFromCaip2(caip2);
  if (id != null && MAINNET_IDS.has(id)) {
    return (
      config.get<string>('ONRAMP_RPC_URL_MAINNET')?.trim() || OG_RPC.mainnet
    );
  }
  if (id != null && TESTNET_IDS.has(id)) {
    return (
      config.get<string>('ONRAMP_RPC_URL_TESTNET')?.trim() || OG_RPC.testnet
    );
  }
  return config.get<string>('ONRAMP_RPC_URL_TESTNET')?.trim() || OG_RPC.testnet;
}
