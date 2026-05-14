import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { PrivateKeyAccount } from "viem/accounts";

/**
 * Local EOA from a hex private key (0x-prefixed). Compatible with `sdk.auth(…)`.
 */
export function accountFromPrivateKey(privateKey: Hex): PrivateKeyAccount {
  return privateKeyToAccount(privateKey);
}

/** Any account that can `personal_sign` the auth challenge message. */
export type BeamSignableWallet = Pick<PrivateKeyAccount, "address" | "signMessage">;
