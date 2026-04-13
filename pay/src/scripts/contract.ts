import { config } from "./config";
import {
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { beamAbi } from "../abis/beam";
import type {
  CancelRecurrentTransaction,
  CreateOneTimeTransaction,
  CreateRecurrentTransaction,
  FulfillOneTimeTransaction,
  FulfillRecurrentTransaction,
  MintReceipt,
} from "beam-ts/src/params";
import type { Hex } from "viem";

const BeamContract = {
  address: "0x31f73F44019328da4545d589a1f3e8A62C0a3e69" as Hex,

  async oneTimeTransaction(
    params: CreateOneTimeTransaction,
    value: bigint = BigInt(0)
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
      });

      return receipt.transactionHash;
    } catch (error) {
      console.log(error);

      return null;
    }
  },

  async fulfillOneTimeTransaction(
    params: FulfillOneTimeTransaction,
    value: bigint = BigInt(0)
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
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async recurrentTransaction(
    params: CreateRecurrentTransaction,
    value: bigint = BigInt(0)
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
      });

      return receipt.transactionHash;
    } catch (error) {
      console.log(error);

      return null;
    }
  },

  async fulfillRecurrentTransaction(
    params: FulfillRecurrentTransaction,
    value: bigint = BigInt(0)
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
      });

      return receipt.transactionHash;
    } catch (error) {
      console.log(error);

      return null;
    }
  },

  async cancelRecurrentTransaction(
    params: CancelRecurrentTransaction
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
      });

      return receipt.transactionHash;
    } catch (error) {
      console.log(error);

      return null;
    }
  },

  async mintOneTimeTransactionReceipt(
    params: MintReceipt
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: beamAbi,
        address: this.address,
        functionName: "mintOneTimeTransactionReceipt",
        args: [params],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async mintRecurrentTransactionReceipt(
    params: MintReceipt
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: beamAbi,
        address: this.address,
        functionName: "mintRecurrentTransactionReceipt",
        args: [params],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },
};

export { BeamContract };
