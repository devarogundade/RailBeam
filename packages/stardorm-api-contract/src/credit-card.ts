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
});

export type CreditCardPublic = z.infer<typeof creditCardPublicSchema>;

export const creditCardsListResponseSchema = z.object({
  cards: z.array(creditCardPublicSchema),
});

export type CreditCardsListResponse = z.infer<typeof creditCardsListResponseSchema>;

export const creditCardFundBodySchema = z.object({
  amountCents: z.coerce.number().int().min(1).max(100_000_000),
});

export type CreditCardFundBody = z.infer<typeof creditCardFundBodySchema>;

export const creditCardWithdrawBodySchema = creditCardFundBodySchema;

export type CreditCardWithdrawBody = z.infer<typeof creditCardWithdrawBodySchema>;
