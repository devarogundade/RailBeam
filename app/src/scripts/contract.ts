import { config } from "./config";
import {
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { type Hex } from "viem";
import { merchantAbi } from "../abis/merchant";
import { walletAbi } from "../abis/wallet";
import { hookManagerAbi } from "../abis/hookManager";
import { identityRegistryAbi } from "../abis/identityRegistry";
import type {
  CreateMerchant,
  CreateSubscription,
  DeleteSubscription,
  RegisterHook,
  UpdateMerchant,
  UpdateSubscription,
  MetadataEntry,
} from "./params";
import { ContractAddresses } from "beam-ts";

export const HookManagerContract = {
  address: ContractAddresses.Testnet.HookManager,

  async register(params: RegisterHook): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: hookManagerAbi,
        address: this.address,
        functionName: "register",
        args: [params],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async unRegister(): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: hookManagerAbi,
        address: this.address,
        functionName: "unRegister",
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async getHook(merchant: Hex): Promise<Hex | null> {
    try {
      return (await readContract(config, {
        abi: walletAbi,
        address: this.address,
        functionName: "getHook",
        args: [merchant],
      })) as Hex;
    } catch (error) {
      return null;
    }
  },
};

export const MultiSigContract = {
  async requestWithdraw(
    wallet: Hex,
    token: Hex,
    amount: BigInt,
    recipient: Hex,
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: walletAbi,
        address: wallet,
        functionName: "requestWithdraw",
        args: [token, amount, recipient],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async approveWithdraw(wallet: Hex, requestId: bigint): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: walletAbi,
        address: wallet,
        functionName: "approveWithdraw",
        args: [requestId],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async executeWithdraw(wallet: Hex, requestId: bigint): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: walletAbi,
        address: wallet,
        functionName: "executeWithdraw",
        args: [requestId],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async isTokenAllowed(wallet: Hex, token: Hex): Promise<boolean> {
    try {
      return (await readContract(config, {
        abi: walletAbi,
        address: wallet,
        functionName: "isTokenAllowed",
        args: [token],
      })) as boolean;
    } catch (error) {
      return false;
    }
  },

  async isSigner(wallet: Hex, account: Hex): Promise<boolean> {
    try {
      return (await readContract(config, {
        abi: walletAbi,
        address: wallet,
        functionName: "isSigner",
        args: [account],
      })) as boolean;
    } catch (error) {
      return false;
    }
  },

  async getSigners(wallet: Hex): Promise<Hex[]> {
    try {
      return (await readContract(config, {
        abi: walletAbi,
        address: wallet,
        functionName: "getSigners",
      })) as Hex[];
    } catch (error) {
      return [];
    }
  },

  async updateTokens(wallet: Hex, tokens: Hex[]): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: walletAbi,
        address: wallet,
        functionName: "updateTokens",
        args: [tokens],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async updateSigners(
    wallet: Hex,
    signers: Hex[],
    minSigners: number,
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: walletAbi,
        address: wallet,
        functionName: "updateSigners",
        args: [signers, minSigners],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },
};

export const MerchantContract = {
  address: ContractAddresses.Testnet.Merchant,

  async create(params: CreateMerchant): Promise<Hex | null> {
    console.log(params);

    try {
      const result = await writeContract(config, {
        abi: merchantAbi,
        address: this.address,
        functionName: "create",
        args: [params],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      console.log(error);

      return null;
    }
  },

  async update(params: UpdateMerchant): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: merchantAbi,
        address: this.address,
        functionName: "update",
        args: [params],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async createSubscription(params: CreateSubscription): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: merchantAbi,
        address: this.address,
        functionName: "createSubscription",
        args: [params],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async updateSubscription(params: UpdateSubscription): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: merchantAbi,
        address: this.address,
        functionName: "updateSubscription",
        args: [params],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async deleteSubscription(params: DeleteSubscription): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: merchantAbi,
        address: this.address,
        functionName: "deleteSubscription",
        args: [params],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async getWallet(merchant: Hex): Promise<Hex | null> {
    try {
      return (await readContract(config, {
        abi: merchantAbi,
        address: this.address,
        functionName: "getWallet",
        args: [merchant],
      })) as Hex;
    } catch (error) {
      return null;
    }
  },

  async getMerchant(merchant: Hex): Promise<Hex | null> {
    try {
      return (await readContract(config, {
        abi: merchantAbi,
        address: this.address,
        functionName: "getMerchant",
        args: [merchant],
      })) as Hex;
    } catch (error) {
      return null;
    }
  },
};

export const IdentityRegistryContract = {
  address: ContractAddresses.Testnet.IdentityRegistry,

  async register(
    agentURI: string,
    metadata: MetadataEntry[],
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: identityRegistryAbi,
        address: this.address,
        functionName: "register",
        args: [agentURI, metadata],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch {
      return null;
    }
  },

  async setAgentURI(agentId: bigint, newURI: string): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: identityRegistryAbi,
        address: this.address,
        functionName: "setAgentURI",
        args: [agentId, newURI],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
        confirmations: 2,
      });

      return receipt.transactionHash;
    } catch {
      return null;
    }
  },

  async getMetadata(agentId: bigint, metadataKey: string): Promise<Hex | null> {
    try {
      return (await readContract(config, {
        abi: identityRegistryAbi,
        address: this.address,
        functionName: "getMetadata",
        args: [agentId, metadataKey],
      })) as Hex;
    } catch {
      return null;
    }
  },
};
