import { defineChain } from "viem";

/** 0G Galileo testnet — https://docs.0g.ai/developer-hub/testnet/testnet-overview */
export const ogGalileoTestnet = defineChain({
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "0G",
    symbol: "0G",
  },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: {
      name: "ChainScan Galileo",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
});
