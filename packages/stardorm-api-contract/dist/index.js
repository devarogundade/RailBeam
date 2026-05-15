'use strict';

var zod = require('zod');

// src/agent.ts
var agentCategorySchema = zod.z.enum([
  "Payments",
  "Taxes",
  "Reports",
  "DeFi",
  "Compliance",
  "General"
]);
var skillHandleSchema = zod.z.object({
  handle: zod.z.string().min(1),
  label: zod.z.string().min(1)
});
var agentAvatarSchema = zod.z.union([
  zod.z.string().url(),
  zod.z.string().regex(/^\/\S+/, "avatar must be a URL or a root-relative path")
]);
var agentSchema = zod.z.object({
  id: zod.z.string().min(1),
  name: zod.z.string().min(1),
  handle: zod.z.string().min(1),
  avatar: agentAvatarSchema,
  category: agentCategorySchema,
  tagline: zod.z.string(),
  description: zod.z.string(),
  /** From on-chain feedback / analytics when wired; omit if unknown. */
  rating: zod.z.number().min(0).max(5).optional(),
  reviews: zod.z.number().int().nonnegative().optional(),
  hires: zod.z.number().int().nonnegative().optional(),
  reputation: zod.z.number().min(0).max(100).optional(),
  /** Estimated from indexer `feePerDay` (wei) when available; omit if unknown. */
  pricePerMonth: zod.z.number().nonnegative().optional(),
  /** Raw `feePerDay` (wei, decimal string) from the subgraph. `subscribe` must send exactly `feePerDay * numDays` wei. */
  feePerDayWei: zod.z.string().regex(/^\d+$/).optional(),
  /** Presence-only when we have a live signal; omit if unknown. */
  online: zod.z.boolean().optional(),
  skills: zod.z.array(zod.z.string()),
  creator: zod.z.string().min(1),
  skillHandles: zod.z.array(skillHandleSchema).optional(),
  chainAgentId: zod.z.number().int().positive().optional(),
  /** From indexer when the token is an ERC-7857 clone of another agent. */
  isCloned: zod.z.boolean().optional(),
  /** Lowercase `0x` registry owner (subgraph); used for “my clone” ownership checks. */
  ownerAddress: zod.z.string().regex(/^0x[a-f0-9]{40}$/).optional(),
  /** Raw on-chain registration string (hex or JSON) for owner-only URI updates. */
  registrationUriRaw: zod.z.string().optional()
});
var agentsListSchema = zod.z.array(agentSchema).nonempty();
var catalogResponseSchema = zod.z.object({
  agents: agentsListSchema,
  categories: zod.z.array(agentCategorySchema),
  defaultHiredIds: zod.z.array(zod.z.string().min(1)),
  chatSuggestions: zod.z.array(zod.z.string())
});

// src/catalog-marketplace-response.ts
var CHAT_SUGGESTIONS = [
  "Summarize last month\u2019s onchain P&L",
  "Draft an invoice for Acme Labs",
  "What are the best stablecoin yields right now?",
  "Estimate my crypto tax exposure for Q3",
  "Create an x402 checkout link I can send to a payer",
  "Help me buy stablecoins on 0G with a card",
  "Start identity verification for my account",
  "Create a virtual payment card with my billing address"
];
var DEFAULT_HIRED_IDS = ["beam-default"];
var ALL_CATEGORIES = [
  "Payments",
  "Taxes",
  "Reports",
  "DeFi",
  "Compliance",
  "General"
];
var BEAM_DEFAULT_AGENT = {
  id: "beam-default",
  name: "Beam",
  handle: "beam.0g",
  avatar: "/images/beam.png",
  category: "General",
  tagline: "Your default conversational agent",
  description: "Beam routes your prompts to the best hired agent and handles general financial questions.",
  skills: ["Routing", "General Q&A", "Wallet"],
  creator: "Beam",
  chainAgentId: 1
};
function buildStardormCatalogResponse() {
  return catalogResponseSchema.parse({
    agents: [BEAM_DEFAULT_AGENT],
    categories: [...ALL_CATEGORIES],
    defaultHiredIds: [...DEFAULT_HIRED_IDS],
    chatSuggestions: [...CHAT_SUGGESTIONS]
  });
}

// src/catalog-build.ts
function resolveStardormChainAgentId(agentKey) {
  const trimmed = agentKey.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (/^beam-default$/i.test(trimmed)) return 1;
  const m = /^chain-(\d+)$/i.exec(trimmed);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}
