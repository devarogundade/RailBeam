import { z } from 'zod';

// src/agent.ts
var agentCategorySchema = z.enum([
  "Payments",
  "Taxes",
  "Reports",
  "DeFi",
  "Compliance",
  "General"
]);
var skillHandleSchema = z.object({
  handle: z.string().min(1),
  label: z.string().min(1)
});
var agentAvatarSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/\S+/, "avatar must be a URL or a root-relative path")
]);
var agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  handle: z.string().min(1),
  avatar: agentAvatarSchema,
  category: agentCategorySchema,
  tagline: z.string(),
  description: z.string(),
  /** From on-chain feedback / analytics when wired; omit if unknown. */
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().nonnegative().optional(),
  hires: z.number().int().nonnegative().optional(),
  reputation: z.number().min(0).max(100).optional(),
  /** Estimated from indexer `feePerDay` (wei) when available; omit if unknown. */
  pricePerMonth: z.number().nonnegative().optional(),
  /** Raw `feePerDay` (wei, decimal string) from the subgraph. `subscribe` must send exactly `feePerDay * numDays` wei. */
  feePerDayWei: z.string().regex(/^\d+$/).optional(),
  /** Presence-only when we have a live signal; omit if unknown. */
  online: z.boolean().optional(),
  skills: z.array(z.string()),
  creator: z.string().min(1),
  skillHandles: z.array(skillHandleSchema).optional(),
  chainAgentId: z.number().int().positive().optional(),
  /** From indexer when the token is an ERC-7857 clone of another agent. */
  isCloned: z.boolean().optional(),
  /** Lowercase `0x` registry owner (subgraph); used for “my clone” ownership checks. */
  ownerAddress: z.string().regex(/^0x[a-f0-9]{40}$/).optional(),
  /** Raw on-chain registration string (hex or JSON) for owner-only URI updates. */
  registrationUriRaw: z.string().optional()
});
var agentsListSchema = z.array(agentSchema).nonempty();
var catalogResponseSchema = z.object({
  agents: agentsListSchema,
  categories: z.array(agentCategorySchema),
  defaultHiredIds: z.array(z.string().min(1)),
  chatSuggestions: z.array(z.string())
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
var STARDORM_CATALOG_AGENT_KEYS_ORDERED = [
  "beam-default",
  "ledger",
  "fiscus",
  "scribe",
  "yieldr",
  "audita",
  "settler",
  "quanta",
  "ramp",
  "passport",
  "capita"
];
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
  const slug = trimmed.toLowerCase();
  const idx = STARDORM_CATALOG_AGENT_KEYS_ORDERED.indexOf(slug);
  if (idx >= 0) return idx + 1;
  return null;
}
function resolveStardormAgentKey(chainAgentId) {
  const n = typeof chainAgentId === "string" ? Number.parseInt(chainAgentId, 10) : Number(chainAgentId);
  if (!Number.isFinite(n) || n <= 0) return null;
  const idx = n - 1;
  if (idx >= 0 && idx < STARDORM_CATALOG_AGENT_KEYS_ORDERED.length && STARDORM_CATALOG_AGENT_KEYS_ORDERED[idx]) {
    return STARDORM_CATALOG_AGENT_KEYS_ORDERED[idx];
  }
  return `chain-${n}`;
}
var authChallengeBodySchema = z.object({
  walletAddress: z.string().min(1)
});
var authChallengeResponseSchema = z.object({
  message: z.string().min(1)
});
var authVerifyBodySchema = z.object({
  walletAddress: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1)
});
var authVerifyResponseSchema = z.object({
  accessToken: z.string().min(1)
});
var authMeResponseSchema = z.object({
  walletAddress: z.string().min(1)
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
  "draft_nft_transfer",
  /** Confirms a Uniswap V3 single-hop swap on 0G mainnet; user signs approve + router in wallet. */
  "draft_token_swap",
  /** Direct the user to hire a marketplace specialist for a task this agent cannot run. */
  "suggest_marketplace_hire"
];
function isHandlerActionId(id) {
  return HANDLER_ACTION_IDS.includes(id);
}
var handlerActionIdSchema = z.enum(HANDLER_ACTION_IDS);
var handlersListResponseSchema = z.object({
  handlers: z.array(handlerActionIdSchema)
});
var storageUploadBodySchema = z.object({
  content: z.string().min(1)
});
var storageUploadResponseSchema = z.object({
  rootHash: z.string().min(1),
  txHash: z.string().optional()
});
function stripJsonNulls(value) {
  if (value === null) return void 0;
  if (Array.isArray(value)) return value.map(stripJsonNulls);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const stripped = stripJsonNulls(v);
      if (stripped !== void 0) out[k] = stripped;
    }
    return out;
  }
  return value;
}
var stardormChatRichRowSchema = z.object({
  label: z.string(),
  value: z.string()
});
var x402SupportedAssetSchema = z.object({
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(32),
  icon: z.string().min(1).max(512),
  decimals: z.number().int().min(0).max(36),
  address: z.string().min(1).max(66),
  usdValue: z.number().finite().nonnegative().optional()
});
var stardormChatRichRows = z.array(stardormChatRichRowSchema).max(32).optional();
var stardormChatRichBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("report"),
    title: z.string().min(1),
    rows: stardormChatRichRows
  }),
  z.object({
    type: z.literal("invoice"),
    title: z.string().min(1),
    rows: stardormChatRichRows
  }),
  z.object({
    type: z.literal("tx"),
    title: z.string().min(1),
    rows: stardormChatRichRows
  }),
  z.object({
    type: z.literal("x402_checkout_form"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2e3).optional(),
    /** Paywalled HTTP resource URL for x402 clients (optional). */
    resourceUrl: z.string().url().max(2048).optional(),
    supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
    networks: z.array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().min(1).max(120)
      })
    ).max(16).optional()
  }),
  z.object({
    type: z.literal("on_ramp_checkout_form"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2e3).optional(),
    supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
    networks: z.array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().min(1).max(120)
      })
    ).max(16).optional()
  }),
  z.object({
    type: z.literal("credit_card_checkout_form"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2e3).optional(),
    /** Pre-filled ISO 4217 currency in the form (e.g. USD). */
    defaultCurrency: z.string().length(3).optional()
  }),
  z.object({
    type: z.literal("credit_card"),
    title: z.string().min(1),
    rows: stardormChatRichRows
  }),
  z.object({
    type: z.literal("swap_checkout_form"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2e3).optional(),
    supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
    networks: z.array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().min(1).max(120)
      })
    ).max(16).optional(),
    /** Default V3 fee tier when the form does not override (500, 3000, 10000). */
    defaultPoolFee: z.union([z.literal(500), z.literal(3e3), z.literal(1e4)]).optional()
  }),
  z.object({
    type: z.literal("marketplace_hire"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2e3).optional(),
    specialistName: z.string().min(1).max(80),
    specialistAgentKey: z.string().min(1).max(64),
    category: z.enum(["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"]).optional(),
    capability: z.string().min(1).max(400).optional(),
    userTask: z.string().max(500).optional(),
    /** App path to open the marketplace (default `/marketplace`). */
    marketplacePath: z.string().min(1).max(256).default("/marketplace"),
    /** App path to the specialist profile when known (e.g. `/agents/chain-2`). */
    agentProfilePath: z.string().min(1).max(256).optional(),
    requiredHandler: z.string().min(1).max(64).optional()
  }),
  z.object({
    type: z.literal("transfer_checkout_form"),
    title: z.string().min(1).max(200),
    intro: z.string().max(2e3).optional(),
    supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
    networks: z.array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().min(1).max(120)
      })
    ).max(16).optional(),
    defaultTo: z.string().max(66).optional()
  })
]);
var stardormChatJsonBodySchema = z.object({
  message: z.string().min(1)
});
var stardormChatStructuredSchema = z.object({
  text: z.string(),
  handler: handlerActionIdSchema.optional(),
  params: z.unknown().optional()
});
var stardormChatComputeSchema = z.object({
  model: z.string(),
  verified: z.boolean(),
  chatId: z.string().optional(),
  provider: z.string(),
  computeNetwork: z.string()
});
var stardormChatAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  mimeType: z.string(),
  hash: z.string().min(1),
  size: z.string().optional()
});
function nullishOptional(schema) {
  return z.preprocess((v) => v === null ? void 0 : v, schema);
}
var stardormChatSuccessObjectSchema = z.object({
  agentKey: z.string().min(1),
  reply: z.string(),
  structured: nullishOptional(stardormChatStructuredSchema.optional()),
  /** Structured card rows for the client (model or server-generated). */
  rich: nullishOptional(stardormChatRichBlockSchema.optional()),
  /** Files the server uploaded to 0G Storage from the user's chat turn (echoed for immediate render). */
  attachments: nullishOptional(
    z.array(stardormChatAttachmentSchema).optional()
  ),
  compute: stardormChatComputeSchema
});
var stardormChatSuccessSchema = z.preprocess(
  (v) => v != null && typeof v === "object" ? stripJsonNulls(v) : v,
  stardormChatSuccessObjectSchema
);
var stardormChatClientErrorSchema = z.object({
  error: z.string().min(1)
});
var stardormChatClientResultSchema = z.union([
  stardormChatSuccessSchema,
  stardormChatClientErrorSchema
]);

