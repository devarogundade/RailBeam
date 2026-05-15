import { z } from "zod";

export const createCreditCardInputSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().min(1).max(20),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((c) => c.toUpperCase()),
  cardLabel: z.string().trim().min(1).max(80).optional(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((c) => c.toUpperCase())
    .optional(),
  /** Opening balance in minor units (e.g. USD cents). */
  initialBalanceCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
});

export type CreateCreditCardInput = z.infer<typeof createCreditCardInputSchema>;

/** Persisted on the chat CTA row until the user submits the virtual-card billing form. */
export const creditCardFormCtaParamsSchema = z.object({
  _creditCardForm: z.literal(true),
  intro: z.string().max(2000).optional(),
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((c) => c.toUpperCase())
    .optional(),
});

export type CreditCardFormCtaParams = z.infer<typeof creditCardFormCtaParamsSchema>;

export function isCreditCardFormCtaParams(v: unknown): v is CreditCardFormCtaParams {
  return creditCardFormCtaParamsSchema.safeParse(v).success;
}

export const creditCardPublicSchema = z.object({
  id: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  cardLabel: z.string().optional(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  region: z.string(),
  postalCode: z.string(),
  countryCode: z.string(),
  currency: z.string(),
  balanceCents: z.number().int().nonnegative(),
  last4: z.string(),
  networkBrand: z.string(),
  status: z.enum(["active", "frozen"]),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  /** Present on some `POST …/withdraw` responses when native 0G was sent from the treasury. */
  lastWithdrawTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
});

export type CreditCardPublic = z.infer<typeof creditCardPublicSchema>;

/** Wallet-authenticated only; never included in list cards responses. */
export const creditCardSensitiveDetailsSchema = z.object({
  cardId: z.string().min(1),
  pan: z.string().regex(/^\d{16}$/),
  expiryMonth: z.coerce.number().int().min(1).max(12),
  expiryYear: z.coerce.number().int().min(2000).max(2100),
  cvv: z.string().regex(/^\d{3,4}$/),
});

export type CreditCardSensitiveDetails = z.infer<
  typeof creditCardSensitiveDetailsSchema
>;

export const creditCardsListResponseSchema = z.object({
  cards: z.array(creditCardPublicSchema),
});

export type CreditCardsListResponse = z.infer<typeof creditCardsListResponseSchema>;

export const creditCardFundQuoteQuerySchema = z.object({
  amountCents: z.coerce.number().int().min(1).max(100_000_000),
});

export type CreditCardFundQuoteQuery = z.infer<
  typeof creditCardFundQuoteQuerySchema
>;

/** USDC.e x402 fund on 0G mainnet (1 USD cent = 10_000 base units). */
export const creditCardFundQuoteX402Schema = z.object({
  onchainFundingRequired: z.literal(false),
  chainId: z.number().int(),
  recipient: z.string().min(1),
  usdcAsset: z.string().min(1),
  usdcAmountBaseUnits: z.string().regex(/^\d+$/),
  usdcDecimals: z.number().int().min(0).max(18),
});

/** Native 0G transfer to treasury (used when x402 is not configured). */
export const creditCardFundQuoteNativeSchema = z.object({
  onchainFundingRequired: z.literal(true),
  chainId: z.number().int(),
  recipient: z.string().min(1),
  minNativeWei: z.string().regex(/^\d+$/),
  usdValue: z.number().finite().positive(),
  nativeSymbol: z.string().min(1),
  nativeDecimals: z.number().int().min(0).max(18),
});

export const creditCardFundQuoteSchema = z.discriminatedUnion(
  "onchainFundingRequired",
  [creditCardFundQuoteX402Schema, creditCardFundQuoteNativeSchema],
);

export type CreditCardFundQuote = z.infer<typeof creditCardFundQuoteSchema>;
export type CreditCardFundQuoteX402 = z.infer<typeof creditCardFundQuoteX402Schema>;
export type CreditCardFundQuoteNative = z.infer<typeof creditCardFundQuoteNativeSchema>;

/** @deprecated Use {@link CreditCardFundQuote} */
export type CreditCardFundQuoteResponse = CreditCardFundQuote;

/** @deprecated Use {@link creditCardFundQuoteSchema} */
export const creditCardFundQuoteResponseSchema = creditCardFundQuoteSchema;

export const creditCardWithdrawBodySchema = z.object({
  amountCents: z.coerce.number().int().min(1).max(100_000_000),
});

export type CreditCardWithdrawBody = z.infer<typeof creditCardWithdrawBodySchema>;
