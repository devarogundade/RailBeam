import "@nomicfoundation/hardhat-toolbox-viem";
import dotenv from "dotenv";

dotenv.config();

const MNEMONIC = process.env.MNEMONIC as string;

module.exports = {
  mocha: {
    timeout: 100000000,
  },
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    hardhat: {
      accounts: {
        privateKey:
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // test PK
      },
    },
    /** 0G Chain — https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/deploy-contracts */
    zogTestnet: {
      url: "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
    zogMainnet: {
      url: "https://evmrpc.0g.ai",
      chainId: 16661,
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
  },
  etherscan: {
    apiKey: {
      // 0G ChainScan accepts a placeholder when using custom verifier URLs
      zogTestnet: "PLACEHOLDER",
      zogMainnet: "PLACEHOLDER",
    },
    customChains: [
      {
        network: "zogTestnet",
        chainId: 16602,
        urls: {
          apiURL: "https://chainscan-galileo.0g.ai/open/api",
          browserURL: "https://chainscan-galileo.0g.ai",
        },
      },
      {
        network: "zogMainnet",
        chainId: 16661,
        urls: {
          apiURL: "https://chainscan.0g.ai/open/api",
          browserURL: "https://chainscan.0g.ai",
        },
      },
    ],
  },
};
