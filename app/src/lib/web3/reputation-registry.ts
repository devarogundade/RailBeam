import { keccak256, stringToBytes } from "viem";
import { beamContractAddressesForChain } from "@/lib/beam-chain-config";
export const reputationRegistryAbi = [
  {
    type: "function",
    name: "giveFeedback",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

export function getReputationRegistryAddressForChain(
  chainId: number | undefined,
): `0x${string}` | undefined {
  return beamContractAddressesForChain(chainId).reputationRegistry;
}

export function getReputationRegistryAddress(): `0x${string}` | undefined {
  return getReputationRegistryAddressForChain(undefined);
}
export function buildBeamFeedbackPayload(stars: number, comment: string): {
  feedbackURI: string;
  feedbackHash: `0x${string}`;
} {
  const trimmed = comment.trim().slice(0, 2000);
  const feedbackURI = JSON.stringify({
    schema: "beam.feedback/v1",
    stars,
    comment: trimmed,
    createdAt: new Date().toISOString(),
  });
  return {
    feedbackURI,
    feedbackHash: keccak256(stringToBytes(feedbackURI)),
  };
}
