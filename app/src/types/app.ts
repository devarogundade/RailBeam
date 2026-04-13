import type { Hex } from "viem";

export type Notification = {
  title: string;
  description: string;
  category: string;
  linkTitle?: string;
  linkUrl?: string;
};

export enum Connection {
  Wallet,
  Guest,
}

// Backend integrations (not part of beam-ts graph entities)
export type ClientMerchant = {
  webhooks: string[];
  plansCount: number;
  subscriptionPaymentCount: number;
};

// UI-friendly view model for subscription plans
export type Plan = {
  _id: string;
  transactionHash: Hex;
  merchant: Hex;
  name: string;
  description: string;
  images: string[];
  category: string;
  gracePeriod: number;
  available: boolean;
  interval: number;
  amount: number;
  token: Hex;
  createdAt: Date;
  updatedAt: Date | null;
};

export type CreatePlan = {
  transactionHash: Hex;
  merchant: Hex;
  name: string;
  description: string;
  images: string[];
  category: string;
  interval: number;
  gracePeriod: number;
  amount: number;
  token: Hex;
};

export type CreateMerchant = {
  merchant: Hex;
  webhooks: string[];
};

export type UpdateWebhooks = {
  merchant: Hex;
  webhooks: string[];
};

export type ChatResponse = {
  type: "text" | "x402";
  content: string;
  error?: string;
};

export type CreateEncryptedMetadataResponse = {
  rootHash: string;
  txHash: string;
};
