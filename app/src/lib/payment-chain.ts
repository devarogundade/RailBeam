import { zeroGMainnet, zeroGTestnet } from "viem/chains";
import { BEAM_CHAIN_IDS } from "./beam-chain-config";

const EIP155_CAIP2_RE = /^eip155:(\d+)$/i;

/** Map backend `network` string to an EVM chain id when possible. */
export function resolvePaymentChainId(network: string): number | null {
  const n = network.trim();
  if (!n) return null;

  const caip2 = EIP155_CAIP2_RE.exec(n);
  if (caip2) {
    const id = Number.parseInt(caip2[1], 10);
    if (!Number.isNaN(id) && id > 0) return id;
  }

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

/** Display name for checkout / payment UI. */
export function paymentNetworkLabel(networkRaw: string, chainId: number | null): string {
  const resolved = chainId ?? resolvePaymentChainId(networkRaw);
  if (resolved === BEAM_CHAIN_IDS.testnet) return zeroGTestnet.name;
  if (resolved === BEAM_CHAIN_IDS.mainnet) return zeroGMainnet.name;
  if (resolved != null) return `Chain ${resolved}`;
  const n = networkRaw.trim();
  if (n) return n;
  return "Unknown network";
}
