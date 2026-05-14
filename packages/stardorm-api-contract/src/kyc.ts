import { z } from "zod";

/** Stripe Identity–backed lifecycle for a wallet user. */
export const userKycStatusSchema = z.enum([
  "not_started",
  "pending",
  "processing",
  "verified",
  "requires_input",
  "canceled",
]);

export type UserKycStatus = z.infer<typeof userKycStatusSchema>;

export const stripeKycInputSchema = z
  .object({
    /** App path only (e.g. `/chat`); joined with `APP_PUBLIC_URL` for Stripe `return_url`. */
    returnPath: z.string().min(1).max(512).optional(),
  })
  .strict();

export type StripeKycInput = z.infer<typeof stripeKycInputSchema>;

export const userKycStatusDocumentSchema = z.object({
  walletAddress: z.string().min(1),
  status: userKycStatusSchema,
  stripeVerificationSessionId: z.string().optional(),
  lastStripeEventType: z.string().optional(),
  lastError: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type UserKycStatusDocument = z.infer<typeof userKycStatusDocumentSchema>;
