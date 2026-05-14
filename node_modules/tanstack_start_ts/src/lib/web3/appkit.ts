import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { BEAM_VIEM_CHAINS } from "@/lib/beam-chain-config";

export const appNetworks = [...BEAM_VIEM_CHAINS] as const;

const configuredId = import.meta.env.VITE_REOWN_PROJECT_ID?.trim() ?? "";
const walletConnectProjectId = configuredId;

export const isWalletConfigured = configuredId.length > 0;

const metadata = {
  name: "Beam",
  description: "Agentic finance on 0G",
  url: typeof window !== "undefined" ? window.location.origin : "https://localhost",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

export const wagmiAdapter = new WagmiAdapter({
  networks: [...appNetworks],
  projectId: walletConnectProjectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [...appNetworks],
  projectId: walletConnectProjectId,
  metadata,
  themeMode: "dark",
  features: {
    analytics: false,
  },
});
