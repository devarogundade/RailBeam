import { zeroGMainnet, zeroGTestnet } from "viem/chains";

/** Logical Beam / 0G deployment tier (matches app `BeamNetworkId`). */
export type BeamNetworkId = "mainnet" | "testnet";

export const BEAM_NETWORK_DEFAULT_EVM_CHAIN_ID: Record<BeamNetworkId, number> = {
  mainnet: zeroGMainnet.id,
  testnet: zeroGTestnet.id,
};

export function defaultEvmChainIdForNetwork(network: BeamNetworkId): number {
  return BEAM_NETWORK_DEFAULT_EVM_CHAIN_ID[network];
}
