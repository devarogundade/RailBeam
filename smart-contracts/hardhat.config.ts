import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import dotenv from "dotenv";
import { defineConfig } from "hardhat/config";

dotenv.config();

const MNEMONIC = process.env.MNEMONIC as string;

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1_000,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1_000,
          },
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
    zogMainnet: {
      type: "http",
      chainType: "l1",
      url: "https://evmrpc.0g.ai",
      chainId: 16661,
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
    zogTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
  },
  verify: {
    etherscan: {
      apiKey: "PLACEHOLDER",
    },
  },
  chainDescriptors: {
    16661: {
      name: "0g",
      blockExplorers: {
        etherscan: {
          name: "0g Chainscan",
          url: "https://chainscan.0g.ai",
          apiUrl: "https://chainscan.0g.ai/open/api",
        },
      },
    },
    16602: {
      name: "0g Galileo",
      blockExplorers: {
        etherscan: {
          name: "0g Chainscan (Testnet)",
          url: "https://chainscan-testnet.0g.ai",
          apiUrl: "https://chainscan-testnet.0g.ai/open/api",
        },
      },
    },
  },
});
