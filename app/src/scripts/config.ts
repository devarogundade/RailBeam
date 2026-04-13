import { walletConnect } from "@wagmi/connectors";
import { defaultWagmiConfig } from "@web3modal/wagmi";
import { ogGalileoTestnet } from "./ogChain";

const metadata = {
  name: "Beam",
  description: "Beam — merchant payments on 0G (Galileo testnet)",
  url: "https://beam-app.netlify.app",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const chains = [ogGalileoTestnet];

export const config = defaultWagmiConfig({
  // @ts-ignore
  chains,
  projectId: import.meta.env.VITE_PROJECT_ID,
  metadata,
  connectors: [
    walletConnect({
      projectId: import.meta.env.VITE_PROJECT_ID,
    }),
  ],
});