// src/user.ts
var userAvatarPresetSchema = z.enum(["male", "female"]);
var userPreferencesSchema = z.object({
  autoRoutePrompts: z.boolean(),
  onchainReceipts: z.boolean(),
  emailNotifications: z.boolean(),
  avatarPreset: userAvatarPresetSchema.default("male")
});
var publicUserSchema = z.object({
  id: z.string().min(1),
  walletAddress: z.string().min(1),
  displayName: z.string().optional(),
  email: z.string().optional(),
  activeAgentId: z.string().min(1),
  /** Selected chat thread id when multi-conversation is enabled. */
  activeConversationId: z.string().min(1).optional(),
  preferences: userPreferencesSchema,
  lastLoginAt: z.coerce.date().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
});
var updateUserBodySchema = z.object({
  displayName: z.string().optional(),
  email: z.string().nullable().optional(),
  activeAgentId: z.string().optional(),
  activeConversationId: z.string().nullable().optional(),
  preferences: userPreferencesSchema.partial().optional()
});
var userUploadResultSchema = z.object({
  rootHash: z.string().min(1),
  txHash: z.string().optional(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative()
});
var executeHandlerBodySchema = z.object({
  handler: handlerActionIdSchema,
  params: z.unknown().optional(),
  /** Mongo id of the chat message that displayed the handler CTA (required). */
  ctaMessageId: z.string().min(1)
});
var handlerAttachmentSchema = z.object({
  rootHash: z.string(),
  mimeType: z.string(),
  name: z.string()
});
var executeHandlerResponseSchema = z.object({
  message: z.string(),
  attachments: z.array(handlerAttachmentSchema).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  rich: stardormChatRichBlockSchema.optional()
});
var chatHandlerWalletTxResultSchema = z.object({
  kind: z.literal("wallet_tx"),
  status: z.enum(["submitted", "confirmed", "failed"]),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  error: z.string().max(2e3).optional(),
  network: z.string().min(1).max(64).optional(),
  chainId: z.number().int().positive().optional(),
  handler: z.string().min(1).max(64).optional(),
  updatedAt: z.number().int().positive()
});
var chatHandlerServerResultSchema = z.object({
  kind: z.literal("server"),
  status: z.enum(["completed", "failed"]).default("completed"),
  data: z.record(z.string(), z.unknown()).optional(),
  updatedAt: z.number().int().positive()
});
var chatHandlerResultSchema = z.discriminatedUnion("kind", [
  chatHandlerWalletTxResultSchema,
  chatHandlerServerResultSchema
]);
var patchChatMessageResultBodySchema = z.object({
  result: chatHandlerResultSchema
});
var patchChatMessageResultResponseSchema = z.object({
  ok: z.literal(true),
  messageId: z.string().min(1),
  result: chatHandlerResultSchema,
  rich: z.object({
    type: z.literal("tx"),
    title: z.string(),
    rows: z.array(
      z.object({
        label: z.string(),
        value: z.string()
      })
    ).optional()
  }).optional()
});

// src/conversation.ts
var chatHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(40),
  /** When omitted, the server uses the user’s active conversation. */
  conversationId: z.string().min(1).optional(),
  /**
   * Opaque cursor from the previous response’s `nextCursorOlder` — loads older messages
   * than the oldest message in the last batch (prepends chronologically in the client).
   */
  cursor: z.string().min(1).optional()
});
var chatHistoryAttachmentSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  name: z.string(),
  hash: z.string(),
  size: z.string().optional()
});
var chatHistoryHandlerCtaSchema = z.object({
  handler: handlerActionIdSchema,
  params: z.record(z.unknown())
});
var chatFollowUpSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("x402_checkout"),
    /** App-relative path, e.g. `/pay/<mongoId>`. */
    payPath: z.string().min(1),
    paymentRequestId: z.string().min(1)
  }),
  z.object({
    kind: z.literal("tax_report_pdf"),
    attachmentId: z.string().min(1),
    name: z.string().min(1)
  }),
  z.object({
    kind: z.literal("stripe_on_ramp"),
    checkoutUrl: z.string().url(),
    onRampId: z.string().min(1)
  }),
  z.object({
    kind: z.literal("stripe_identity"),
    verificationUrl: z.string().url(),
    verificationSessionId: z.string().min(1)
  }),
  z.object({
    kind: z.literal("credit_card_ready"),
    creditCardId: z.string().min(1),
    /** App path for managing the card balance (e.g. /dashboard). */
    dashboardPath: z.string().min(1)
  })
]);
var chatHistoryMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "agent"]),
  agentKey: z.string().optional(),
  content: z.string(),
  createdAt: z.number(),
  attachments: z.array(chatHistoryAttachmentSchema).optional(),
  rich: z.preprocess(
    (v) => v != null && typeof v === "object" ? stripJsonNulls(v) : v,
    stardormChatRichBlockSchema.optional()
  ).optional(),
  handlerCta: chatHistoryHandlerCtaSchema.optional(),
  /** Wallet or server outcome for this bubble (tx hash, checkout ids, …). */
  result: chatHandlerResultSchema.optional(),
  followUp: chatFollowUpSchema.optional(),
  model: z.string().optional(),
  verified: z.boolean().optional(),
  chatId: z.string().optional(),
  provider: z.string().optional()
});
var chatHistoryResponseSchema = z.object({
  conversationId: z.string(),
  agentKey: z.string(),
  messages: z.array(chatHistoryMessageSchema),
  /** True when more older messages exist before this batch. */
  hasMoreOlder: z.boolean(),
  /** Pass as `cursor` on the next request to load older messages. */
  nextCursorOlder: z.string().optional()
});
var conversationSummarySchema = z.object({
  id: z.string().min(1),
  agentKey: z.string().min(1),
  title: z.string().optional(),
  lastMessageAt: z.coerce.date(),
  createdAt: z.coerce.date().optional()
});
var conversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
  /** Opaque cursor from the previous response’s `nextCursor`. */
  cursor: z.string().min(1).optional()
});
var conversationsPageResponseSchema = z.object({
  conversations: z.array(conversationSummarySchema),
  hasMore: z.boolean(),
  nextCursor: z.string().optional()
});
var conversationsListResponseSchema = conversationsPageResponseSchema;
var createConversationBodySchema = z.object({
  title: z.string().max(120).optional(),
  agentKey: z.string().min(1).optional()
});
var deleteConversationResponseSchema = z.object({
  deleted: z.literal(true)
});
var conversationSyncThreadSchema = z.object({
  v: z.literal(1),
  op: z.literal("thread"),
  conversationId: z.string().min(1)
});
var conversationSyncThreadMessagesSchema = z.object({
  v: z.literal(1),
  op: z.literal("thread_messages"),
  conversationId: z.string().min(1),
  messages: z.array(chatHistoryMessageSchema).min(1)
});
var conversationSyncConversationsSchema = z.object({
  v: z.literal(1),
  op: z.literal("conversations")
});
var conversationSyncConversationDeletedSchema = z.object({
  v: z.literal(1),
  op: z.literal("conversation_deleted"),
  conversationId: z.string().min(1)
});
var conversationSyncPayloadSchema = z.discriminatedUnion("op", [
  conversationSyncThreadSchema,
  conversationSyncThreadMessagesSchema,
  conversationSyncConversationsSchema,
  conversationSyncConversationDeletedSchema
]);
var agentOnchainFeedbackItemSchema = z.object({
  id: z.string(),
  agentId: z.number(),
  clientAddress: z.string(),
  feedbackIndex: z.string(),
  value: z.string(),
  valueDecimals: z.number().int().min(0).max(18),
  tag1: z.string(),
  tag2: z.string(),
  endpoint: z.string(),
  feedbackURI: z.string(),
  feedbackHash: z.string(),
  revoked: z.boolean(),
  blockNumber: z.number(),
  blockTimestamp: z.number(),
  transactionHash: z.string()
});
var agentFeedbacksQuerySchema = z.object({
  limit: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === void 0) return 20;
    const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
    if (!Number.isFinite(n)) return 20;
    return Math.min(50, Math.max(1, Math.trunc(n)));
  }),
  skip: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === void 0) return 0;
    const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.trunc(n));
  })
});
var agentFeedbacksPageResponseSchema = z.object({
  feedbacks: z.array(agentOnchainFeedbackItemSchema),
  page: z.object({
    limit: z.number().int().min(1).max(50),
    skip: z.number().int().min(0),
    hasMore: z.boolean()
  })
});
var evmTxHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/i, "Invalid transaction hash");
var evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid address");
var paymentSettlementBodySchema = z.object({
  txHash: evmTxHashSchema.optional(),
  payerAddress: evmAddressSchema.optional(),
  /** Matches @x402/core `PaymentPayload` (x402Version, accepted, payload, …). */
  x402PaymentPayload: z.record(z.string(), z.unknown()).optional()
}).superRefine((val, ctx) => {
  if (!val.txHash && !val.x402PaymentPayload) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide txHash (direct settlement) or x402PaymentPayload (facilitator).",
      path: ["txHash"]
    });
  }
  if (val.txHash && val.x402PaymentPayload) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide only one of txHash or x402PaymentPayload.",
      path: ["txHash"]
    });
  }
});
var paymentRequestTypeSchema = z.enum(["on-chain", "x402"]);
var paymentRequestStatusSchema = z.enum([
  "pending",
  "paid",
  "expired",
  "cancelled"
]);
var publicPaymentRequestSchema = z.object({
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
  facilitatorSettlement: z.boolean().optional()
});
var mePaymentRequestsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** 1-based page index (sorted by `updatedAt` descending). */
  page: z.coerce.number().int().min(1).default(1)
});
var paymentRequestsListResponseSchema = z.object({
  items: z.array(publicPaymentRequestSchema),
  /** Total rows matching the wallet filter (ignores pagination). */
  total: z.number().int().min(0)
});
var onRampFormNetworkOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120)
});
var onRampFormCtaParamsSchema = z.object({
  _onRampForm: z.literal(true),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: z.array(onRampFormNetworkOptionSchema).max(16).optional(),
  intro: z.string().max(2e3).optional()
});
function isOnRampFormCtaParams(v) {
  return onRampFormCtaParamsSchema.safeParse(v).success;
}
var weiString = z.union([
  z.string().trim().regex(
    /^[1-9]\d*$/,
    "tokenAmountWei must be base units (positive integer string, no decimals)"
  ),
  z.number().int().positive().transform((n) => String(n))
]);
var evmAddr = z.string().min(1).refine(
  (s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()),
  "must be a 0x-prefixed 20-byte address"
).transform((s) => s.trim().toLowerCase());
var onRampTokensInputSchema = z.object({
  recipientWallet: evmAddr,
  network: z.string().min(1).max(64),
  tokenAddress: evmAddr,
  tokenDecimals: z.number().int().min(0).max(36),
  tokenSymbol: z.string().min(1).max(32),
  tokenAmountWei: weiString,
  /** Optional spot reference for analytics / UI (per supported token). */
  usdValue: z.number().finite().nonnegative().optional(),
  /** Total USD charged via Stripe (cents). Minimum $1.00. */
  usdAmountCents: z.number().int().min(100).max(1e7)
});
var onRampRecordStatusSchema = z.enum([
  "pending_checkout",
  "pending_payment",
  "paid_pending_transfer",
  "fulfilled",
  "failed",
  "canceled"
]);
var onRampRecordSchema = z.object({
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
  updatedAt: z.coerce.date().optional()
});
var meOnRampsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
var onRampsListResponseSchema = z.object({
  items: z.array(onRampRecordSchema)
});
var userKycStatusSchema = z.enum([
  "not_started",
  "pending",
  "processing",
  "verified",
  "requires_input",
  "canceled"
]);
var stripeKycInputSchema = z.object({
  /** App path + query (e.g. `/` or `/?conversation=<id>`); joined with `APP_PUBLIC_URL` for Stripe `return_url`. */
  returnPath: z.string().min(1).max(512).optional()
}).strict();
var userKycStatusDocumentSchema = z.object({
  walletAddress: z.string().min(1),
  status: userKycStatusSchema,
  stripeVerificationSessionId: z.string().optional(),
  lastStripeEventType: z.string().optional(),
  lastError: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
});
var createCreditCardInputSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().min(1).max(20),
  countryCode: z.string().trim().length(2).transform((c) => c.toUpperCase()),
  cardLabel: z.string().trim().min(1).max(80).optional(),
  currency: z.string().trim().length(3).transform((c) => c.toUpperCase()).optional(),
  /** Opening balance in minor units (e.g. USD cents). */
  initialBalanceCents: z.coerce.number().int().min(0).max(1e8).optional()
});
var creditCardFormCtaParamsSchema = z.object({
  _creditCardForm: z.literal(true),
  intro: z.string().max(2e3).optional(),
  defaultCurrency: z.string().trim().length(3).transform((c) => c.toUpperCase()).optional()
});
function isCreditCardFormCtaParams(v) {
  return creditCardFormCtaParamsSchema.safeParse(v).success;
}
var creditCardPublicSchema = z.object({
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
  lastWithdrawTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
});
var creditCardSensitiveDetailsSchema = z.object({
  cardId: z.string().min(1),
  pan: z.string().regex(/^\d{16}$/),
  expiryMonth: z.coerce.number().int().min(1).max(12),
  expiryYear: z.coerce.number().int().min(2e3).max(2100),
  cvv: z.string().regex(/^\d{3,4}$/)
});
var creditCardsListResponseSchema = z.object({
  cards: z.array(creditCardPublicSchema)
});
var creditCardFundQuoteQuerySchema = z.object({
  amountCents: z.coerce.number().int().min(1).max(1e8)
});
var creditCardFundQuoteX402Schema = z.object({
  onchainFundingRequired: z.literal(false),
  chainId: z.number().int(),
  recipient: z.string().min(1),
  usdcAsset: z.string().min(1),
  usdcAmountBaseUnits: z.string().regex(/^\d+$/),
  usdcDecimals: z.number().int().min(0).max(18)
});
var creditCardFundQuoteNativeSchema = z.object({
  onchainFundingRequired: z.literal(true),
  chainId: z.number().int(),
  recipient: z.string().min(1),
  minNativeWei: z.string().regex(/^\d+$/),
  usdValue: z.number().finite().positive(),
  nativeSymbol: z.string().min(1),
  nativeDecimals: z.number().int().min(0).max(18)
});
var creditCardFundQuoteSchema = z.discriminatedUnion(
  "onchainFundingRequired",
  [creditCardFundQuoteX402Schema, creditCardFundQuoteNativeSchema]
);
var creditCardFundQuoteResponseSchema = creditCardFundQuoteSchema;
var creditCardWithdrawBodySchema = z.object({
  amountCents: z.coerce.number().int().min(1).max(1e8)
});
var billingDatePartSchema = z.object({
  year: z.number().int().min(2020).max(2036),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31)
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
var generatePaymentInvoiceInputSchema = z.object({
  from: billingDatePartSchema.optional(),
  to: billingDatePartSchema.optional(),
  invoiceTitle: z.string().trim().min(1).max(120).optional()
}).superRefine((val, ctx) => {
  if (!val.from || !val.to) return;
  const a = billingDatePartToUtc(val.from);
  const b = billingDatePartToUtc(val.to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid calendar date"
    });
    return;
  }
  if (a > b) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "`from` must be on or before `to`",
      path: ["from"]
    });
  }
});
var generateFinancialActivityReportInputSchema = z.object({
  from: billingDatePartSchema.optional(),
  to: billingDatePartSchema.optional(),
  reportTitle: z.string().trim().min(1).max(120).optional()
}).superRefine((val, ctx) => {
  if (!val.from || !val.to) return;
  const a = billingDatePartToUtc(val.from);
  const b = billingDatePartToUtc(val.to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid calendar date"
    });
    return;
  }
  if (a > b) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
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
var caip2Eip155 = z.string().min(8).max(64).regex(
  /^eip155:\d+$/,
  "network must be CAIP-2 form eip155:<chainId> (e.g. eip155:16602)"
);
var evmAddress20 = z.string().trim().refine(
  (s) => /^0x[a-fA-F0-9]{40}$/.test(s),
  "must be a 0x-prefixed 20-byte EVM address"
).transform((s) => s.trim().toLowerCase());
var positiveWeiString = z.string().trim().regex(
  /^[1-9]\d*$/,
  "must be a positive integer decimal string (base units / wei)"
);
var decimalStringNonNeg = z.string().trim().regex(/^\d+$/, "must be a non-negative integer decimal string");
var nftStandardSchema = z.enum(["erc721", "erc1155"]);
var draftNativeTransferInputSchema = z.object({
  network: caip2Eip155,
  to: evmAddress20,
  valueWei: positiveWeiString,
  note: z.string().max(500).optional()
});
var draftErc20TransferInputSchema = z.object({
  network: caip2Eip155,
  token: evmAddress20,
  tokenSymbol: z.string().min(1).max(32).optional(),
  tokenDecimals: z.number().int().min(0).max(36),
  to: evmAddress20,
  amountWei: positiveWeiString,
  note: z.string().max(500).optional()
});
var draftNftTransferInputSchema = z.object({
  network: caip2Eip155,
  contract: evmAddress20,
  standard: nftStandardSchema.default("erc721"),
  to: evmAddress20,
  tokenId: decimalStringNonNeg,
  /** Required for ERC-1155; omit for ERC-721. */
  amount: positiveWeiString.optional(),
  note: z.string().max(500).optional()
}).superRefine((val, ctx) => {
  if (val.standard === "erc1155") {
    if (!val.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amount (base units) is required for ERC-1155",
        path: ["amount"]
      });
    }
  } else if (val.amount != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "amount must be omitted for ERC-721",
      path: ["amount"]
    });
  }
});
var swapFormNetworkOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120)
});
var swapFormCtaParamsSchema = z.object({
  _swapForm: z.literal(true),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: z.array(swapFormNetworkOptionSchema).max(16).optional(),
  intro: z.string().max(2e3).optional(),
  /** Default Uniswap V3 pool fee tier (500, 3000, or 10000). */
  defaultPoolFee: z.union([z.literal(500), z.literal(3e3), z.literal(1e4)]).optional()
});
function isSwapFormCtaParams(v) {
  return swapFormCtaParamsSchema.safeParse(v).success;
}
var caip2Eip1552 = z.string().min(8).max(64).regex(/^eip155:\d+$/, "network must be CAIP-2 form eip155:<chainId>");
var evmAddress202 = z.string().trim().refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s), "must be a 0x-prefixed 20-byte EVM address").transform((s) => s.trim().toLowerCase());
var positiveWeiString2 = z.string().trim().regex(/^[1-9]\d*$/, "must be a positive integer decimal string (base units)");
var nonNegativeWeiString = z.string().trim().regex(/^\d+$/, "must be a non-negative integer decimal string (base units)");
var poolFeeSchema = z.union([
  z.literal(500),
  z.literal(3e3),
  z.literal(1e4)
]);
var draftTokenSwapInputSchema = z.object({
  network: caip2Eip1552,
  tokenIn: evmAddress202,
  tokenInSymbol: z.string().min(1).max(32).optional(),
  tokenInDecimals: z.number().int().min(0).max(36),
  tokenOut: evmAddress202,
  tokenOutSymbol: z.string().min(1).max(32).optional(),
  tokenOutDecimals: z.number().int().min(0).max(36),
  amountInWei: positiveWeiString2,
  /** Slippage floor in `tokenOut` base units; `0` accepts any output. */
  amountOutMinimumWei: nonNegativeWeiString.default("0"),
  poolFee: poolFeeSchema.default(3e3),
  /** Filled server-side from deployment when omitted. */
  router: evmAddress202.optional(),
  /** Unix seconds; wallet may refresh if expired. */
  deadlineUnix: z.number().int().positive().optional(),
  note: z.string().max(500).optional()
});
var transferFormNetworkOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120)
});
var transferFormCtaParamsSchema = z.object({
  _transferForm: z.literal(true),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: z.array(transferFormNetworkOptionSchema).max(16).optional(),
  intro: z.string().max(2e3).optional(),
  /** When set, pre-fill recipient in the form. */
  defaultTo: z.string().trim().refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s), "defaultTo must be 0x\u202640").transform((s) => s.toLowerCase()).optional()
});
function isTransferFormCtaParams(v) {
  return transferFormCtaParamsSchema.safeParse(v).success;
}
var marketplaceSpecialistAgentKeySchema = z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/i);
var suggestMarketplaceHireInputSchema = z.object({
  specialistAgentKey: marketplaceSpecialistAgentKeySchema,
  specialistName: z.string().min(1).max(80).optional(),
  category: z.enum(["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"]).optional(),
  /** One line: what the specialist runs for the user (handler names ok). */
  capability: z.string().min(1).max(400).optional(),
  /** Short description of what the user was trying to do. */
  userTask: z.string().min(1).max(500).optional(),
  intro: z.string().max(2e3).optional(),
  /** Optional handler the user needs after hiring (for display only). */
  requiredHandler: handlerActionIdSchema.optional()
});

