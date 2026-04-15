import { getWalletClient } from "@wagmi/core";
import { BrowserProvider } from "ethers";
import { config } from "./config";

/** Ethers v6 signer for 0G Storage SDK uploads. */
export async function getEthersSigner() {
  const walletClient = await getWalletClient(config);
  if (!walletClient?.account?.address) {
    throw new Error("Connect a wallet on 0G mainnet.");
  }
  const chain = walletClient.chain;
  const provider = new BrowserProvider(walletClient.transport as any, {
    chainId: chain?.id,
    name: chain?.name ?? "unknown",
  });
  return provider.getSigner(walletClient.account.address);
}
