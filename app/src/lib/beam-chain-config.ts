import { zeroGMainnet, zeroGTestnet } from "viem/chains";

/** Logical Beam / 0G deployment tier (not the same as viem's `chain.testnet` flag). */
export type BeamNetworkId = "mainnet" | "testnet";

export const BEAM_NETWORK_IDS: readonly BeamNetworkId[] = ["mainnet", "testnet"];

export const BEAM_CHAIN_IDS = {
  mainnet: zeroGMainnet.id,
  testnet: zeroGTestnet.id,
} as const;

export const BEAM_RPC = {
  mainnet: "https://evmrpc.0g.ai",
  testnet: "https://evmrpc-testnet.0g.ai",
} as const;

/** CAIP-2 ids used by x402 / facilitator. */
export const BEAM_CAIP2 = {
  mainnet: `eip155:${BEAM_CHAIN_IDS.mainnet}` as const,
  testnet: `eip155:${BEAM_CHAIN_IDS.testnet}` as const,
};

export const BEAM_VIEM_CHAINS = [zeroGMainnet, zeroGTestnet] as const;

const LEGACY_TESTNET_IDS = new Set<number>([16_601]);

export function beamNetworkFromChainId(chainId: number | undefined): BeamNetworkId | undefined {
  if (chainId == null) return undefined;
  if (chainId === BEAM_CHAIN_IDS.mainnet) return "mainnet";
  if (chainId === BEAM_CHAIN_IDS.testnet || LEGACY_TESTNET_IDS.has(chainId)) return "testnet";
  return undefined;
}

export function isBeamConfiguredChainId(chainId: number | undefined): boolean {
  return beamNetworkFromChainId(chainId) != null;
}

/** CAIP-2 network id for API payloads (`eip155:<chainId>`). */
export function beamCaip2FromChainId(chainId: number): string {
  const tier = beamNetworkFromChainId(chainId);
  if (tier === "mainnet") return BEAM_CAIP2.mainnet;
  if (tier === "testnet") return BEAM_CAIP2.testnet;
  return `eip155:${chainId}`;
}

export function beamNetworkLabelFromChainId(chainId: number): string {
  if (chainId === BEAM_CHAIN_IDS.mainnet) return zeroGMainnet.name;
  if (chainId === BEAM_CHAIN_IDS.testnet) return zeroGTestnet.name;
  return `Chain ${chainId}`;
}

/** Supported ERC-20 (or native) checkout tokens — extend per deployment. */
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

export const BEAM_TOKENS: { mainnet: BeamTokenConfig[]; testnet: BeamTokenConfig[] } = {
  mainnet: [MAINNET_USDC_E],
  testnet: [],
};

/** Logical contract names → checksummed address (populate via env or deployment). */
export type BeamContractAddresses = {
  identityRegistry?: `0x${string}`;
  reputationRegistry?: `0x${string}`;
};

function parseAddr(raw: string | undefined): `0x${string}` | undefined {
  const s = raw?.trim() ?? "";
  if (!s.startsWith("0x") || s.length < 42) return undefined;
  return s as `0x${string}`;
}

export const BEAM_CONTRACT_ADDRESSES: {
  mainnet: BeamContractAddresses;
  testnet: BeamContractAddresses;
} = {
  mainnet: {
    identityRegistry: parseAddr(import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS_MAINNET),
    reputationRegistry: parseAddr(import.meta.env.VITE_REPUTATION_REGISTRY_ADDRESS_MAINNET),
  },
  testnet: {
    identityRegistry: parseAddr(import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS_TESTNET),
    reputationRegistry: parseAddr(import.meta.env.VITE_REPUTATION_REGISTRY_ADDRESS_TESTNET),
  },
};

export function beamContractAddressesForChain(chainId: number | undefined): BeamContractAddresses {
  const tier = beamNetworkFromChainId(chainId) ?? "testnet";
  return tier === "mainnet" ? BEAM_CONTRACT_ADDRESSES.mainnet : BEAM_CONTRACT_ADDRESSES.testnet;
}
