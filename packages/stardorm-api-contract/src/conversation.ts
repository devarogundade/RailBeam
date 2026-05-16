import { z } from "zod";
import { handlerActionIdSchema } from "./handlers.js";
import { stripJsonNulls, stardormChatRichBlockSchema } from "./chat-api.js";
import { chatHandlerResultSchema } from "./handler-result.js";
import { userKycStatusSchema } from "./kyc.js";

export const chatHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(40),
  /** When omitted, the server uses the user’s active conversation. */
  conversationId: z.string().min(1).optional(),
  /**
   * Opaque cursor from the previous response’s `nextCursorOlder` — loads older messages
   * than the oldest message in the last batch (prepends chronologically in the client).
   */
  cursor: z.string().min(1).optional(),
});

export type ChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>;

export const chatHistoryAttachmentSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  name: z.string(),
  hash: z.string(),
  size: z.string().optional(),
});

export const chatHistoryHandlerCtaSchema = z.object({
  handler: handlerActionIdSchema,
  params: z.record(z.unknown()),
});

/** Post-execute affordances derived from handler result (x402 checkout, tax PDF, …). */
export const chatFollowUpSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("x402_checkout"),
    /** App-relative path, e.g. `/pay/<mongoId>`. */
    payPath: z.string().min(1),
    paymentRequestId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("tax_report_pdf"),
    attachmentId: z.string().min(1),
    name: z.string().min(1),
  }),
  z.object({
    kind: z.literal("stripe_on_ramp"),
    checkoutUrl: z.string().url(),
    onRampId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("stripe_identity"),
    verificationUrl: z.string().url(),
    verificationSessionId: z.string().min(1),
    /** Present after webhooks refresh the session; drives chat follow-up CTAs. */
    kycSessionStatus: userKycStatusSchema.optional(),
  }),
  z.object({
    kind: z.literal("credit_card_ready"),
    creditCardId: z.string().min(1),
    /** App path for managing the card balance (e.g. /dashboard). */
    dashboardPath: z.string().min(1),
  }),
]);

export const chatHistoryMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "agent"]),
  agentKey: z.string().optional(),
  content: z.string(),
  createdAt: z.number(),
  attachments: z.array(chatHistoryAttachmentSchema).optional(),
  rich: z
    .preprocess(
      (v) => (v != null && typeof v === "object" ? stripJsonNulls(v) : v),
      stardormChatRichBlockSchema.optional(),
    )
    .optional(),
  handlerCta: chatHistoryHandlerCtaSchema.optional(),
  /** Wallet or server outcome for this bubble (tx hash, checkout ids, …). */
  result: chatHandlerResultSchema.optional(),
  followUp: chatFollowUpSchema.optional(),
  model: z.string().optional(),
  verified: z.boolean().optional(),
  chatId: z.string().optional(),
  provider: z.string().optional(),
});

export const chatHistoryResponseSchema = z.object({
  conversationId: z.string(),
  agentKey: z.string(),
  messages: z.array(chatHistoryMessageSchema),
  /** True when more older messages exist before this batch. */
  hasMoreOlder: z.boolean(),
  /** Pass as `cursor` on the next request to load older messages. */
  nextCursorOlder: z.string().optional(),
});

export type ChatHistoryAttachment = z.infer<typeof chatHistoryAttachmentSchema>;
export type ChatFollowUp = z.infer<typeof chatFollowUpSchema>;
export type ChatHistoryMessage = z.infer<typeof chatHistoryMessageSchema>;
export type ChatHistoryResponse = z.infer<typeof chatHistoryResponseSchema>;

export const conversationSummarySchema = z.object({
  id: z.string().min(1),
  agentKey: z.string().min(1),
  title: z.string().optional(),
  lastMessageAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
});

export const conversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
  /** Opaque cursor from the previous response’s `nextCursor`. */
  cursor: z.string().min(1).optional(),
});

export type ConversationsQuery = z.infer<typeof conversationsQuerySchema>;

export const conversationsPageResponseSchema = z.object({
  conversations: z.array(conversationSummarySchema),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

/** @deprecated Use `conversationsPageResponseSchema` — same shape. */
export const conversationsListResponseSchema = conversationsPageResponseSchema;

export const createConversationBodySchema = z.object({
  title: z.string().max(120).optional(),
  agentKey: z.string().min(1).optional(),
});

export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type ConversationsPageResponse = z.infer<typeof conversationsPageResponseSchema>;
export type ConversationsListResponse = ConversationsPageResponse;
export type CreateConversationBody = z.infer<typeof createConversationBodySchema>;

export const deleteConversationResponseSchema = z.object({
  deleted: z.literal(true),
});

export type DeleteConversationResponse = z.infer<typeof deleteConversationResponseSchema>;