function resolveStardormAgentKey(chainAgentId) {
  const n = typeof chainAgentId === "string" ? Number.parseInt(chainAgentId, 10) : Number(chainAgentId);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n === 1) return "beam-default";
  return `chain-${n}`;
}
var authChallengeBodySchema = zod.z.object({
  walletAddress: zod.z.string().min(1)
});
var authChallengeResponseSchema = zod.z.object({
  message: zod.z.string().min(1)
});
var authVerifyBodySchema = zod.z.object({
  walletAddress: zod.z.string().min(1),
  message: zod.z.string().min(1),
  signature: zod.z.string().min(1)
});
var authVerifyResponseSchema = zod.z.object({
  accessToken: zod.z.string().min(1)
});
var authMeResponseSchema = zod.z.object({
  walletAddress: zod.z.string().min(1)
});
var HANDLER_ACTION_IDS = [
  "generate_tax_report",
  "create_x402_payment",
  /** Fiat checkout via Stripe; webhook fulfills ERC-20 transfer from treasury key. */
  "on_ramp_tokens",
  /** Stripe Identity hosted verification for the signed-in wallet user. */
  "complete_stripe_kyc",
  /** Issue a virtual payment card record with billing profile and spend balance. */
  "create_credit_card",
  /** PDF + structured snapshot: payment requests, on-ramps, cards, KYC for this wallet. */
  "generate_payment_invoice",
  /** Summary report across payment requests, on-ramps, virtual cards, and KYC status. */
  "generate_financial_activity_report",
  /** Confirms a native (gas token) transfer draft; user signs in their wallet / Beam Send. */
  "draft_native_transfer",
  /** Confirms an ERC-20 transfer draft; user signs in their wallet / Beam Send. */
  "draft_erc20_transfer",
  /** Confirms an NFT (ERC-721 / ERC-1155) transfer draft; user signs in their wallet / Beam Send. */
  "draft_nft_transfer"
];
function isHandlerActionId(id) {
  return HANDLER_ACTION_IDS.includes(id);
}
var handlerActionIdSchema = zod.z.enum(HANDLER_ACTION_IDS);
var handlersListResponseSchema = zod.z.object({
  handlers: zod.z.array(handlerActionIdSchema)
});
var storageUploadBodySchema = zod.z.object({
  content: zod.z.string().min(1)
});
var storageUploadResponseSchema = zod.z.object({
  rootHash: zod.z.string().min(1),
  txHash: zod.z.string().optional()
});
var stardormChatRichRowSchema = zod.z.object({
  label: zod.z.string(),
  value: zod.z.string()
});
var x402SupportedAssetSchema = zod.z.object({
  name: zod.z.string().min(1).max(64),
  symbol: zod.z.string().min(1).max(32),
  icon: zod.z.string().min(1).max(512),
  decimals: zod.z.number().int().min(0).max(36),
  address: zod.z.string().min(1).max(66),
  usdValue: zod.z.number().finite().nonnegative().optional()
});
var stardormChatRichRows = zod.z.array(stardormChatRichRowSchema).max(32).optional();
var stardormChatRichBlockSchema = zod.z.discriminatedUnion("type", [
  zod.z.object({
    type: zod.z.literal("report"),
    title: zod.z.string().min(1),
    rows: stardormChatRichRows
  }),
  zod.z.object({
    type: zod.z.literal("invoice"),
    title: zod.z.string().min(1),
    rows: stardormChatRichRows
  }),
  zod.z.object({
    type: zod.z.literal("tx"),
    title: zod.z.string().min(1),
    rows: stardormChatRichRows
  }),
  zod.z.object({
    type: zod.z.literal("x402_checkout_form"),
    title: zod.z.string().min(1).max(200),
    intro: zod.z.string().max(2e3).optional(),
    /** Paywalled HTTP resource URL for x402 clients (optional). */
    resourceUrl: zod.z.string().url().max(2048).optional(),
    supportedAssets: zod.z.array(x402SupportedAssetSchema).min(1).max(24),
    networks: zod.z.array(
      zod.z.object({
        id: zod.z.string().min(1).max(64),
        label: zod.z.string().min(1).max(120)
      })
    ).max(16).optional()
  }),
  zod.z.object({
    type: zod.z.literal("on_ramp_checkout_form"),
    title: zod.z.string().min(1).max(200),
    intro: zod.z.string().max(2e3).optional(),
    supportedAssets: zod.z.array(x402SupportedAssetSchema).min(1).max(24),
    networks: zod.z.array(
      zod.z.object({
        id: zod.z.string().min(1).max(64),
        label: zod.z.string().min(1).max(120)
      })
    ).max(16).optional()
  }),
  zod.z.object({
    type: zod.z.literal("credit_card_checkout_form"),
    title: zod.z.string().min(1).max(200),
    intro: zod.z.string().max(2e3).optional(),
    /** Pre-filled ISO 4217 currency in the form (e.g. USD). */
    defaultCurrency: zod.z.string().length(3).optional()
  }),
  zod.z.object({
    type: zod.z.literal("credit_card"),
    title: zod.z.string().min(1),
    rows: stardormChatRichRows
  })
]);
var stardormChatJsonBodySchema = zod.z.object({
  message: zod.z.string().min(1)
});
var stardormChatStructuredSchema = zod.z.object({
  text: zod.z.string(),
  handler: handlerActionIdSchema.optional(),
  params: zod.z.unknown().optional()
});
var stardormChatComputeSchema = zod.z.object({
  model: zod.z.string(),
  verified: zod.z.boolean(),
  chatId: zod.z.string().optional(),
  provider: zod.z.string(),
  computeNetwork: zod.z.string()
});
var stardormChatAttachmentSchema = zod.z.object({
  id: zod.z.string().min(1),
  name: zod.z.string(),
  mimeType: zod.z.string(),
  hash: zod.z.string().min(1),
  size: zod.z.string().optional()
});
var stardormChatSuccessSchema = zod.z.object({
  agentKey: zod.z.string().min(1),
  reply: zod.z.string(),
  structured: stardormChatStructuredSchema.optional(),
  /** Structured card rows for the client (model or server-generated). */
  rich: stardormChatRichBlockSchema.optional(),
  /** Files the server uploaded to 0G Storage from the user's chat turn (echoed for immediate render). */
  attachments: zod.z.array(stardormChatAttachmentSchema).optional(),
  compute: stardormChatComputeSchema
});
var stardormChatClientErrorSchema = zod.z.object({
  error: zod.z.string().min(1)
});
var stardormChatClientResultSchema = zod.z.union([
  stardormChatSuccessSchema,
  stardormChatClientErrorSchema
]);

