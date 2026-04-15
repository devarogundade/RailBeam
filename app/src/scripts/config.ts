import { injected, walletConnect } from "@wagmi/connectors";
import { defaultWagmiConfig } from "@web3modal/wagmi";
import { zeroG } from "viem/chains";

const metadata = {
  name: "Beam",
  description: "Beam — merchant payments on 0G (Galileo mainnet)",
  url: window.location.origin,
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const chains = [zeroG];

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
