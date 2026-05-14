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
var agentSchema = zod.z.object({
  id: zod.z.string().min(1),
  name: zod.z.string().min(1),
  handle: zod.z.string().min(1),
  avatar: zod.z.string().url(),
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
  /** Raw `feePerDay` (wei, decimal string) straight from the subgraph. Used to compute `subscribe` msg.value without a contract read. */
  feePerDayWei: zod.z.string().regex(/^\d+$/).optional(),
  /** Presence-only when we have a live signal; omit if unknown. */
  online: zod.z.boolean().optional(),
  skills: zod.z.array(zod.z.string()),
  creator: zod.z.string().min(1),
  skillHandles: zod.z.array(skillHandleSchema).optional(),
  chainAgentId: zod.z.number().int().positive().optional()
});
var agentsListSchema = zod.z.array(agentSchema).nonempty();
var catalogResponseSchema = zod.z.object({
  agents: agentsListSchema,
  categories: zod.z.array(agentCategorySchema),
  defaultHiredIds: zod.z.array(zod.z.string().min(1)),
  chatSuggestions: zod.z.array(zod.z.string())
});
var HANDLER_ACTION_IDS = [
  "generate_tax_report",
  "create_x402_payment",
  /** Fiat checkout via Stripe; webhook fulfills ERC-20 transfer from treasury key. */
  "on_ramp_tokens",
  /** Stripe Identity hosted verification for the signed-in wallet user. */
  "complete_stripe_kyc",
  /** Issue a virtual payment card record with billing profile and spend balance. */
  "create_credit_card"
];
function isHandlerActionId(id) {
  return HANDLER_ACTION_IDS.includes(id);
}
var handlerActionIdSchema = zod.z.enum(HANDLER_ACTION_IDS);
var handlersListResponseSchema = zod.z.object({
  handlers: zod.z.array(handlerActionIdSchema)
});

