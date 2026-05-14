import { beamContractAddressesForChain } from "@/lib/beam-chain-config";

/** First billing window length when hiring via `subscribe` (30 days ≈ one month). */
export const IDENTITY_SUBSCRIBE_NUM_DAYS = 30n;

/** `getFees` per-day rate and `subscribe` `msg.value` use native smallest units (18 on 0G / EVM). Value must match `feePerDay * numDays` exactly; fees are paid to the agent wallet on-chain. */
export const IDENTITY_REGISTRY_NATIVE_DECIMALS = 18;

export const identityRegistryAbi = [
  {
    type: "event",
    name: "Cloned",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "sourceTokenId", type: "uint256", indexed: true },
      { name: "newTokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "function",
    name: "subscribe",
    stateMutability: "payable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "numDays", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "unsubscribe",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "daysLeft", type: "uint256" },
      { name: "refund", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getFees",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "feePerDay", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "clone",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "sealedKey", type: "bytes" },
      { name: "proof", type: "bytes" },
    ],
    outputs: [{ name: "newTokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setAgentURI",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
] as const;

export function getIdentityRegistryAddressForChain(
  chainId: number | undefined,
): `0x${string}` | undefined {
  return beamContractAddressesForChain(chainId).identityRegistry;
}

/** Uses testnet env fallbacks when `chainId` is unknown (e.g. SSR / no wallet). */
export function getIdentityRegistryAddress(): `0x${string}` | undefined {
  return getIdentityRegistryAddressForChain(undefined);
}