// src/user.ts
var userAvatarPresetSchema = zod.z.enum(["male", "female"]);
var userPreferencesSchema = zod.z.object({
  autoRoutePrompts: zod.z.boolean(),
  onchainReceipts: zod.z.boolean(),
  emailNotifications: zod.z.boolean(),
  avatarPreset: userAvatarPresetSchema.default("male")
});
var publicUserSchema = zod.z.object({
  id: zod.z.string().min(1),
  walletAddress: zod.z.string().min(1),
  displayName: zod.z.string().optional(),
  email: zod.z.string().optional(),
  activeAgentId: zod.z.string().min(1),
  /** Selected chat thread id when multi-conversation is enabled. */
  activeConversationId: zod.z.string().min(1).optional(),
  preferences: userPreferencesSchema,
  lastLoginAt: zod.z.coerce.date().optional(),
  createdAt: zod.z.coerce.date().optional(),
  updatedAt: zod.z.coerce.date().optional()
});
var updateUserBodySchema = zod.z.object({
  displayName: zod.z.string().optional(),
  email: zod.z.string().nullable().optional(),
  activeAgentId: zod.z.string().optional(),
  activeConversationId: zod.z.string().nullable().optional(),
  preferences: userPreferencesSchema.partial().optional()
});
var userUploadResultSchema = zod.z.object({
  rootHash: zod.z.string().min(1),
  txHash: zod.z.string().optional(),
  originalName: zod.z.string(),
  mimeType: zod.z.string(),
  size: zod.z.number().int().nonnegative()
});
var executeHandlerBodySchema = zod.z.object({
  handler: handlerActionIdSchema,
  params: zod.z.unknown().optional(),
  /** Mongo id of the chat message that displayed the handler CTA (required). */
  ctaMessageId: zod.z.string().min(1)
});
var handlerAttachmentSchema = zod.z.object({
  rootHash: zod.z.string(),
  mimeType: zod.z.string(),
  name: zod.z.string()
});
var executeHandlerResponseSchema = zod.z.object({
  message: zod.z.string(),
  attachments: zod.z.array(handlerAttachmentSchema).optional(),
  data: zod.z.record(zod.z.string(), zod.z.unknown()).optional(),
  rich: stardormChatRichBlockSchema.optional()
});
var chatHistoryQuerySchema = zod.z.object({
  limit: zod.z.coerce.number().int().min(1).max(100).default(40),
  /** When omitted, the server uses the user’s active conversation. */
  conversationId: zod.z.string().min(1).optional(),
  /**
   * Opaque cursor from the previous response’s `nextCursorOlder` — loads older messages
   * than the oldest message in the last batch (prepends chronologically in the client).
   */
  cursor: zod.z.string().min(1).optional()
});
var chatHistoryAttachmentSchema = zod.z.object({
  id: zod.z.string(),
  mimeType: zod.z.string(),
  name: zod.z.string(),
  hash: zod.z.string(),
  size: zod.z.string().optional()
});
var chatHistoryHandlerCtaSchema = zod.z.object({
  handler: handlerActionIdSchema,
  params: zod.z.record(zod.z.unknown())
});
var chatFollowUpSchema = zod.z.discriminatedUnion("kind", [
  zod.z.object({
    kind: zod.z.literal("x402_checkout"),
    /** App-relative path, e.g. `/pay/<mongoId>`. */
    payPath: zod.z.string().min(1),
    paymentRequestId: zod.z.string().min(1)
  }),
  zod.z.object({
    kind: zod.z.literal("tax_report_pdf"),
    attachmentId: zod.z.string().min(1),
    name: zod.z.string().min(1)
  }),
  zod.z.object({
    kind: zod.z.literal("stripe_on_ramp"),
    checkoutUrl: zod.z.string().url(),
    onRampId: zod.z.string().min(1)
  }),
  zod.z.object({
    kind: zod.z.literal("stripe_identity"),
    verificationUrl: zod.z.string().url(),
    verificationSessionId: zod.z.string().min(1)
  }),
  zod.z.object({
    kind: zod.z.literal("credit_card_ready"),
    creditCardId: zod.z.string().min(1),
    /** App path for managing the card balance (e.g. /dashboard). */
    dashboardPath: zod.z.string().min(1)
  })
]);
var chatHistoryMessageSchema = zod.z.object({
  id: zod.z.string(),
  role: zod.z.enum(["user", "agent"]),
  agentKey: zod.z.string().optional(),
  content: zod.z.string(),
  createdAt: zod.z.number(),
  attachments: zod.z.array(chatHistoryAttachmentSchema).optional(),
  rich: stardormChatRichBlockSchema.optional(),
  handlerCta: chatHistoryHandlerCtaSchema.optional(),
  followUp: chatFollowUpSchema.optional(),
  model: zod.z.string().optional(),
  verified: zod.z.boolean().optional(),
  chatId: zod.z.string().optional(),
  provider: zod.z.string().optional()
});
var chatHistoryResponseSchema = zod.z.object({
  conversationId: zod.z.string(),
  agentKey: zod.z.string(),
  messages: zod.z.array(chatHistoryMessageSchema),
  /** True when more older messages exist before this batch. */
  hasMoreOlder: zod.z.boolean(),
  /** Pass as `cursor` on the next request to load older messages. */
  nextCursorOlder: zod.z.string().optional()
});
var conversationSummarySchema = zod.z.object({
  id: zod.z.string().min(1),
  agentKey: zod.z.string().min(1),
  title: zod.z.string().optional(),
  lastMessageAt: zod.z.coerce.date(),
  createdAt: zod.z.coerce.date().optional()
});
var conversationsQuerySchema = zod.z.object({
  limit: zod.z.coerce.number().int().min(1).max(50).default(25),
  /** Opaque cursor from the previous response’s `nextCursor`. */
  cursor: zod.z.string().min(1).optional()
});
var conversationsPageResponseSchema = zod.z.object({
  conversations: zod.z.array(conversationSummarySchema),
  hasMore: zod.z.boolean(),
  nextCursor: zod.z.string().optional()
});
var conversationsListResponseSchema = conversationsPageResponseSchema;
var createConversationBodySchema = zod.z.object({
  title: zod.z.string().max(120).optional(),
  agentKey: zod.z.string().min(1).optional()
});
var deleteConversationResponseSchema = zod.z.object({
  deleted: zod.z.literal(true)
});
var conversationSyncThreadSchema = zod.z.object({
  v: zod.z.literal(1),
  op: zod.z.literal("thread"),
  conversationId: zod.z.string().min(1)
});
var conversationSyncThreadMessagesSchema = zod.z.object({
  v: zod.z.literal(1),
  op: zod.z.literal("thread_messages"),
  conversationId: zod.z.string().min(1),
  messages: zod.z.array(chatHistoryMessageSchema).min(1)
});
var conversationSyncConversationsSchema = zod.z.object({
  v: zod.z.literal(1),
  op: zod.z.literal("conversations")
});
var conversationSyncConversationDeletedSchema = zod.z.object({
  v: zod.z.literal(1),
  op: zod.z.literal("conversation_deleted"),
  conversationId: zod.z.string().min(1)
});
var conversationSyncPayloadSchema = zod.z.discriminatedUnion("op", [
  conversationSyncThreadSchema,
  conversationSyncThreadMessagesSchema,
  conversationSyncConversationsSchema,
  conversationSyncConversationDeletedSchema
]);
var agentOnchainFeedbackItemSchema = zod.z.object({
  id: zod.z.string(),
  agentId: zod.z.number(),
  clientAddress: zod.z.string(),
  feedbackIndex: zod.z.string(),
  value: zod.z.string(),
  valueDecimals: zod.z.number().int().min(0).max(18),
  tag1: zod.z.string(),
  tag2: zod.z.string(),
  endpoint: zod.z.string(),
  feedbackURI: zod.z.string(),
  feedbackHash: zod.z.string(),
  revoked: zod.z.boolean(),
  blockNumber: zod.z.number(),
  blockTimestamp: zod.z.number(),
  transactionHash: zod.z.string()
});
var agentFeedbacksQuerySchema = zod.z.object({
  limit: zod.z.union([zod.z.string(), zod.z.number()]).optional().transform((v) => {
    if (v === void 0) return 20;
    const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
    if (!Number.isFinite(n)) return 20;
    return Math.min(50, Math.max(1, Math.trunc(n)));
  }),
  skip: zod.z.union([zod.z.string(), zod.z.number()]).optional().transform((v) => {
    if (v === void 0) return 0;
    const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.trunc(n));
  })
});
var agentFeedbacksPageResponseSchema = zod.z.object({
  feedbacks: zod.z.array(agentOnchainFeedbackItemSchema),
  page: zod.z.object({
    limit: zod.z.number().int().min(1).max(50),
    skip: zod.z.number().int().min(0),
    hasMore: zod.z.boolean()
  })
});
var evmTxHashSchema = zod.z.string().regex(/^0x[a-fA-F0-9]{64}$/i, "Invalid transaction hash");
var evmAddressSchema = zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid address");
var paymentSettlementBodySchema = zod.z.object({
  txHash: evmTxHashSchema.optional(),
  payerAddress: evmAddressSchema.optional(),
  /** Matches @x402/core `PaymentPayload` (x402Version, accepted, payload, …). */
  x402PaymentPayload: zod.z.record(zod.z.string(), zod.z.unknown()).optional()
}).superRefine((val, ctx) => {
  if (!val.txHash && !val.x402PaymentPayload) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "Provide txHash (direct settlement) or x402PaymentPayload (facilitator).",
      path: ["txHash"]
    });
  }
  if (val.txHash && val.x402PaymentPayload) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "Provide only one of txHash or x402PaymentPayload.",
      path: ["txHash"]
    });
  }
});
var paymentRequestTypeSchema = zod.z.enum(["on-chain", "x402"]);
var paymentRequestStatusSchema = zod.z.enum([
  "pending",
  "paid",
  "expired",
  "cancelled"
]);
var publicPaymentRequestSchema = zod.z.object({
  id: zod.z.string(),
  type: paymentRequestTypeSchema,
  status: paymentRequestStatusSchema,
  title: zod.z.string(),
  description: zod.z.string().optional(),
  asset: zod.z.string(),
  amount: zod.z.string(),
  payTo: zod.z.string(),
  network: zod.z.string(),
  expiresAt: zod.z.string().optional(),
  resourceId: zod.z.string().optional(),
  resourceUrl: zod.z.string().max(2048).optional(),
  decimals: zod.z.number().int().min(0).max(36).optional(),
  x402Payload: zod.z.record(zod.z.string(), zod.z.unknown()).optional(),
  attachment: stardormChatAttachmentSchema.optional(),
  /** Set when status is `paid` (on-chain settlement recorded). */
  txHash: zod.z.string().optional(),
  paidByWallet: zod.z.string().optional()
});
var mePaymentRequestsQuerySchema = zod.z.object({
  limit: zod.z.coerce.number().int().min(1).max(50).default(20)
});
var paymentRequestsListResponseSchema = zod.z.object({
  items: zod.z.array(publicPaymentRequestSchema)
});
var onRampFormNetworkOptionSchema = zod.z.object({
  id: zod.z.string().min(1).max(64),
  label: zod.z.string().min(1).max(120)
});
var onRampFormCtaParamsSchema = zod.z.object({
  _onRampForm: zod.z.literal(true),
  supportedAssets: zod.z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: zod.z.array(onRampFormNetworkOptionSchema).max(16).optional(),
  intro: zod.z.string().max(2e3).optional()
});
function isOnRampFormCtaParams(v) {
  return onRampFormCtaParamsSchema.safeParse(v).success;
}
var weiString = zod.z.union([
  zod.z.string().trim().regex(
    /^[1-9]\d*$/,
    "tokenAmountWei must be base units (positive integer string, no decimals)"
  ),
  zod.z.number().int().positive().transform((n) => String(n))
]);
var evmAddr = zod.z.string().min(1).refine(
  (s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()),
  "must be a 0x-prefixed 20-byte address"
).transform((s) => s.trim().toLowerCase());
var onRampTokensInputSchema = zod.z.object({
  recipientWallet: evmAddr,
  network: zod.z.string().min(1).max(64),
  tokenAddress: evmAddr,
  tokenDecimals: zod.z.number().int().min(0).max(36),
  tokenSymbol: zod.z.string().min(1).max(32),
  tokenAmountWei: weiString,
  /** Optional spot reference for analytics / UI (per supported token). */
  usdValue: zod.z.number().finite().nonnegative().optional(),
  /** Total USD charged via Stripe (cents). Minimum $1.00. */
  usdAmountCents: zod.z.number().int().min(100).max(1e7)
});
var onRampRecordStatusSchema = zod.z.enum([
  "pending_checkout",
  "pending_payment",
  "paid_pending_transfer",
  "fulfilled",
  "failed",
  "canceled"
]);
var onRampRecordSchema = zod.z.object({
  id: zod.z.string().min(1),
  status: onRampRecordStatusSchema,
  walletAddress: zod.z.string().min(1),
  recipientWallet: zod.z.string().min(1),
  network: zod.z.string().min(1),
  tokenAddress: zod.z.string().min(1),
  tokenDecimals: zod.z.number().int().min(0).max(36),
  tokenSymbol: zod.z.string().min(1),
  tokenAmountWei: zod.z.string().min(1),
  usdAmountCents: zod.z.number().int().nonnegative(),
  usdValue: zod.z.number().finite().nonnegative().optional(),
  stripeCheckoutSessionId: zod.z.string().optional(),
  stripePaymentIntentId: zod.z.string().optional(),
  fulfillmentTxHash: zod.z.string().optional(),
  errorMessage: zod.z.string().optional(),
  createdAt: zod.z.coerce.date().optional(),
  updatedAt: zod.z.coerce.date().optional()
});
var meOnRampsQuerySchema = zod.z.object({
  limit: zod.z.coerce.number().int().min(1).max(50).default(20)
});
var onRampsListResponseSchema = zod.z.object({
  items: zod.z.array(onRampRecordSchema)
});
var userKycStatusSchema = zod.z.enum([
  "not_started",
  "pending",
  "processing",
  "verified",
  "requires_input",
  "canceled"
]);
var stripeKycInputSchema = zod.z.object({
  /** App path + query (e.g. `/` or `/?conversation=<id>`); joined with `APP_PUBLIC_URL` for Stripe `return_url`. */
  returnPath: zod.z.string().min(1).max(512).optional()
}).strict();
var userKycStatusDocumentSchema = zod.z.object({
  walletAddress: zod.z.string().min(1),
  status: userKycStatusSchema,
  stripeVerificationSessionId: zod.z.string().optional(),
  lastStripeEventType: zod.z.string().optional(),
  lastError: zod.z.string().optional(),
  createdAt: zod.z.coerce.date().optional(),
  updatedAt: zod.z.coerce.date().optional()
});
var createCreditCardInputSchema = zod.z.object({
  firstName: zod.z.string().trim().min(1).max(80),
  lastName: zod.z.string().trim().min(1).max(80),
  line1: zod.z.string().trim().min(1).max(120),
  line2: zod.z.string().trim().max(120).optional(),
  city: zod.z.string().trim().min(1).max(80),
  region: zod.z.string().trim().min(1).max(80),
  postalCode: zod.z.string().trim().min(1).max(20),
  countryCode: zod.z.string().trim().length(2).transform((c) => c.toUpperCase()),
  cardLabel: zod.z.string().trim().min(1).max(80).optional(),
  currency: zod.z.string().trim().length(3).transform((c) => c.toUpperCase()).optional(),
  /** Opening balance in minor units (e.g. USD cents). */
  initialBalanceCents: zod.z.coerce.number().int().min(0).max(1e8).optional()
});
var creditCardFormCtaParamsSchema = zod.z.object({
  _creditCardForm: zod.z.literal(true),
  intro: zod.z.string().max(2e3).optional(),
  defaultCurrency: zod.z.string().trim().length(3).transform((c) => c.toUpperCase()).optional()
});
function isCreditCardFormCtaParams(v) {
  return creditCardFormCtaParamsSchema.safeParse(v).success;
}
var creditCardPublicSchema = zod.z.object({
  id: zod.z.string().min(1),
  firstName: zod.z.string(),
  lastName: zod.z.string(),
  cardLabel: zod.z.string().optional(),
  line1: zod.z.string(),
  line2: zod.z.string().optional(),
  city: zod.z.string(),
  region: zod.z.string(),
  postalCode: zod.z.string(),
  countryCode: zod.z.string(),
  currency: zod.z.string(),
  balanceCents: zod.z.number().int().nonnegative(),
  last4: zod.z.string(),
  networkBrand: zod.z.string(),
  status: zod.z.enum(["active", "frozen"]),
  createdAt: zod.z.coerce.date().optional(),
  updatedAt: zod.z.coerce.date().optional(),
  /** Present on some `POST …/withdraw` responses when native 0G was sent from the treasury. */
  lastWithdrawTxHash: zod.z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
});
var creditCardSensitiveDetailsSchema = zod.z.object({
  cardId: zod.z.string().min(1),
  pan: zod.z.string().regex(/^\d{16}$/),
  expiryMonth: zod.z.coerce.number().int().min(1).max(12),
  expiryYear: zod.z.coerce.number().int().min(2e3).max(2100),
  cvv: zod.z.string().regex(/^\d{3,4}$/)
});
var creditCardsListResponseSchema = zod.z.object({
  cards: zod.z.array(creditCardPublicSchema)
});
var creditCardFundBodySchema = zod.z.object({
  amountCents: zod.z.coerce.number().int().min(1).max(1e8),
  fundingTxHash: zod.z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  fundingChainId: zod.z.coerce.number().int().positive().optional()
}).refine(
  (d) => d.fundingTxHash == null && d.fundingChainId == null || d.fundingTxHash != null && d.fundingChainId != null,
  {
    message: "fundingTxHash and fundingChainId must both be provided or both omitted",
    path: ["fundingTxHash"]
  }
);
var creditCardFundQuoteQuerySchema = zod.z.object({
  amountCents: zod.z.coerce.number().int().min(1).max(1e8)
});
var creditCardFundQuoteOffChainSchema = zod.z.object({
  onchainFundingRequired: zod.z.literal(false)
});
var creditCardFundQuoteOnChainSchema = zod.z.object({
  onchainFundingRequired: zod.z.literal(true),
  chainId: zod.z.number().int(),
  recipient: zod.z.string().min(1),
  minNativeWei: zod.z.string().regex(/^\d+$/),
  usdValue: zod.z.number().finite().positive(),
  nativeSymbol: zod.z.string().min(1),
  nativeDecimals: zod.z.number().int().min(0).max(18)
});
var creditCardFundQuoteResponseSchema = zod.z.discriminatedUnion(
  "onchainFundingRequired",
  [creditCardFundQuoteOffChainSchema, creditCardFundQuoteOnChainSchema]
);
var creditCardWithdrawBodySchema = zod.z.object({
  amountCents: zod.z.coerce.number().int().min(1).max(1e8)
});
var billingDatePartSchema = zod.z.object({
  year: zod.z.number().int().min(2020).max(2036),
  month: zod.z.number().int().min(1).max(12),
  day: zod.z.number().int().min(1).max(31)
});
function billingDatePartToUtc(p) {
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}
function billingRangeEndOfDay(p) {
  const d = billingDatePartToUtc(p);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
function billingPeriodBounds(input) {
  return {
    from: input.from ? billingDatePartToUtc(input.from) : void 0,
    to: input.to ? billingRangeEndOfDay(input.to) : void 0
  };
}
var generatePaymentInvoiceInputSchema = zod.z.object({
  from: billingDatePartSchema.optional(),
  to: billingDatePartSchema.optional(),
  invoiceTitle: zod.z.string().trim().min(1).max(120).optional()
}).superRefine((val, ctx) => {
  if (!val.from || !val.to) return;
  const a = billingDatePartToUtc(val.from);
  const b = billingDatePartToUtc(val.to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "Invalid calendar date"
    });
    return;
  }
  if (a > b) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "`from` must be on or before `to`",
      path: ["from"]
    });
  }
});
var generateFinancialActivityReportInputSchema = zod.z.object({
  from: billingDatePartSchema.optional(),
  to: billingDatePartSchema.optional(),
  reportTitle: zod.z.string().trim().min(1).max(120).optional()
}).superRefine((val, ctx) => {
  if (!val.from || !val.to) return;
  const a = billingDatePartToUtc(val.from);
  const b = billingDatePartToUtc(val.to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "Invalid calendar date"
    });
    return;
  }
  if (a > b) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "`from` must be on or before `to`",
      path: ["from"]
    });
  }
});

