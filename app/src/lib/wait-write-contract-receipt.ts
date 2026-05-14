import type { PublicClient } from "viem";
import { waitForTransactionReceipt } from "viem/actions";

/** Blocks used after inclusion before treating a write as settled. */
export const WRITE_CONTRACT_CONFIRMATIONS = 2;

export function waitForWriteContractReceipt(
  publicClient: PublicClient,
  hash: `0x${string}`,
) {
  return waitForTransactionReceipt(publicClient, {
    hash,
    confirmations: WRITE_CONTRACT_CONFIRMATIONS,
  });
}
