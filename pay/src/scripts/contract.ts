import { config } from "./config";
import { waitForTransactionReceipt, writeContract } from "@wagmi/core";
import { beamAbi } from "../abis/beam";
import { ContractAddresses } from "beam-ts/src/utils/constants";
import type {
  CancelRecurrentTransaction,
  CreateOneTimeTransaction,
  CreateRecurrentTransaction,
  FulfillOneTimeTransaction,
  FulfillRecurrentTransaction,
  MintReceipt,
} from "beam-ts/src/params";
import type { Hex } from "viem";
import { oneTimeTransactionAbi } from "@/abis/onetime-transaction";
import { recurrentTransactionAbi } from "@/abis/recurrent-transaction";
import { userRegistryAbi } from "@/abis/user-registry";

const BeamContract = {
  address: ContractAddresses.Testnet.Beam,

  async oneTimeTransaction(
    params: CreateOneTimeTransaction,
    value: bigint = BigInt(0),
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: beamAbi,
        address: this.address,
        functionName: "oneTimeTransaction",
        args: [params],
        value: value,
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

  async fulfillOneTimeTransaction(
    params: FulfillOneTimeTransaction,
    value: bigint = BigInt(0),
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: beamAbi,
        address: this.address,
        functionName: "fulfillOneTimeTransaction",
        args: [params],
        value: value,
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

  async recurrentTransaction(
    params: CreateRecurrentTransaction,
    value: bigint = BigInt(0),
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: beamAbi,
        address: this.address,
        functionName: "recurrentTransaction",
        args: [params],
        value: value,
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

  async fulfillRecurrentTransaction(
    params: FulfillRecurrentTransaction,
    value: bigint = BigInt(0),
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: beamAbi,
        address: this.address,
        functionName: "fulfillRecurrentTransaction",
        args: [params],
        value: value,
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

  async cancelRecurrentTransaction(
    params: CancelRecurrentTransaction,
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: beamAbi,
        address: this.address,
        functionName: "cancelRecurrentTransaction",
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
};

const OneTimeTransactionContract = {
  address: ContractAddresses.Testnet.OneTimeTransaction,

  async mintReceipt(params: MintReceipt): Promise<Hex | null> {
    const result = await writeContract(config, {
      abi: oneTimeTransactionAbi,
      address: this.address,
      functionName: "mintReceipt",
      args: [params],
    });

    const receipt = await waitForTransactionReceipt(config, {
      hash: result,
      confirmations: 2,
    });

    return receipt.transactionHash;
  },
};

const RecurrentTransactionContract = {
  address: ContractAddresses.Testnet.RecurrentTransaction,

  async mintReceipt(params: MintReceipt): Promise<Hex | null> {
    const result = await writeContract(config, {
      abi: recurrentTransactionAbi,
      address: this.address,
      functionName: "mintReceipt",
      args: [params],
    });

    const receipt = await waitForTransactionReceipt(config, {
      hash: result,
      confirmations: 2,
    });

    return receipt.transactionHash;
  },
};

const UserRegistryContract = {
  address: ContractAddresses.Testnet.UserRegistry,

  async register(username: string, metadataURI: string): Promise<Hex | null> {
    const result = await writeContract(config, {
      abi: userRegistryAbi,
      address: this.address,
      functionName: "register",
      args: [username, metadataURI],
    });

    const receipt = await waitForTransactionReceipt(config, {
      hash: result,
      confirmations: 2,
    });

    return receipt.transactionHash;
  },

  async updateUsername(newUsername: string): Promise<Hex | null> {
    const result = await writeContract(config, {
      abi: userRegistryAbi,
      address: this.address,
      functionName: "updateUsername",
      args: [newUsername],
    });

    const receipt = await waitForTransactionReceipt(config, {
      hash: result,
      confirmations: 2,
    });

    return receipt.transactionHash;
  },

  async updateMetadataURI(newMetadataURI: string): Promise<Hex | null> {
    const result = await writeContract(config, {
      abi: userRegistryAbi,
      address: this.address,
      functionName: "updateMetadataURI",
      args: [newMetadataURI],
    });

    const receipt = await waitForTransactionReceipt(config, {
      hash: result,
      confirmations: 2,
    });

    return receipt.transactionHash;
  },
};

export {
  BeamContract,
  OneTimeTransactionContract,
  RecurrentTransactionContract,
  UserRegistryContract,
};
