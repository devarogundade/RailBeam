import type { X402SupportedAsset } from '@beam/stardorm-api-contract';
import { BEAM_EVM_CHAIN_IDS } from './beam-evm-chain';
import { beamMainnetErc20SupportedAssets } from './beam-swap.config';
import {
  BEAM_USDC_E_ADDRESS,
  BEAM_USDC_E_DECIMALS,
  beamUsdcESupportedAsset,
  isBeamUsdcEAsset,
} from './beam-usdc-e.config';

export const BEAM_MAINNET_CAIP2 = `eip155:${BEAM_EVM_CHAIN_IDS.mainnet}` as const;
export const BEAM_TESTNET_CAIP2 = `eip155:${BEAM_EVM_CHAIN_IDS.testnet}` as const;

export function beamMainnetTransferNetworks(): Array<{ id: string; label: string }> {
  return [
    { id: BEAM_MAINNET_CAIP2, label: '0G Mainnet' },
    { id: BEAM_TESTNET_CAIP2, label: '0G Testnet' },
  ];
}

export function beamTransferSupportedAssets(): X402SupportedAsset[] {
  return beamMainnetErc20SupportedAssets();
}

export function defaultBeamTransferFormPayload() {
  return {
    supportedAssets: beamTransferSupportedAssets(),
    networks: beamMainnetTransferNetworks(),
  };
}

/** Map user-facing network words to CAIP-2 (never guess chain id). */
export function resolveBeamCaip2Network(input: string | undefined): string | undefined {
  if (!input?.trim()) return undefined;
  const t = input.trim().toLowerCase();
  if (t === BEAM_MAINNET_CAIP2 || t === String(BEAM_EVM_CHAIN_IDS.mainnet)) {
    return BEAM_MAINNET_CAIP2;
  }
  if (t === BEAM_TESTNET_CAIP2 || t === String(BEAM_EVM_CHAIN_IDS.testnet)) {
    return BEAM_TESTNET_CAIP2;
  }
  if (/\bmain\s*net\b/.test(t) || t === 'mainnet' || t === '0g mainnet') {
    return BEAM_MAINNET_CAIP2;
  }
  if (/\btest\s*net\b/.test(t) || t === 'testnet' || t === '0g testnet') {
    return BEAM_TESTNET_CAIP2;
  }
  if (/^eip155:\d+$/.test(t)) return t;
  return undefined;
}

function erc20FieldsFromAsset(
  asset: X402SupportedAsset,
): { token: string; tokenDecimals: number; tokenSymbol: string } {
  return {
    token: asset.address.toLowerCase(),
    tokenDecimals: asset.decimals,
    tokenSymbol: asset.symbol,
  };
}

function findBeamErc20Asset(tokenOrSymbol: string): X402SupportedAsset | undefined {
  const raw = tokenOrSymbol.trim();
  const lower = raw.toLowerCase();
  const assets = beamMainnetErc20SupportedAssets();
  const byAddress = assets.find((a) => a.address.toLowerCase() === lower);
  if (byAddress) return byAddress;
  const bySymbol = assets.find((a) => a.symbol.toLowerCase() === lower);
  if (bySymbol) return bySymbol;
  if (isBeamUsdcEAsset(raw)) return beamUsdcESupportedAsset();
  if (['w0g', 'wrapped 0g', 'wrapped0g'].includes(lower)) {
    return assets.find((a) => a.symbol === 'W0G');
  }
  if (['pai', 'pandaai', 'panda ai'].includes(lower)) {
    return assets.find((a) => a.symbol === 'PAI');
  }
  return undefined;
}

export function resolveBeamErc20TokenFields(
  tokenOrSymbol: string | undefined,
): { token: string; tokenDecimals: number; tokenSymbol: string } | undefined {
  if (!tokenOrSymbol?.trim()) return undefined;
  const raw = tokenOrSymbol.trim();
  const known = findBeamErc20Asset(raw);
  if (known) return erc20FieldsFromAsset(known);
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return {
      token: raw.toLowerCase(),
      tokenDecimals: BEAM_USDC_E_DECIMALS,
      tokenSymbol: 'ERC-20',
    };
  }
  return undefined;
}

/** Canonical JSON snippet for agent system prompts (tools + JSON contract). */
/** Normalize OpenAI `draft_erc20_transfer` tool args before schema validation. */
export function normalizeErc20TransferToolArgs(
  rec: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...rec };
  const net = resolveBeamCaip2Network(
    typeof out.network === 'string' ? out.network : undefined,
  );
  if (net) out.network = net;

  const tokenRaw =
    (typeof out.token === 'string' && out.token) ||
    (typeof out.tokenSymbol === 'string' && out.tokenSymbol) ||
    (typeof out.currency === 'string' && out.currency) ||
    undefined;
  const resolved = resolveBeamErc20TokenFields(tokenRaw);
  if (resolved) {
    out.token = resolved.token;
    if (out.tokenDecimals == null) out.tokenDecimals = resolved.tokenDecimals;
    if (out.tokenSymbol == null) out.tokenSymbol = resolved.tokenSymbol;
  }

  if (typeof out.to === 'string') {
    out.to = out.to.trim().toLowerCase();
  }
  if (typeof out.token === 'string' && /^0x[a-fA-F0-9]{40}$/.test(out.token.trim())) {
    out.token = out.token.trim().toLowerCase();
  }
  return out;
}

export function beamKnownAssetsPromptBlock(): string {
  const assets = beamTransferSupportedAssets();
  const nets = beamMainnetTransferNetworks();
  return [
    'Beam known ERC-20 assets (use these exact contract addresses — never ask the user for USDC.e / W0G / PAI on 0G):',
    JSON.stringify({ networks: nets, supportedAssets: assets }, null, 0),
    `ERC-20 transfers: W0G, USDC.e (${BEAM_USDC_E_ADDRESS}, ${BEAM_USDC_E_DECIMALS} decimals), and PAI on 0G mainnet — see supportedAssets.`,
    `Networks: mainnet → ${BEAM_MAINNET_CAIP2}; testnet → ${BEAM_TESTNET_CAIP2}.`,
    'x402 payment links (`create_x402_payment` / `offer_x402_checkout_form`): USDC.e on 0G mainnet only — never offer other tokens or testnet for x402 checkout.',
  ].join('\n');
}
