import { injected, walletConnect } from "@wagmi/connectors";
import { defaultWagmiConfig } from "@web3modal/wagmi";
import type { Chain } from "viem";

const zeroGMainnet: Chain = {
  id: 16661,
  name: "0G Mainnet",
  nativeCurrency: {
    name: "0G",
    symbol: "0G",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://evmrpc.0g.ai"] },
    public: { http: ["https://evmrpc.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G ChainScan", url: "https://chainscan.0g.ai" },
  },
};

const metadata = {
  name: "Beam",
  description: "Beam — merchant payments on 0G (Galileo mainnet)",
  url: window.location.origin,
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const chains = [zeroGMainnet];

export const config = defaultWagmiConfig({
  // @ts-ignore
  chains,
  projectId: import.meta.env.VITE_PROJECT_ID,
  metadata,
  connectors: [
    injected(),
    walletConnect({
      projectId: import.meta.env.VITE_PROJECT_ID,
      showQrModal: false,
    }),
  ],
});
