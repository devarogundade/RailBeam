import { BadRequestException } from '@nestjs/common';
import type { X402SupportedAsset } from '@beam/stardorm-api-contract';

/** Canonical bridged USDC on 0G mainnet (6 decimals). */
export const BEAM_USDC_E_ADDRESS =
  '0x1f3aa82227281ca364bfb3d253b0f1af1da6473e' as const;

export const BEAM_USDC_E_DECIMALS = 6;

/** EIP-712 domain for x402 `exact` / EIP-3009 signing (from on-chain `name()` / `version()`). */
export const BEAM_USDC_E_EIP712_NAME = 'Bridged USDC' as const;
export const BEAM_USDC_E_EIP712_VERSION = '2' as const;

/** x402 `PaymentRequirements.extra` for USDC.e (required by `@x402/evm` payload creation). */
export function beamUsdcEX402PaymentExtra(): {
  name: typeof BEAM_USDC_E_EIP712_NAME;
  version: typeof BEAM_USDC_E_EIP712_VERSION;
} {
  return {
    name: BEAM_USDC_E_EIP712_NAME,
    version: BEAM_USDC_E_EIP712_VERSION,
  };
}

/** App-hosted token icon (served from `app/public/images/usdc.png`). */
export const BEAM_USDC_E_ICON = '/images/usdc.png' as const;

export function beamUsdcESupportedAsset(): X402SupportedAsset {
  return {
    name: 'Bridged USDC',
    symbol: 'USDC.e',
    icon: BEAM_USDC_E_ICON,
    decimals: BEAM_USDC_E_DECIMALS,
    address: BEAM_USDC_E_ADDRESS,
  };
}

const USDC_E_LOWER = BEAM_USDC_E_ADDRESS.toLowerCase();

export function isBeamUsdcEAsset(asset: string): boolean {
  const a = asset.trim().toLowerCase();
  if (a === USDC_E_LOWER) return true;
  if (a === 'usdc.e' || a === 'usdc') return true;
  return false;
}

export function normalizeBeamUsdcEAsset(asset: string): string {
  if (isBeamUsdcEAsset(asset)) return USDC_E_LOWER;
  return asset.trim().toLowerCase();
}

export function assertBeamUsdcEAsset(asset: string): void {
  if (!isBeamUsdcEAsset(asset)) {
    throw new BadRequestException(
      'x402 payments only support USDC.e on 0G mainnet (0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E).',
    );
  }
}

/** 1 USD cent = 10_000 USDC.e base units (6 decimals). */
export function usdcBaseUnitsFromUsdCents(amountCents: number): string {
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new BadRequestException('amountCents must be a positive integer');
  }
  return (BigInt(amountCents) * 10_000n).toString();
}