// src/iso-3166-1-alpha2.ts
var ISO_3166_1_ALPHA2_CODES_RAW = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW";
var ISO_3166_1_ALPHA2_CODES = Object.freeze(
  ISO_3166_1_ALPHA2_CODES_RAW.split(/\s+/)
);
var ISO_3166_1_ALPHA2_SET = new Set(ISO_3166_1_ALPHA2_CODES);
function isIso3166Alpha2(code) {
  const c = code.length === 2 ? code.toUpperCase() : "";
  return ISO_3166_1_ALPHA2_SET.has(c);
}
function isoCountryDisplayName(code, locale = "en") {
  const c = code.length === 2 ? code.toUpperCase() : code;
  try {
    const dn = new Intl.DisplayNames(locale, { type: "region" });
    return dn.of(c) ?? c;
  } catch {
    return c;
  }
}

// src/tax-rate-for-country.ts
var EU27 = /* @__PURE__ */ new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE"
]);
var EEA_NON_EU = /* @__PURE__ */ new Set(["IS", "LI", "NO"]);
var HIGH_TIER_OECD = /* @__PURE__ */ new Set(["AU", "CA", "JP", "KR", "NZ"]);
function taxRateForCountry(country) {
  const c = country.toUpperCase();
  if (c === "US") return 0.22;
  if (c === "GB" || c === "UK") return 0.2;
  if (c === "DE" || c === "FR") return 0.25;
  if (c === "SG") return 0.17;
  if (EU27.has(c)) return 0.24;
  if (EEA_NON_EU.has(c)) return 0.24;
  if (HIGH_TIER_OECD.has(c)) return 0.25;
  return 0.2;
}
var caip2Eip155 = zod.z.string().min(8).max(64).regex(
  /^eip155:\d+$/,
  "network must be CAIP-2 form eip155:<chainId> (e.g. eip155:16602)"
);
var evmAddress20 = zod.z.string().trim().refine(
  (s) => /^0x[a-fA-F0-9]{40}$/.test(s),
  "must be a 0x-prefixed 20-byte EVM address"
).transform((s) => s.trim().toLowerCase());
var positiveWeiString = zod.z.string().trim().regex(
  /^[1-9]\d*$/,
  "must be a positive integer decimal string (base units / wei)"
);
var decimalStringNonNeg = zod.z.string().trim().regex(/^\d+$/, "must be a non-negative integer decimal string");
var nftStandardSchema = zod.z.enum(["erc721", "erc1155"]);
var draftNativeTransferInputSchema = zod.z.object({
  network: caip2Eip155,
  to: evmAddress20,
  valueWei: positiveWeiString,
  note: zod.z.string().max(500).optional()
});
var draftErc20TransferInputSchema = zod.z.object({
  network: caip2Eip155,
  token: evmAddress20,
  tokenSymbol: zod.z.string().min(1).max(32).optional(),
  tokenDecimals: zod.z.number().int().min(0).max(36),
  to: evmAddress20,
  amountWei: positiveWeiString,
  note: zod.z.string().max(500).optional()
});
var draftNftTransferInputSchema = zod.z.object({
  network: caip2Eip155,
  contract: evmAddress20,
  standard: nftStandardSchema.default("erc721"),
  to: evmAddress20,
  tokenId: decimalStringNonNeg,
  /** Required for ERC-1155; omit for ERC-721. */
  amount: positiveWeiString.optional(),
  note: zod.z.string().max(500).optional()
}).superRefine((val, ctx) => {
  if (val.standard === "erc1155") {
    if (!val.amount) {
      ctx.addIssue({
        code: zod.z.ZodIssueCode.custom,
        message: "amount (base units) is required for ERC-1155",
        path: ["amount"]
      });
    }
  } else if (val.amount != null) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "amount must be omitted for ERC-721",
      path: ["amount"]
    });
  }
});

