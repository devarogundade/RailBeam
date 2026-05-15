import {
  BEAM_CHAIN_IDS,
  BEAM_DEFAULT_NETWORK,
  type BeamNetworkId,
} from "@/lib/beam-chain-config";

export const BEAM_PREFERRED_NETWORK_STORAGE_KEY = "beam-preferred-network";

export function readStoredBeamNetwork(): BeamNetworkId {
  if (typeof window === "undefined") return BEAM_DEFAULT_NETWORK;
  try {
    const raw = localStorage.getItem(BEAM_PREFERRED_NETWORK_STORAGE_KEY);
    if (raw === "mainnet" || raw === "testnet") return raw;
  } catch {
    // ignore
  }
  return BEAM_DEFAULT_NETWORK;
}

export function writeStoredBeamNetwork(n: BeamNetworkId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BEAM_PREFERRED_NETWORK_STORAGE_KEY, n);
  } catch {
    // ignore
  }
}

export function readStoredBeamPreferredChainId(): number {
  const n = readStoredBeamNetwork();
  return n === "mainnet" ? BEAM_CHAIN_IDS.mainnet : BEAM_CHAIN_IDS.testnet;
}
