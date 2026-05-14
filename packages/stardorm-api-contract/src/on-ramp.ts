import { z } from "zod";
import { x402SupportedAssetSchema } from "./chat-api.js";

export const onRampFormNetworkOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
});

/** Persisted on the chat CTA row until the user submits the on-ramp form. */
export const onRampFormCtaParamsSchema = z.object({
  _onRampForm: z.literal(true),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: z.array(onRampFormNetworkOptionSchema).max(16).optional(),
  intro: z.string().max(2000).optional(),
});

export type OnRampFormCtaParams = z.infer<typeof onRampFormCtaParamsSchema>;

export function isOnRampFormCtaParams(v: unknown): v is OnRampFormCtaParams {
  return onRampFormCtaParamsSchema.safeParse(v).success;
}

const weiString = z.union([
  z
    .string()
    .trim()
    .regex(
      /^[1-9]\d*$/,
      "tokenAmountWei must be base units (positive integer string, no decimals)",
    ),
  z.number().int().positive().transform((n) => String(n)),
]);

const evmAddr = z
  .string()
  .min(1)
  .refine(
    (s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()),
    "must be a 0x-prefixed 20-byte address",
  )
  .transform((s) => s.trim().toLowerCase());

/** Execution payload for `on_ramp_tokens` (Stripe Checkout + treasury ERC-20 send). */
export const onRampTokensInputSchema = z.object({
  recipientWallet: evmAddr,
  network: z.string().min(1).max(64),
  tokenAddress: evmAddr,
  tokenDecimals: z.number().int().min(0).max(36),
  tokenSymbol: z.string().min(1).max(32),
  tokenAmountWei: weiString,
  /** Optional spot reference for analytics / UI (per supported token). */
  usdValue: z.number().finite().nonnegative().optional(),
  /** Total USD charged via Stripe (cents). Minimum $1.00. */
  usdAmountCents: z.number().int().min(100).max(10_000_000),
});

export type OnRampTokensInput = z.infer<typeof onRampTokensInputSchema>;

export const onRampRecordStatusSchema = z.enum([
  "pending_checkout",
  "pending_payment",
  "paid_pending_transfer",
  "fulfilled",
  "failed",
  "canceled",
]);

export type OnRampRecordStatus = z.infer<typeof onRampRecordStatusSchema>;

export const onRampRecordSchema = z.object({
  id: z.string().min(1),
  status: onRampRecordStatusSchema,
  walletAddress: z.string().min(1),
  recipientWallet: z.string().min(1),
  network: z.string().min(1),
  tokenAddress: z.string().min(1),
  tokenDecimals: z.number().int().min(0).max(36),
  tokenSymbol: z.string().min(1),
  tokenAmountWei: z.string().min(1),
  usdAmountCents: z.number().int().nonnegative(),
  usdValue: z.number().finite().nonnegative().optional(),
  stripeCheckoutSessionId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  fulfillmentTxHash: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type OnRampRecord = z.infer<typeof onRampRecordSchema>;