exports.HANDLER_ACTION_IDS = HANDLER_ACTION_IDS;
exports.ISO_3166_1_ALPHA2_CODES = ISO_3166_1_ALPHA2_CODES;
exports.agentAvatarSchema = agentAvatarSchema;
exports.agentCategorySchema = agentCategorySchema;
exports.agentFeedbacksPageResponseSchema = agentFeedbacksPageResponseSchema;
exports.agentFeedbacksQuerySchema = agentFeedbacksQuerySchema;
exports.agentOnchainFeedbackItemSchema = agentOnchainFeedbackItemSchema;
exports.agentSchema = agentSchema;
exports.agentsListSchema = agentsListSchema;
exports.authChallengeBodySchema = authChallengeBodySchema;
exports.authChallengeResponseSchema = authChallengeResponseSchema;
exports.authMeResponseSchema = authMeResponseSchema;
exports.authVerifyBodySchema = authVerifyBodySchema;
exports.authVerifyResponseSchema = authVerifyResponseSchema;
exports.billingDatePartSchema = billingDatePartSchema;
exports.billingDatePartToUtc = billingDatePartToUtc;
exports.billingPeriodBounds = billingPeriodBounds;
exports.billingRangeEndOfDay = billingRangeEndOfDay;
exports.buildStardormCatalogResponse = buildStardormCatalogResponse;
exports.catalogResponseSchema = catalogResponseSchema;
exports.chatFollowUpSchema = chatFollowUpSchema;
exports.chatHistoryAttachmentSchema = chatHistoryAttachmentSchema;
exports.chatHistoryHandlerCtaSchema = chatHistoryHandlerCtaSchema;
exports.chatHistoryMessageSchema = chatHistoryMessageSchema;
exports.chatHistoryQuerySchema = chatHistoryQuerySchema;
exports.chatHistoryResponseSchema = chatHistoryResponseSchema;
exports.conversationSummarySchema = conversationSummarySchema;
exports.conversationSyncConversationDeletedSchema = conversationSyncConversationDeletedSchema;
exports.conversationSyncConversationsSchema = conversationSyncConversationsSchema;
exports.conversationSyncPayloadSchema = conversationSyncPayloadSchema;
exports.conversationSyncThreadMessagesSchema = conversationSyncThreadMessagesSchema;
exports.conversationSyncThreadSchema = conversationSyncThreadSchema;
exports.conversationsListResponseSchema = conversationsListResponseSchema;
exports.conversationsPageResponseSchema = conversationsPageResponseSchema;
exports.conversationsQuerySchema = conversationsQuerySchema;
exports.createConversationBodySchema = createConversationBodySchema;
exports.createCreditCardInputSchema = createCreditCardInputSchema;
exports.creditCardFormCtaParamsSchema = creditCardFormCtaParamsSchema;
exports.creditCardFundBodySchema = creditCardFundBodySchema;
exports.creditCardFundQuoteOffChainSchema = creditCardFundQuoteOffChainSchema;
exports.creditCardFundQuoteOnChainSchema = creditCardFundQuoteOnChainSchema;
exports.creditCardFundQuoteQuerySchema = creditCardFundQuoteQuerySchema;
exports.creditCardFundQuoteResponseSchema = creditCardFundQuoteResponseSchema;
exports.creditCardPublicSchema = creditCardPublicSchema;
exports.creditCardSensitiveDetailsSchema = creditCardSensitiveDetailsSchema;
exports.creditCardWithdrawBodySchema = creditCardWithdrawBodySchema;
exports.creditCardsListResponseSchema = creditCardsListResponseSchema;
exports.deleteConversationResponseSchema = deleteConversationResponseSchema;
exports.draftErc20TransferInputSchema = draftErc20TransferInputSchema;
exports.draftNativeTransferInputSchema = draftNativeTransferInputSchema;
exports.draftNftTransferInputSchema = draftNftTransferInputSchema;
exports.executeHandlerBodySchema = executeHandlerBodySchema;
exports.executeHandlerResponseSchema = executeHandlerResponseSchema;
exports.generateFinancialActivityReportInputSchema = generateFinancialActivityReportInputSchema;
exports.generatePaymentInvoiceInputSchema = generatePaymentInvoiceInputSchema;
exports.handlerActionIdSchema = handlerActionIdSchema;
exports.handlersListResponseSchema = handlersListResponseSchema;
exports.isCreditCardFormCtaParams = isCreditCardFormCtaParams;
exports.isHandlerActionId = isHandlerActionId;
exports.isIso3166Alpha2 = isIso3166Alpha2;
exports.isOnRampFormCtaParams = isOnRampFormCtaParams;
exports.isoCountryDisplayName = isoCountryDisplayName;
exports.meOnRampsQuerySchema = meOnRampsQuerySchema;
exports.mePaymentRequestsQuerySchema = mePaymentRequestsQuerySchema;
exports.onRampFormCtaParamsSchema = onRampFormCtaParamsSchema;
exports.onRampFormNetworkOptionSchema = onRampFormNetworkOptionSchema;
exports.onRampRecordSchema = onRampRecordSchema;
exports.onRampRecordStatusSchema = onRampRecordStatusSchema;
exports.onRampTokensInputSchema = onRampTokensInputSchema;
exports.onRampsListResponseSchema = onRampsListResponseSchema;
exports.paymentRequestStatusSchema = paymentRequestStatusSchema;
exports.paymentRequestTypeSchema = paymentRequestTypeSchema;
exports.paymentRequestsListResponseSchema = paymentRequestsListResponseSchema;
exports.paymentSettlementBodySchema = paymentSettlementBodySchema;
exports.publicPaymentRequestSchema = publicPaymentRequestSchema;
exports.publicUserSchema = publicUserSchema;
exports.resolveStardormAgentKey = resolveStardormAgentKey;
exports.resolveStardormChainAgentId = resolveStardormChainAgentId;
exports.skillHandleSchema = skillHandleSchema;
exports.stardormChatAttachmentSchema = stardormChatAttachmentSchema;
exports.stardormChatClientErrorSchema = stardormChatClientErrorSchema;
exports.stardormChatClientResultSchema = stardormChatClientResultSchema;
exports.stardormChatComputeSchema = stardormChatComputeSchema;
exports.stardormChatJsonBodySchema = stardormChatJsonBodySchema;
exports.stardormChatRichBlockSchema = stardormChatRichBlockSchema;
exports.stardormChatRichRowSchema = stardormChatRichRowSchema;
exports.stardormChatStructuredSchema = stardormChatStructuredSchema;
exports.stardormChatSuccessSchema = stardormChatSuccessSchema;
exports.storageUploadBodySchema = storageUploadBodySchema;
exports.storageUploadResponseSchema = storageUploadResponseSchema;
exports.stripeKycInputSchema = stripeKycInputSchema;
exports.taxRateForCountry = taxRateForCountry;
exports.updateUserBodySchema = updateUserBodySchema;
exports.userAvatarPresetSchema = userAvatarPresetSchema;
exports.userKycStatusDocumentSchema = userKycStatusDocumentSchema;
exports.userKycStatusSchema = userKycStatusSchema;
exports.userPreferencesSchema = userPreferencesSchema;
exports.userUploadResultSchema = userUploadResultSchema;
exports.x402SupportedAssetSchema = x402SupportedAssetSchema;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map