import { z } from "zod";
import { handlerActionIdSchema } from "./handlers.js";

export const stardormChatRichRowSchema = z.object({
  label: z.string(),
  value: z.string(),
});

/** One selectable asset row for the x402 checkout form rich block. */
export const x402SupportedAssetSchema = z.object({
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(32),
  icon: z.string().min(1).max(512),
  decimals: z.number().int().min(0).max(36),
  address: z.string().min(1).max(66),
  usdValue: z.number().finite().nonnegative().optional(),
});

export type X402SupportedAsset = z.infer<typeof x402SupportedAssetSchema>;

const stardormChatRichRows = z.array(stardormChatRichRowSchema).max(32).optional();

export const stardormChatRichBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("report"),
    title: z.string().min(1),
    rows: stardormChatRichRows,
  }),
  z.object({
    type: z.literal("invoice"),
    title: z.string().min(1),
    rows: stardormChatRichRows,
  }),
  z.object({
    type: z.literal("tx"),
    title: z.string().min(1),
    rows: stardormChatRichRows,
  }),
  z.object({
    type: z.literal("x402_checkout_form"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2000).optional(),
    /** Paywalled HTTP resource URL for x402 clients (optional). */
    resourceUrl: z.string().url().max(2048).optional(),
    supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
    networks: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          label: z.string().min(1).max(120),
        }),
      )
      .max(16)
      .optional(),
  }),
  z.object({
    type: z.literal("on_ramp_checkout_form"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2000).optional(),
    supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
    networks: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          label: z.string().min(1).max(120),
        }),
      )
      .max(16)
      .optional(),
  }),
  z.object({
    type: z.literal("credit_card"),
    title: z.string().min(1),
    rows: stardormChatRichRows,
  }),
]);

export type StardormChatRichBlock = z.infer<typeof stardormChatRichBlockSchema>;

export const stardormChatJsonBodySchema = z.object({
  message: z.string().min(1),
});

export type StardormChatJsonBody = z.infer<typeof stardormChatJsonBodySchema>;

export const stardormChatStructuredSchema = z.object({
  text: z.string(),
  handler: handlerActionIdSchema.optional(),
  params: z.unknown().optional(),
});

export const stardormChatComputeSchema = z.object({
  model: z.string(),
  verified: z.boolean(),
  chatId: z.string().optional(),
  provider: z.string(),
  computeNetwork: z.string(),
});

export const stardormChatAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  mimeType: z.string(),
  hash: z.string().min(1),
  size: z.string().optional(),
});

export type StardormChatAttachment = z.infer<typeof stardormChatAttachmentSchema>;

export const stardormChatSuccessSchema = z.object({
  agentKey: z.string().min(1),
  reply: z.string(),
  structured: stardormChatStructuredSchema.optional(),
  /** Structured card rows for the client (model or server-generated). */
  rich: stardormChatRichBlockSchema.optional(),
  /** Files the server uploaded to 0G Storage from the user's chat turn (echoed for immediate render). */
  attachments: z.array(stardormChatAttachmentSchema).optional(),
  compute: stardormChatComputeSchema,
});

export type StardormChatSuccess = z.infer<typeof stardormChatSuccessSchema>;

export const stardormChatClientErrorSchema = z.object({
  error: z.string().min(1),
});

export const stardormChatClientResultSchema = z.union([
  stardormChatSuccessSchema,
  stardormChatClientErrorSchema,
]);

export type StardormChatClientResult = z.infer<typeof stardormChatClientResultSchema>;
