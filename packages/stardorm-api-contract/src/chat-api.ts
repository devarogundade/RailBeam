import { z } from "zod";
import { handlerActionIdSchema } from "./handlers.js";

/**
 * Recursively convert JSON `null` to `undefined` so optional Zod fields accept
 * model output and Mongo payloads (`intro: null` otherwise fails chat parse).
 */
export function stripJsonNulls(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(stripJsonNulls);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const stripped = stripJsonNulls(v);
      if (stripped !== undefined) out[k] = stripped;
    }
    return out;
  }
  return value;
}

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
    type: z.literal("credit_card_checkout_form"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2000).optional(),
    /** Pre-filled ISO 4217 currency in the form (e.g. USD). */
    defaultCurrency: z.string().length(3).optional(),
  }),
  z.object({
    type: z.literal("credit_card"),
    title: z.string().min(1),
    rows: stardormChatRichRows,
  }),
  z.object({
    type: z.literal("swap_checkout_form"),
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
    /** Default V3 fee tier when the form does not override (500, 3000, 10000). */
    defaultPoolFee: z.union([z.literal(500), z.literal(3000), z.literal(10000)]).optional(),
  }),
  z.object({
    type: z.literal("marketplace_hire"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2000).optional(),
    specialistName: z.string().min(1).max(80),
    specialistAgentKey: z.string().min(1).max(64),
    category: z
      .enum(["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"])
      .optional(),
    capability: z.string().min(1).max(400).optional(),
    userTask: z.string().max(500).optional(),
    /** App path to open the marketplace (default `/marketplace`). */
    marketplacePath: z.string().min(1).max(256).default("/marketplace"),
    /** App path to the specialist profile when known (e.g. `/agents/chain-2`). */
    agentProfilePath: z.string().min(1).max(256).optional(),
    requiredHandler: z.string().min(1).max(64).optional(),
  }),
  z.object({
    type: z.literal("transfer_checkout_form"),
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
    defaultTo: z.string().max(66).optional(),
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

/** JSON APIs sometimes emit `null` for omitted optional fields. */
function nullishOptional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === null ? undefined : v), schema);
}

const stardormChatSuccessObjectSchema = z.object({
  agentKey: z.string().min(1),
  reply: z.string(),
  structured: nullishOptional(stardormChatStructuredSchema.optional()),
  /** Structured card rows for the client (model or server-generated). */
  rich: nullishOptional(stardormChatRichBlockSchema.optional()),
  /** Files the server uploaded to 0G Storage from the user's chat turn (echoed for immediate render). */
  attachments: nullishOptional(
    z.array(stardormChatAttachmentSchema).optional(),
  ),
  compute: stardormChatComputeSchema,
});

export const stardormChatSuccessSchema = z.preprocess(
  (v) => (v != null && typeof v === "object" ? stripJsonNulls(v) : v),
  stardormChatSuccessObjectSchema,
);

export type StardormChatSuccess = z.infer<typeof stardormChatSuccessObjectSchema>;

export const stardormChatClientErrorSchema = z.object({
  error: z.string().min(1),
});

export const stardormChatClientResultSchema = z.union([
  stardormChatSuccessSchema,
  stardormChatClientErrorSchema,
]);

export type StardormChatClientResult = z.infer<typeof stardormChatClientResultSchema>;
