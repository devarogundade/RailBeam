import { BrowserProvider } from "ethers";

export async function getEthersSigner() {
  const eth = (globalThis as any)?.ethereum;
  if (!eth) {
    throw new Error("No injected wallet found.");
  }
  const provider = new BrowserProvider(eth);
  return provider.getSigner();
}

