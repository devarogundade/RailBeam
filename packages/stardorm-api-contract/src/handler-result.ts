import { z } from "zod";

/** Outcome after a wallet-signed handler CTA (transfer, swap, …). */
export const chatHandlerWalletTxResultSchema = z.object({
  kind: z.literal("wallet_tx"),
  status: z.enum(["submitted", "confirmed", "failed"]),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  error: z.string().max(2000).optional(),
  network: z.string().min(1).max(64).optional(),
  chainId: z.number().int().positive().optional(),
  handler: z.string().min(1).max(64).optional(),
  updatedAt: z.number().int().positive(),
});

export type ChatHandlerWalletTxResult = z.infer<typeof chatHandlerWalletTxResultSchema>;

/** Outcome after `execute-handler` (server job, checkout created, draft recorded, …). */
export const chatHandlerServerResultSchema = z.object({
  kind: z.literal("server"),
  status: z.enum(["completed", "failed"]).default("completed"),
  data: z.record(z.string(), z.unknown()).optional(),
  updatedAt: z.number().int().positive(),
});

export type ChatHandlerServerResult = z.infer<typeof chatHandlerServerResultSchema>;

export const chatHandlerResultSchema = z.discriminatedUnion("kind", [
  chatHandlerWalletTxResultSchema,
  chatHandlerServerResultSchema,
]);

export type ChatHandlerResult = z.infer<typeof chatHandlerResultSchema>;

export const patchChatMessageResultBodySchema = z.object({
  result: chatHandlerResultSchema,
});

export type PatchChatMessageResultBody = z.infer<typeof patchChatMessageResultBodySchema>;

export const patchChatMessageResultResponseSchema = z.object({
  ok: z.literal(true),
  messageId: z.string().min(1),
  result: chatHandlerResultSchema,
  rich: z
    .object({
      type: z.literal("tx"),
      title: z.string(),
      rows: z
        .array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type PatchChatMessageResultResponse = z.infer<
  typeof patchChatMessageResultResponseSchema
>;
