import type { Hex } from "viem";
import type { Metadata } from "./types";

export type PrepareOneTimeTransaction = {
  payers: Hex[];
  merchant: Hex;
  amounts: bigint[];
  token: Hex;
  description: string;
  metadata: Metadata;
  splitPayment: boolean;
};

export type PrepareFulfillOneTimeTransaction = {
  transactionId: Hex;
};

export type PrepareRecurrentTransaction = {
  merchant: Hex;
  subscriptionId: Hex;
  description: string;
  metadata: Metadata;
};

export type PrepareFulfillRecurrentTransaction = {
  transactionId: Hex;
  subscriptionId: Hex;
};

export type PrepareCancelRecurrentTransaction = {
  transactionId: Hex;
  subscriptionId: Hex;
};

export type CreateOneTimeTransaction = {
  payers: Hex[];
  merchant: Hex;
  amounts: bigint[];
  token: Hex;
  description: string;
  metadata: Metadata;
};

export type FulfillOneTimeTransaction = {
  transactionId: Hex;
};

export type CreateRecurrentTransaction = {
  merchant: Hex;
  subscriptionId: Hex;
  description: string;
  metadata: Metadata;
};

export type FulfillRecurrentTransaction = {
  transactionId: Hex;
};

export type CancelRecurrentTransaction = {
  transactionId: Hex;
};

export type MintReceipt = {
  to: Hex;
  transactionId: Hex;
  URI: string;
};
