import type { Hex } from "viem";
import type { SubscriptionPlan } from "./types";

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
  amount: bigint;
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

export type X402ResourceView = {
  id: string;
  kind: "file" | "link";
  assetAmount: {
    asset: string;
    amount: number;
    extra?: Record<string, unknown>;
  };
  currency: string;
  network: string;
  payTo: string;
  rootHash: string;
  filename?: string;
  mimeType?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateX402LinkPayload = {
  link: string;
  amount: number;
  currency: "USDC";
  network: string;
  payTo: string;
  /** Optional when the network has a built-in USDC address or VITE_X402_USDC_ASSET is set. */
  asset?: string;
  title?: string;
};

export type CreateX402FileMetaPayload = {
  amount: number;
  currency: "USDC";
  network: string;
  payTo: string;
  asset?: string;
  title?: string;
};

export type CatalogMetadata = {
  name?: string;
  description?: string;
  images?: string[];
  category?: string;
};

export function parseCatalogMetadata(value: unknown): CatalogMetadata {
  if (typeof value !== "string") return {};
  try {
    const obj = JSON.parse(value);
    if (!obj || typeof obj !== "object") return {};
    const rec = obj as Record<string, unknown>;
    return {
      name: typeof rec.name === "string" ? rec.name : undefined,
      description: typeof rec.description === "string" ? rec.description : undefined,
      images: Array.isArray(rec.images)
        ? rec.images.filter((x: unknown) => typeof x === "string")
        : undefined,
      category: typeof rec.category === "string" ? rec.category : undefined,
    };
  } catch {
    return {};
  }
}

export function mapSubscriptionPlanToPlan(row: SubscriptionPlan): Plan {
  const c = parseCatalogMetadata(row.catalog_metadata_value);
  return {
    _id: row.subsciptionId,
    transactionHash: row.transactionHash,
    merchant: row.merchant,
    name: c.name || row.description,
    description: c.description || row.description,
    images: c.images ?? [],
    category: c.category ?? "",
    gracePeriod: Number(row.gracePeriod),
    available: true,
    interval: Number(row.interval),
    amount: typeof row.amount === "bigint" ? row.amount : BigInt(String(row.amount)),
    token: row.token,
    createdAt: new Date(Number(row.blockTimestamp) * 1000),
    updatedAt: null,
  };
}

