import { z } from "zod";
import { x402SupportedAssetSchema } from "./chat-api.js";

export const transferFormNetworkOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
});

/** Persisted on the chat CTA row until the user submits the transfer form. */
export const transferFormCtaParamsSchema = z.object({
  _transferForm: z.literal(true),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: z.array(transferFormNetworkOptionSchema).max(16).optional(),
  intro: z.string().max(2000).optional(),
  /** When set, pre-fill recipient in the form. */
  defaultTo: z
    .string()
    .trim()
    .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s), "defaultTo must be 0x…40")
    .transform((s) => s.toLowerCase())
    .optional(),
});

export type TransferFormCtaParams = z.infer<typeof transferFormCtaParamsSchema>;

export function isTransferFormCtaParams(v: unknown): v is TransferFormCtaParams {
  return transferFormCtaParamsSchema.safeParse(v).success;
}

const optionalDefaultToSchema = z
  .string()
  .trim()
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s), "defaultTo must be 0x…40")
  .transform((s) => s.toLowerCase())
  .optional();

const optionalDefaultContractSchema = z
  .string()
  .trim()
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s), "defaultContract must be 0x…40")
  .transform((s) => s.toLowerCase())
  .optional();

/** Persisted CTA until the user submits the NFT transfer checkout form. */
export const nftFormCtaParamsSchema = z.object({
  _nftForm: z.literal(true),
  networks: z.array(transferFormNetworkOptionSchema).max(16).optional(),
  intro: z.string().max(2000).optional(),
  defaultTo: optionalDefaultToSchema,
  defaultContract: optionalDefaultContractSchema,
});

export type NftFormCtaParams = z.infer<typeof nftFormCtaParamsSchema>;

export function isNftFormCtaParams(v: unknown): v is NftFormCtaParams {
  return nftFormCtaParamsSchema.safeParse(v).success;
}

/** Persisted CTA until the user submits the native transfer checkout form. */
export const nativeTransferFormCtaParamsSchema = z.object({
  _nativeForm: z.literal(true),
  networks: z.array(transferFormNetworkOptionSchema).max(16).optional(),
  intro: z.string().max(2000).optional(),
  defaultTo: optionalDefaultToSchema,
});

export type NativeTransferFormCtaParams = z.infer<
  typeof nativeTransferFormCtaParamsSchema
>;

export function isNativeTransferFormCtaParams(
  v: unknown,
): v is NativeTransferFormCtaParams {
  return nativeTransferFormCtaParamsSchema.safeParse(v).success;
}
