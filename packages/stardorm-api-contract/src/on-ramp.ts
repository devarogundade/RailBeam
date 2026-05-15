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

/**
 * Map card charge cents to ERC-20 base units assuming a USD-pegged 1:1 token
 * (e.g. USDC.e): $1.23 ⇔ token human 1.23 in `tokenDecimals` units.
 *
 * Requires `tokenDecimals >= 2` so sub-cent fiat amounts are unnecessary.
 */
export function deriveTokenAmountWeiFromUsdCents(
  usdAmountCents: number,
  tokenDecimals: number,
): string {
  if (!Number.isFinite(usdAmountCents) || usdAmountCents < 100) {
    throw new Error("usdAmountCents must be a finite integer >= 100");
  }
  if (!Number.isInteger(usdAmountCents)) {
    throw new Error("usdAmountCents must be an integer (cents)");
  }
  if (!Number.isInteger(tokenDecimals) || tokenDecimals < 2 || tokenDecimals > 36) {
    throw new Error("tokenDecimals must be an integer from 2 to 36 for 1:1 USD mapping");
  }
  const cents = BigInt(usdAmountCents);
  const scale = 10n ** BigInt(tokenDecimals - 2);
  return (cents * scale).toString();
}

const evmAddr = z
  .string()
  .min(1)
  .refine(
    (s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()),
    "must be a 0x-prefixed 20-byte address",
  )
  .transform((s) => s.trim().toLowerCase());

/** Raw tool / API fields before USD→base-units derivation (`on_ramp_tokens`). */
export const onRampTokensInputCoreSchema = z.object({
  recipientWallet: evmAddr,
  network: z.string().min(1).max(64),
  tokenAddress: evmAddr,
  tokenDecimals: z.number().int().min(2).max(36),
  tokenSymbol: z.string().min(1).max(32),
  /** Prefer omitting — server derives from USD card charge using 1:1 USD-stable mapping. */
  tokenAmountWei: weiString.optional(),
  /** Optional spot reference for analytics / UI (per supported token). */
  usdValue: z.number().finite().nonnegative().optional(),
  /** Total USD charged via Stripe (cents). Minimum $1.00. */
  usdAmountCents: z.number().int().min(100).max(10_000_000),
});

export type OnRampTokensInputCore = z.infer<typeof onRampTokensInputCoreSchema>;

/** zod `superRefine`: ensures USD cents map to token base units (and optional wei matches). */
export function validateOnRampUsdDerive(
  data: OnRampTokensInputCore,
  ctx: z.RefinementCtx,
): void {
  try {
    const derived = deriveTokenAmountWeiFromUsdCents(
      data.usdAmountCents,
      data.tokenDecimals,
    );
    if (data.tokenAmountWei !== undefined) {
      const provided =
        typeof data.tokenAmountWei === "number"
          ? String(data.tokenAmountWei)
          : data.tokenAmountWei.trim();
      if (provided !== derived) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "tokenAmountWei must match the card charge under 1:1 USD-stable mapping — omit tokenAmountWei and rely on usdAmountCents.",
          path: ["tokenAmountWei"],
        });
      }
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Could not derive token amount from USD; check usdAmountCents and tokenDecimals.",
      path: ["usdAmountCents"],
    });
  }
}

export function finalizeOnRampTokensPayload(
  data: OnRampTokensInputCore,
): {
  recipientWallet: string;
  network: string;
  tokenAddress: string;
  tokenDecimals: number;
  tokenSymbol: string;
  tokenAmountWei: string;
  usdAmountCents: number;
  usdValue?: number;
} {
  return {
    recipientWallet: data.recipientWallet,
    network: data.network,
    tokenAddress: data.tokenAddress,
    tokenDecimals: data.tokenDecimals,
    tokenSymbol: data.tokenSymbol,
    tokenAmountWei: deriveTokenAmountWeiFromUsdCents(
      data.usdAmountCents,
      data.tokenDecimals,
    ),
    ...(data.usdValue !== undefined ? { usdValue: data.usdValue } : {}),
    usdAmountCents: data.usdAmountCents,
  };
}

/** Execution payload for `on_ramp_tokens` (Stripe Checkout + treasury ERC-20 send). */
export const onRampTokensInputSchema = onRampTokensInputCoreSchema
  .superRefine(validateOnRampUsdDerive)
  .transform(finalizeOnRampTokensPayload);

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

/** Query for GET `/users/me/on-ramps`. */
export const meOnRampsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type MeOnRampsQuery = z.infer<typeof meOnRampsQuerySchema>;

export const onRampsListResponseSchema = z.object({
  items: z.array(onRampRecordSchema),
});

export type OnRampsListResponse = z.infer<typeof onRampsListResponseSchema>;
