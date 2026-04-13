import { createWeb3Modal } from "@web3modal/wagmi/vue";
import { config, chains } from "./config";

let initialized = false;

export function initWeb3Modal() {
  if (initialized) return;
  initialized = true;
  createWeb3Modal({
    wagmiConfig: config,
    projectId: import.meta.env.VITE_PROJECT_ID,
    // @ts-ignore wagmi chain list typing
    chains,
    enableAnalytics: true,
    themeMode: "dark",
  });
}
