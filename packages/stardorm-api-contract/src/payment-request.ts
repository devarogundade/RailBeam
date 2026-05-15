import { z } from "zod";
import { stardormChatAttachmentSchema } from "./chat-api.js";

const evmTxHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/i, "Invalid transaction hash");

const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid address");

/**
 * Body for POST `/payments/:id/pay`.
 * Either record a broadcast EVM tx (`txHash`), or submit a full x402 `PaymentPayload` for facilitator verify+settle when `X402_FACILITATOR_URL` is configured.
 */
export const paymentSettlementBodySchema = z
  .object({
    txHash: evmTxHashSchema.optional(),
    payerAddress: evmAddressSchema.optional(),
    /** Matches @x402/core `PaymentPayload` (x402Version, accepted, payload, …). */
    x402PaymentPayload: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.txHash && !val.x402PaymentPayload) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide txHash (direct settlement) or x402PaymentPayload (facilitator).",
        path: ["txHash"],
      });
    }
    if (val.txHash && val.x402PaymentPayload) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide only one of txHash or x402PaymentPayload.",
        path: ["txHash"],
      });
    }
  });

export type PaymentSettlementBody = z.infer<typeof paymentSettlementBodySchema>;

export const paymentRequestTypeSchema = z.enum(["on-chain", "x402"]);

export const paymentRequestStatusSchema = z.enum([
  "pending",
  "paid",
  "expired",
  "cancelled",
]);

export const publicPaymentRequestSchema = z.object({
  id: z.string(),
  type: paymentRequestTypeSchema,
  status: paymentRequestStatusSchema,
  title: z.string(),
  description: z.string().optional(),
  asset: z.string(),
  amount: z.string(),
  payTo: z.string(),
  network: z.string(),
  expiresAt: z.string().optional(),
  resourceId: z.string().optional(),
  resourceUrl: z.string().max(2048).optional(),
  decimals: z.number().int().min(0).max(36).optional(),
  x402Payload: z.record(z.string(), z.unknown()).optional(),
  attachment: stardormChatAttachmentSchema.optional(),
  /** Set when status is `paid` (on-chain settlement recorded). */
  txHash: z.string().optional(),
  paidByWallet: z.string().optional(),
  /** When true, checkout can settle via x402 facilitator + wallet-signed payload. */
  facilitatorSettlement: z.boolean().optional(),
});

export type PublicPaymentRequest = z.infer<typeof publicPaymentRequestSchema>;

/** Query for GET `/users/me/payment-requests`. */
export const mePaymentRequestsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** 1-based page index (sorted by `updatedAt` descending). */
  page: z.coerce.number().int().min(1).default(1),
});

export type MePaymentRequestsQuery = z.infer<typeof mePaymentRequestsQuerySchema>;

export const paymentRequestsListResponseSchema = z.object({
  items: z.array(publicPaymentRequestSchema),
  /** Total rows matching the wallet filter (ignores pagination). */
  total: z.number().int().min(0),
});

export type PaymentRequestsListResponse = z.infer<
  typeof paymentRequestsListResponseSchema
>;