export { HANDLER_ACTION_IDS, ISO_3166_1_ALPHA2_CODES, agentAvatarSchema, agentCategorySchema, agentFeedbacksPageResponseSchema, agentFeedbacksQuerySchema, agentOnchainFeedbackItemSchema, agentSchema, agentsListSchema, authChallengeBodySchema, authChallengeResponseSchema, authMeResponseSchema, authVerifyBodySchema, authVerifyResponseSchema, billingDatePartSchema, billingDatePartToUtc, billingPeriodBounds, billingRangeEndOfDay, buildStardormCatalogResponse, catalogResponseSchema, chatFollowUpSchema, chatHandlerResultSchema, chatHandlerServerResultSchema, chatHandlerWalletTxResultSchema, chatHistoryAttachmentSchema, chatHistoryHandlerCtaSchema, chatHistoryMessageSchema, chatHistoryQuerySchema, chatHistoryResponseSchema, conversationSummarySchema, conversationSyncConversationDeletedSchema, conversationSyncConversationsSchema, conversationSyncPayloadSchema, conversationSyncThreadMessagesSchema, conversationSyncThreadSchema, conversationsListResponseSchema, conversationsPageResponseSchema, conversationsQuerySchema, createConversationBodySchema, createCreditCardInputSchema, creditCardFormCtaParamsSchema, creditCardFundQuoteNativeSchema, creditCardFundQuoteQuerySchema, creditCardFundQuoteResponseSchema, creditCardFundQuoteSchema, creditCardFundQuoteX402Schema, creditCardPublicSchema, creditCardSensitiveDetailsSchema, creditCardWithdrawBodySchema, creditCardsListResponseSchema, deleteConversationResponseSchema, draftErc20TransferInputSchema, draftNativeTransferInputSchema, draftNftTransferInputSchema, draftTokenSwapInputSchema, executeHandlerBodySchema, executeHandlerResponseSchema, generateFinancialActivityReportInputSchema, generatePaymentInvoiceInputSchema, handlerActionIdSchema, handlersListResponseSchema, isCreditCardFormCtaParams, isHandlerActionId, isIso3166Alpha2, isOnRampFormCtaParams, isSwapFormCtaParams, isTransferFormCtaParams, isoCountryDisplayName, marketplaceSpecialistAgentKeySchema, meOnRampsQuerySchema, mePaymentRequestsQuerySchema, onRampFormCtaParamsSchema, onRampFormNetworkOptionSchema, onRampRecordSchema, onRampRecordStatusSchema, onRampTokensInputSchema, onRampsListResponseSchema, patchChatMessageResultBodySchema, patchChatMessageResultResponseSchema, paymentRequestStatusSchema, paymentRequestTypeSchema, paymentRequestsListResponseSchema, paymentSettlementBodySchema, publicPaymentRequestSchema, publicUserSchema, resolveStardormAgentKey, resolveStardormChainAgentId, skillHandleSchema, stardormChatAttachmentSchema, stardormChatClientErrorSchema, stardormChatClientResultSchema, stardormChatComputeSchema, stardormChatJsonBodySchema, stardormChatRichBlockSchema, stardormChatRichRowSchema, stardormChatStructuredSchema, stardormChatSuccessSchema, storageUploadBodySchema, storageUploadResponseSchema, stripJsonNulls, stripeKycInputSchema, suggestMarketplaceHireInputSchema, swapFormCtaParamsSchema, swapFormNetworkOptionSchema, taxRateForCountry, transferFormCtaParamsSchema, transferFormNetworkOptionSchema, updateUserBodySchema, userAvatarPresetSchema, userKycStatusDocumentSchema, userKycStatusSchema, userPreferencesSchema, userUploadResultSchema, x402SupportedAssetSchema };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map