// src/catalog-build.ts
var STARDORM_CATALOG_SEED = [
  {
    chainAgentId: 1,
    agentKey: "beam-default",
    name: "Beam",
    handle: "beam.0g",
    category: "General",
    tagline: "Your default conversational agent",
    description: "Beam routes your prompts to the best hired agent and handles general financial questions.",
    skills: ["Routing", "General Q&A", "Wallet"],
    skillHandles: [],
    allowedHandlers: []
  },
  {
    chainAgentId: 2,
    agentKey: "ledger",
    name: "Ledger",
    handle: "ledger.0g",
    category: "Payments",
    tagline: "Accept business payments across chains",
    description: "Issues invoices, accepts payments in 0G and stablecoins, and reconciles to your books automatically.",
    skills: ["Invoicing", "Stablecoins", "Reconciliation"],
    skillHandles: [
      {
        handle: "x402_payment",
        label: "Create x402 payment resource link"
      }
    ],
    allowedHandlers: ["create_x402_payment"]
  },
  {
    chainAgentId: 3,
    agentKey: "fiscus",
    name: "Fiscus",
    handle: "fiscus.0g",
    category: "Taxes",
    tagline: "Crypto-native tax calculations",
    description: "Pulls onchain activity, classifies events, and produces jurisdiction-aware tax reports.",
    skills: ["Tax", "Cost basis", "Reports"],
    skillHandles: [
      { handle: "estimate_crypto_tax", label: "Estimate crypto tax exposure" },
      { handle: "classify_transactions", label: "Classify onchain transactions" },
      { handle: "export_tax_packet", label: "Export tax packet (CSV / summary)" },
      { handle: "generate_pdf", label: "Generate tax summary PDF" }
    ],
    allowedHandlers: ["generate_tax_report"]
  },
  {
    chainAgentId: 4,
    agentKey: "scribe",
    name: "Scribe",
    handle: "scribe.0g",
    category: "Reports",
    tagline: "Beautiful financial reports on demand",
    description: "Generates P&L, cash flow and treasury reports with charts you can share.",
    skills: ["P&L", "Cash flow", "PDF"],
    skillHandles: [
      { handle: "generate_pl_report", label: "Generate P&L report" },
      { handle: "generate_cashflow_pdf", label: "Generate cash flow PDF" },
      { handle: "treasury_summary", label: "Treasury summary" },
      { handle: "generate_pdf", label: "Generate shareable PDF report" }
    ],
    allowedHandlers: []
  },
  {
    chainAgentId: 5,
    agentKey: "yieldr",
    name: "Yieldr",
    handle: "yieldr.0g",
    category: "DeFi",
    tagline: "Allocates idle capital across DeFi",
    description: "Risk-scored DeFi allocator that rebalances based on rates, TVL and your guardrails.",
    skills: ["Yield", "Rebalance", "Risk"],
    skillHandles: [
      { handle: "scan_yield_opportunities", label: "Scan yield opportunities" },
      { handle: "rebalance_plan", label: "Propose rebalance plan" },
      { handle: "risk_check", label: "Risk / drawdown check" }
    ],
    allowedHandlers: []
  },
  {
    chainAgentId: 6,
    agentKey: "audita",
    name: "Audita",
    handle: "audita.0g",
    category: "Reports",
    tagline: "Continuous onchain audit trail",
    description: "Verifies transactions and flags anomalies in your treasury operations.",
    skills: ["Audit", "Anomaly", "Treasury"],
    skillHandles: [
      { handle: "audit_trail_export", label: "Export audit trail" },
      { handle: "anomaly_scan", label: "Run anomaly scan" },
      { handle: "treasury_verify", label: "Verify treasury movements" },
      { handle: "generate_pdf", label: "Generate audit PDF" }
    ],
    allowedHandlers: []
  },
  {
    chainAgentId: 7,
    agentKey: "settler",
    name: "Settler",
    handle: "settler.0g",
    category: "Payments",
    tagline: "Automated payroll & vendor settlement",
    description: "Schedules and settles recurring vendor and contractor payouts.",
    skills: ["Payroll", "Recurring", "Batch"],
    skillHandles: [
      { handle: "schedule_payroll", label: "Schedule payroll run" },
      { handle: "batch_payout", label: "Plan batch payout" },
      { handle: "vendor_settlement", label: "Vendor settlement draft" },
      { handle: "generate_pdf", label: "Generate settlement PDF" }
    ],
    /** No backend handler yet; agent stays text-only until one is implemented. */
    allowedHandlers: ["create_x402_payment"]
  },
  {
    chainAgentId: 8,
    agentKey: "quanta",
    name: "Quanta",
    handle: "quanta.0g",
    category: "DeFi",
    tagline: "Quant strategies for stablecoin yield",
    description: "Runs market-neutral strategies with strict drawdown limits.",
    skills: ["Quant", "Stables", "Hedging"],
    skillHandles: [
      { handle: "quant_backtest", label: "Describe quant backtest" },
      { handle: "stable_yield_scan", label: "Scan stablecoin yield" },
      { handle: "hedge_plan", label: "Hedging / neutral plan" },
      { handle: "generate_pdf", label: "Export strategy summary PDF" }
    ],
    allowedHandlers: []
  },
  {
    chainAgentId: 9,
    agentKey: "ramp",
    name: "Ramp",
    handle: "ramp.0g",
    category: "Payments",
    tagline: "Card to crypto on-ramp",
    description: "Creates a Stripe Checkout link so you can pay in USD and receive supported ERC-20 tokens on 0G after settlement.",
    skills: ["On-ramp", "Stripe", "Stablecoins"],
    skillHandles: [
      {
        handle: "stripe_on_ramp",
        label: "Create Stripe on-ramp checkout (card \u2192 token)"
      }
    ],
    allowedHandlers: ["on_ramp_tokens"]
  },
  {
    chainAgentId: 10,
    agentKey: "passport",
    name: "Passport",
    handle: "passport.0g",
    category: "Compliance",
    tagline: "Verify with Stripe Identity",
    description: "Starts Stripe Identity document verification so your account can reach a verified KYC status.",
    skills: ["KYC", "Identity", "Compliance"],
    skillHandles: [
      {
        handle: "stripe_identity_kyc",
        label: "Complete Stripe Identity verification"
      }
    ],
    allowedHandlers: ["complete_stripe_kyc"]
  },
  {
    chainAgentId: 11,
    agentKey: "capita",
    name: "Capita",
    handle: "capita.0g",
    category: "Payments",
    tagline: "Virtual company cards with a spend balance",
    description: "Issues virtual payment cards tied to your wallet, stores a full billing profile, and tracks an available balance you can fund or withdraw from the dashboard.",
    skills: ["Cards", "Treasury", "Spend controls"],
    skillHandles: [
      {
        handle: "create_payment_card",
        label: "Create virtual payment card"
      }
    ],
    allowedHandlers: ["create_credit_card"]
  }
];
function avatarUrl(agentKey) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(agentKey)}`;
}
function seedRowToAgent(row) {
  return {
    id: row.agentKey,
    name: row.name,
    handle: row.handle,
    avatar: row.imageUrl ? row.imageUrl : avatarUrl(row.agentKey),
    category: row.category,
    tagline: row.tagline,
    description: row.description,
    // No synthetic engagement or pricing; UI hides missing stats.
    skills: [...row.skills],
    creator: "Beam catalog",
    skillHandles: [...row.skillHandles],
    chainAgentId: row.chainAgentId
  };
}
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
var DEFAULT_HIRED_IDS = ["beam-default", "ledger", "fiscus"];
var ALL_CATEGORIES = [
  "Payments",
  "Taxes",
  "Reports",
  "DeFi",
  "Compliance",
  "General"
];
function buildStardormCatalogResponse() {
  const agents = STARDORM_CATALOG_SEED.map(seedRowToAgent);
  return catalogResponseSchema.parse({
    agents,
    categories: [...ALL_CATEGORIES],
    defaultHiredIds: [...DEFAULT_HIRED_IDS],
    chatSuggestions: [...CHAT_SUGGESTIONS]
  });
}
var KEY_TO_CHAIN = Object.fromEntries(
  STARDORM_CATALOG_SEED.map((r) => [r.agentKey, r.chainAgentId])
);
var CHAIN_TO_KEY = Object.fromEntries(
  STARDORM_CATALOG_SEED.map((r) => [r.chainAgentId, r.agentKey])
);
var ALLOWED_HANDLERS_BY_KEY = Object.fromEntries(
  STARDORM_CATALOG_SEED.map((r) => [r.agentKey, r.allowedHandlers])
);
function resolveStardormChainAgentId(agentKey) {
  const trimmed = agentKey.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const hit = KEY_TO_CHAIN[trimmed];
  return hit ?? null;
}
function resolveStardormAgentKey(chainAgentId) {
  const n = typeof chainAgentId === "string" ? Number.parseInt(chainAgentId, 10) : Number(chainAgentId);
  if (!Number.isFinite(n) || n <= 0) return null;
  return CHAIN_TO_KEY[n] ?? null;
}
function getAllowedHandlersForAgentKey(agentKey) {
  const allowed = ALLOWED_HANDLERS_BY_KEY[agentKey.trim()] ?? [];
  return allowed.filter(
    (h) => HANDLER_ACTION_IDS.includes(h)
  );
}
function mergeAllowedHandlersForAgentKeys(agentKeys) {
  const set = /* @__PURE__ */ new Set();
  for (const raw of agentKeys) {
    for (const h of getAllowedHandlersForAgentKey(raw)) {
      set.add(h);
    }
  }
  return HANDLER_ACTION_IDS.filter((h) => set.has(h));
}
function resolveCatalogAgentKeyForHandler(handler, candidateAgentKeys) {
  const keySet = new Set(candidateAgentKeys.map((k) => k.trim()));
  for (const row of STARDORM_CATALOG_SEED) {
    if (!keySet.has(row.agentKey)) continue;
    if (row.allowedHandlers.includes(handler)) {
      return row.agentKey;
    }
  }
  return null;
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
var userKycStatusSchema = zod.z.enum([
  "not_started",
  "pending",
  "processing",
  "verified",
  "requires_input",
  "canceled"
]);
var stripeKycInputSchema = zod.z.object({
  /** App path only (e.g. `/chat`); joined with `APP_PUBLIC_URL` for Stripe `return_url`. */
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
  updatedAt: zod.z.coerce.date().optional()
});
var creditCardsListResponseSchema = zod.z.object({
  cards: zod.z.array(creditCardPublicSchema)
});
var creditCardFundBodySchema = zod.z.object({
  amountCents: zod.z.coerce.number().int().min(1).max(1e8)
});
var creditCardWithdrawBodySchema = creditCardFundBodySchema;

exports.HANDLER_ACTION_IDS = HANDLER_ACTION_IDS;
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
exports.buildStardormCatalogResponse = buildStardormCatalogResponse;
exports.catalogResponseSchema = catalogResponseSchema;
exports.chatFollowUpSchema = chatFollowUpSchema;
exports.chatHistoryAttachmentSchema = chatHistoryAttachmentSchema;
exports.chatHistoryHandlerCtaSchema = chatHistoryHandlerCtaSchema;
exports.chatHistoryMessageSchema = chatHistoryMessageSchema;
exports.chatHistoryQuerySchema = chatHistoryQuerySchema;
exports.chatHistoryResponseSchema = chatHistoryResponseSchema;
exports.conversationSummarySchema = conversationSummarySchema;
exports.conversationsListResponseSchema = conversationsListResponseSchema;
exports.conversationsPageResponseSchema = conversationsPageResponseSchema;
exports.conversationsQuerySchema = conversationsQuerySchema;
exports.createConversationBodySchema = createConversationBodySchema;
exports.createCreditCardInputSchema = createCreditCardInputSchema;
exports.creditCardFundBodySchema = creditCardFundBodySchema;
exports.creditCardPublicSchema = creditCardPublicSchema;
exports.creditCardWithdrawBodySchema = creditCardWithdrawBodySchema;
exports.creditCardsListResponseSchema = creditCardsListResponseSchema;
exports.executeHandlerBodySchema = executeHandlerBodySchema;
exports.executeHandlerResponseSchema = executeHandlerResponseSchema;
exports.getAllowedHandlersForAgentKey = getAllowedHandlersForAgentKey;
exports.handlerActionIdSchema = handlerActionIdSchema;
exports.handlersListResponseSchema = handlersListResponseSchema;
exports.isHandlerActionId = isHandlerActionId;
exports.isOnRampFormCtaParams = isOnRampFormCtaParams;
exports.mergeAllowedHandlersForAgentKeys = mergeAllowedHandlersForAgentKeys;
exports.onRampFormCtaParamsSchema = onRampFormCtaParamsSchema;
exports.onRampFormNetworkOptionSchema = onRampFormNetworkOptionSchema;
exports.onRampRecordSchema = onRampRecordSchema;
exports.onRampRecordStatusSchema = onRampRecordStatusSchema;
exports.onRampTokensInputSchema = onRampTokensInputSchema;
exports.paymentRequestStatusSchema = paymentRequestStatusSchema;
exports.paymentRequestTypeSchema = paymentRequestTypeSchema;
exports.paymentSettlementBodySchema = paymentSettlementBodySchema;
exports.publicPaymentRequestSchema = publicPaymentRequestSchema;
exports.publicUserSchema = publicUserSchema;
exports.resolveCatalogAgentKeyForHandler = resolveCatalogAgentKeyForHandler;
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
exports.updateUserBodySchema = updateUserBodySchema;
exports.userAvatarPresetSchema = userAvatarPresetSchema;
exports.userKycStatusDocumentSchema = userKycStatusDocumentSchema;
exports.userKycStatusSchema = userKycStatusSchema;
exports.userPreferencesSchema = userPreferencesSchema;
exports.userUploadResultSchema = userUploadResultSchema;
exports.x402SupportedAssetSchema = x402SupportedAssetSchema;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map