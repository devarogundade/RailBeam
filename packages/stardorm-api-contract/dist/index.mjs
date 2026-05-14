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
var agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  handle: z.string().min(1),
  avatar: z.string().url(),
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
  /** Raw `feePerDay` (wei, decimal string) straight from the subgraph. Used to compute `subscribe` msg.value without a contract read. */
  feePerDayWei: z.string().regex(/^\d+$/).optional(),
  /** Presence-only when we have a live signal; omit if unknown. */
  online: z.boolean().optional(),
  skills: z.array(z.string()),
  creator: z.string().min(1),
  skillHandles: z.array(skillHandleSchema).optional(),
  chainAgentId: z.number().int().positive().optional()
});
var agentsListSchema = z.array(agentSchema).nonempty();
var catalogResponseSchema = z.object({
  agents: agentsListSchema,
  categories: z.array(agentCategorySchema),
  defaultHiredIds: z.array(z.string().min(1)),
  chatSuggestions: z.array(z.string())
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
var handlerActionIdSchema = z.enum(HANDLER_ACTION_IDS);
var handlersListResponseSchema = z.object({
  handlers: z.array(handlerActionIdSchema)
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
var storageUploadBodySchema = z.object({
  content: z.string().min(1)
});
var storageUploadResponseSchema = z.object({
  rootHash: z.string().min(1),
  txHash: z.string().optional()
});
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
    type: z.literal("credit_card"),
    title: z.string().min(1),
    rows: stardormChatRichRows
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
var stardormChatSuccessSchema = z.object({
  agentKey: z.string().min(1),
  reply: z.string(),
  structured: stardormChatStructuredSchema.optional(),
  /** Structured card rows for the client (model or server-generated). */
  rich: stardormChatRichBlockSchema.optional(),
  /** Files the server uploaded to 0G Storage from the user's chat turn (echoed for immediate render). */
  attachments: z.array(stardormChatAttachmentSchema).optional(),
  compute: stardormChatComputeSchema
});
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
  rich: stardormChatRichBlockSchema.optional(),
  handlerCta: chatHistoryHandlerCtaSchema.optional(),
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
  paidByWallet: z.string().optional()
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
var userKycStatusSchema = z.enum([
  "not_started",
  "pending",
  "processing",
  "verified",
  "requires_input",
  "canceled"
]);
var stripeKycInputSchema = z.object({
  /** App path only (e.g. `/chat`); joined with `APP_PUBLIC_URL` for Stripe `return_url`. */
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
  updatedAt: z.coerce.date().optional()
});
var creditCardsListResponseSchema = z.object({
  cards: z.array(creditCardPublicSchema)
});
var creditCardFundBodySchema = z.object({
  amountCents: z.coerce.number().int().min(1).max(1e8)
});
var creditCardWithdrawBodySchema = creditCardFundBodySchema;

export { HANDLER_ACTION_IDS, agentCategorySchema, agentFeedbacksPageResponseSchema, agentFeedbacksQuerySchema, agentOnchainFeedbackItemSchema, agentSchema, agentsListSchema, authChallengeBodySchema, authChallengeResponseSchema, authMeResponseSchema, authVerifyBodySchema, authVerifyResponseSchema, buildStardormCatalogResponse, catalogResponseSchema, chatFollowUpSchema, chatHistoryAttachmentSchema, chatHistoryHandlerCtaSchema, chatHistoryMessageSchema, chatHistoryQuerySchema, chatHistoryResponseSchema, conversationSummarySchema, conversationsListResponseSchema, conversationsPageResponseSchema, conversationsQuerySchema, createConversationBodySchema, createCreditCardInputSchema, creditCardFundBodySchema, creditCardPublicSchema, creditCardWithdrawBodySchema, creditCardsListResponseSchema, executeHandlerBodySchema, executeHandlerResponseSchema, getAllowedHandlersForAgentKey, handlerActionIdSchema, handlersListResponseSchema, isHandlerActionId, isOnRampFormCtaParams, mergeAllowedHandlersForAgentKeys, onRampFormCtaParamsSchema, onRampFormNetworkOptionSchema, onRampRecordSchema, onRampRecordStatusSchema, onRampTokensInputSchema, paymentRequestStatusSchema, paymentRequestTypeSchema, paymentSettlementBodySchema, publicPaymentRequestSchema, publicUserSchema, resolveCatalogAgentKeyForHandler, resolveStardormAgentKey, resolveStardormChainAgentId, skillHandleSchema, stardormChatAttachmentSchema, stardormChatClientErrorSchema, stardormChatClientResultSchema, stardormChatComputeSchema, stardormChatJsonBodySchema, stardormChatRichBlockSchema, stardormChatRichRowSchema, stardormChatStructuredSchema, stardormChatSuccessSchema, storageUploadBodySchema, storageUploadResponseSchema, stripeKycInputSchema, updateUserBodySchema, userAvatarPresetSchema, userKycStatusDocumentSchema, userKycStatusSchema, userPreferencesSchema, userUploadResultSchema, x402SupportedAssetSchema };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map