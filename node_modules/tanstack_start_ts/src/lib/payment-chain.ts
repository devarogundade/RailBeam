import { zeroGMainnet, zeroGTestnet } from "viem/chains";

/** Map backend `network` string to an EVM chain id when possible. */
export function resolvePaymentChainId(network: string): number | null {
  const n = network.trim();
  const asNum = Number.parseInt(n, 10);
  if (!Number.isNaN(asNum) && asNum > 0) return asNum;
  const slug = n.toLowerCase().replace(/\s+/g, "-");
  if (
    slug.includes("galileo") ||
    slug === "0g-galileo-testnet" ||
    slug === "0ggalileotestnet" ||
    slug.includes("testnet")
  ) {
    return zeroGTestnet.id;
  }
  if (slug.includes("mainnet") || slug === "0g" || slug === "0g-mainnet") {
    return zeroGMainnet.id;
  }
  if (n.toLowerCase() === zeroGTestnet.name.toLowerCase()) {
    return zeroGTestnet.id;
  }
  if (n.toLowerCase() === zeroGMainnet.name.toLowerCase()) {
    return zeroGMainnet.id;
  }
  return null;
}
