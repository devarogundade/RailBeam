import type { X402SupportedAsset } from '@beam/stardorm-api-contract';
import { BEAM_MAINNET_CAIP2 } from './beam-transfer.config';
import {
  BEAM_USDC_E_ADDRESS,
  BEAM_USDC_E_DECIMALS,
  beamUsdcESupportedAsset,
  isBeamUsdcEAsset,
} from './beam-usdc-e.config';

/** x402 `exact` checkout on 0G mainnet — USDC.e only. */
export function beamX402CheckoutSupportedAssets(): X402SupportedAsset[] {
  return [beamUsdcESupportedAsset()];
}

export function beamX402CheckoutNetworks(): Array<{ id: string; label: string }> {
  return [{ id: BEAM_MAINNET_CAIP2, label: '0G Mainnet' }];
}

export function defaultBeamX402CheckoutFormPayload() {
  return {
    supportedAssets: beamX402CheckoutSupportedAssets(),
    networks: beamX402CheckoutNetworks(),
  };
}

/** Canonical USDC.e row for x402 checkout forms (ignores model-supplied extras). */
export function normalizeBeamX402CheckoutSupportedAssets(
  _assets?: X402SupportedAsset[],
): X402SupportedAsset[] {
  return beamX402CheckoutSupportedAssets();
}

export function assertBeamX402CheckoutSupportedAssets(
  assets: X402SupportedAsset[],
): void {
  if (
    assets.length !== 1 ||
    !assets.every((a) => isBeamUsdcEAsset(a.address))
  ) {
    throw new Error(
      `x402 payment links only support USDC.e on 0G mainnet (${BEAM_USDC_E_ADDRESS}, ${BEAM_USDC_E_DECIMALS} decimals).`,
    );
  }
}

export function beamX402CheckoutAssetsPromptLine(): string {
  return `x402 payment links: USDC.e only on 0G mainnet (${BEAM_USDC_E_ADDRESS}, network ${BEAM_MAINNET_CAIP2}).`;
}
