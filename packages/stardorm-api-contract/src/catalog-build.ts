import type { Agent, AgentCategory } from "./agent.js";
import { catalogResponseSchema, type CatalogResponse } from "./catalog.js";
import {
  HANDLER_ACTION_IDS,
  type HandlerActionId,
} from "./handlers.js";

type SeedSkillHandle = { readonly handle: string; readonly label: string };

type SeedRow = {
  readonly chainAgentId: number;
  readonly agentKey: string;
  readonly name: string;
  readonly handle: string;
  readonly category: AgentCategory;
  readonly tagline: string;
  readonly description: string;
  readonly skills: readonly string[];
  readonly skillHandles: readonly SeedSkillHandle[];
  /** Backend handler ids the agent may propose; subset of `HANDLER_ACTION_IDS`. */
  readonly allowedHandlers: readonly HandlerActionId[];
  /** Optional catalog image override (URL or root-relative path). */
  readonly imageUrl?: string;
};

/** Same registration order as `STARDORM_SEED_AGENT_URIS` in smart-contracts ignition. */
const STARDORM_CATALOG_SEED: readonly SeedRow[] = [
  {
    chainAgentId: 1,
    agentKey: "beam-default",
    name: "Beam",
    handle: "beam.0g",
    category: "General",
    tagline: "Your default conversational agent",
    description:
      "Beam routes your prompts to the best hired agent and handles general financial questions.",
    skills: ["Routing", "General Q&A", "Wallet"],
    skillHandles: [],
    allowedHandlers: [],
  },
  {
    chainAgentId: 2,
    agentKey: "ledger",
    name: "Ledger",
    handle: "ledger.0g",
    category: "Payments",
    tagline: "Accept business payments across chains",
    description:
      "Issues invoices, accepts payments in 0G and stablecoins, and reconciles to your books automatically.",
    skills: ["Invoicing", "Stablecoins", "Reconciliation"],
    skillHandles: [
      {
        handle: "x402_payment",
        label: "Create x402 payment resource link",
      },
    ],
    allowedHandlers: ["create_x402_payment", "generate_payment_invoice"],
  },
  {
    chainAgentId: 3,
    agentKey: "fiscus",
    name: "Fiscus",
    handle: "fiscus.0g",
    category: "Taxes",
    tagline: "Crypto-native tax calculations",
    description:
      "Pulls onchain activity, classifies events, and produces jurisdiction-aware tax reports.",
    skills: ["Tax", "Cost basis", "Reports"],
    skillHandles: [
      { handle: "estimate_crypto_tax", label: "Estimate crypto tax exposure" },
      { handle: "classify_transactions", label: "Classify onchain transactions" },
      { handle: "export_tax_packet", label: "Export tax packet (CSV / summary)" },
      { handle: "generate_pdf", label: "Generate tax summary PDF" },
    ],
    allowedHandlers: ["generate_tax_report"],
  },
  {
    chainAgentId: 4,
    agentKey: "scribe",
    name: "Scribe",
    handle: "scribe.0g",
    category: "Reports",
    tagline: "Beautiful financial reports on demand",
    description:
      "Generates P&L, cash flow and treasury reports with charts you can share.",
    skills: ["P&L", "Cash flow", "PDF"],
    skillHandles: [
      { handle: "generate_pl_report", label: "Generate P&L report" },
      { handle: "generate_cashflow_pdf", label: "Generate cash flow PDF" },
      { handle: "treasury_summary", label: "Treasury summary" },
      { handle: "generate_pdf", label: "Generate shareable PDF report" },
    ],
    allowedHandlers: ["generate_financial_activity_report"],
  },
  {
    chainAgentId: 5,
    agentKey: "yieldr",
    name: "Yieldr",
    handle: "yieldr.0g",
    category: "DeFi",
    tagline: "Allocates idle capital across DeFi",
    description:
      "Risk-scored DeFi allocator that rebalances based on rates, TVL and your guardrails.",
    skills: ["Yield", "Rebalance", "Risk"],
    skillHandles: [
      { handle: "scan_yield_opportunities", label: "Scan yield opportunities" },
      { handle: "rebalance_plan", label: "Propose rebalance plan" },
      { handle: "risk_check", label: "Risk / drawdown check" },
    ],
    allowedHandlers: [],
  },
  {
    chainAgentId: 6,
    agentKey: "audita",
    name: "Audita",
    handle: "audita.0g",
    category: "Reports",
    tagline: "Continuous onchain audit trail",
    description:
      "Verifies transactions and flags anomalies in your treasury operations.",
    skills: ["Audit", "Anomaly", "Treasury"],
    skillHandles: [
      { handle: "audit_trail_export", label: "Export audit trail" },
      { handle: "anomaly_scan", label: "Run anomaly scan" },
      { handle: "treasury_verify", label: "Verify treasury movements" },
      { handle: "generate_pdf", label: "Generate audit PDF" },
    ],
    allowedHandlers: ["generate_financial_activity_report"],
  },
  {
    chainAgentId: 7,
    agentKey: "settler",
    name: "Settler",
    handle: "settler.0g",
    category: "Payments",
    tagline: "Automated payroll & vendor settlement",
    description:
      "Schedules and settles recurring vendor and contractor payouts.",
    skills: ["Payroll", "Recurring", "Batch"],
    skillHandles: [
      { handle: "schedule_payroll", label: "Schedule payroll run" },
      { handle: "batch_payout", label: "Plan batch payout" },
      { handle: "vendor_settlement", label: "Vendor settlement draft" },
      { handle: "generate_pdf", label: "Generate settlement PDF" },
    ],
    allowedHandlers: [
      "create_x402_payment",
      "generate_payment_invoice",
      "generate_financial_activity_report",
    ],
  },
  {
    chainAgentId: 8,
    agentKey: "quanta",
    name: "Quanta",
    handle: "quanta.0g",
    category: "DeFi",
    tagline: "Quant strategies for stablecoin yield",
    description:
      "Runs market-neutral strategies with strict drawdown limits.",
    skills: ["Quant", "Stables", "Hedging"],
    skillHandles: [
      { handle: "quant_backtest", label: "Describe quant backtest" },
      { handle: "stable_yield_scan", label: "Scan stablecoin yield" },
      { handle: "hedge_plan", label: "Hedging / neutral plan" },
      { handle: "generate_pdf", label: "Export strategy summary PDF" },
    ],
    allowedHandlers: [],
  },
  {
    chainAgentId: 9,
    agentKey: "ramp",
    name: "Ramp",
    handle: "ramp.0g",
    category: "Payments",
    tagline: "Card to crypto on-ramp",
    description:
      "Creates a Stripe Checkout link so you can pay in USD and receive supported ERC-20 tokens on 0G after settlement.",
    skills: ["On-ramp", "Stripe", "Stablecoins"],
    skillHandles: [
      {
        handle: "stripe_on_ramp",
        label: "Create Stripe on-ramp checkout (card → token)",
      },
    ],
    allowedHandlers: ["on_ramp_tokens"],
  },
  {
    chainAgentId: 10,
    agentKey: "passport",
    name: "Passport",
    handle: "passport.0g",
    category: "Compliance",
    tagline: "Verify with Stripe Identity",
    description:
      "Starts Stripe Identity document verification so your account can reach a verified KYC status.",
    skills: ["KYC", "Identity", "Compliance"],
    skillHandles: [
      {
        handle: "stripe_identity_kyc",
        label: "Complete Stripe Identity verification",
      },
    ],
    allowedHandlers: ["complete_stripe_kyc"],
  },
  {
    chainAgentId: 11,
    agentKey: "capita",
    name: "Capita",
    handle: "capita.0g",
    category: "Payments",
    tagline: "Virtual company cards with a spend balance",
    description:
      "Issues virtual payment cards tied to your wallet, stores a full billing profile, and tracks an available balance you can fund or withdraw from the dashboard.",
    skills: ["Cards", "Treasury", "Spend controls"],
    skillHandles: [
      {
        handle: "create_payment_card",
        label: "Create virtual payment card",
      },
    ],
    allowedHandlers: ["create_credit_card"],
  },
] as const;

/** Root-relative PNG under `app/public/images` for catalog seed agents. */
function catalogSeedAvatarPath(agentKey: string): string {
  const stem = agentKey === "beam-default" ? "beam" : agentKey;
  return `/images/${stem}.png`;
}

function seedRowToAgent(row: SeedRow): Agent {
  return {
    id: row.agentKey,
    name: row.name,
    handle: row.handle,
    avatar: row.imageUrl ? row.imageUrl : catalogSeedAvatarPath(row.agentKey),
    category: row.category,
    tagline: row.tagline,
    description: row.description,
    // No synthetic engagement or pricing; UI hides missing stats.
    skills: [...row.skills],
    creator: "Beam catalog",
    skillHandles: [...row.skillHandles],
    chainAgentId: row.chainAgentId,
  };
}

const CHAT_SUGGESTIONS = [
  "Summarize last month’s onchain P&L",
  "Draft an invoice for Acme Labs",
  "What are the best stablecoin yields right now?",
  "Estimate my crypto tax exposure for Q3",
  "Create an x402 checkout link I can send to a payer",
  "Help me buy stablecoins on 0G with a card",
  "Start identity verification for my account",
  "Create a virtual payment card with my billing address",
] as const;

const DEFAULT_HIRED_IDS = ["beam-default", "ledger", "fiscus"] as const;

const ALL_CATEGORIES: readonly AgentCategory[] = [
  "Payments",
  "Taxes",
  "Reports",
  "DeFi",
  "Compliance",
  "General",
] as const;

/** Public marketplace payload for `GET /agents/catalog`. */
export function buildStardormCatalogResponse(): CatalogResponse {
  const agents = STARDORM_CATALOG_SEED.map(seedRowToAgent);
  return catalogResponseSchema.parse({
    agents,
    categories: [...ALL_CATEGORIES],
    defaultHiredIds: [...DEFAULT_HIRED_IDS],
    chatSuggestions: [...CHAT_SUGGESTIONS],
  });
}

const KEY_TO_CHAIN = Object.fromEntries(
  STARDORM_CATALOG_SEED.map((r) => [r.agentKey, r.chainAgentId]),
) as Record<string, number>;

const CHAIN_TO_KEY = Object.fromEntries(
  STARDORM_CATALOG_SEED.map((r) => [r.chainAgentId, r.agentKey]),
) as Record<number, string>;

const ALLOWED_HANDLERS_BY_KEY: Record<string, readonly HandlerActionId[]> =
  Object.fromEntries(
    STARDORM_CATALOG_SEED.map((r) => [r.agentKey, r.allowedHandlers]),
  );

/** Resolve URL `agentKey` or numeric string to ERC-8004 `agentId` for inference. */
export function resolveStardormChainAgentId(agentKey: string): number | null {
  const trimmed = agentKey.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const hit = KEY_TO_CHAIN[trimmed];
  return hit ?? null;
}

/** Reverse of `resolveStardormChainAgentId`: ERC-8004 `agentId` → catalog `agentKey`. */
export function resolveStardormAgentKey(
  chainAgentId: number | bigint | string,
): string | null {
  const n =
    typeof chainAgentId === "string"
      ? Number.parseInt(chainAgentId, 10)
      : Number(chainAgentId);
  if (!Number.isFinite(n) || n <= 0) return null;
  return CHAIN_TO_KEY[n] ?? null;
}

/**
 * Backend handler ids the model is allowed to propose for a given catalog
 * agent. Filtered against `HANDLER_ACTION_IDS` so unknown ids are dropped.
 */
export function getAllowedHandlersForAgentKey(
  agentKey: string,
): HandlerActionId[] {
  const allowed = ALLOWED_HANDLERS_BY_KEY[agentKey.trim()] ?? [];
  return allowed.filter((h): h is HandlerActionId =>
    (HANDLER_ACTION_IDS as readonly string[]).includes(h),
  );
}

/**
 * Union of handler ids any of the given catalog agents may propose, in stable
 * `HANDLER_ACTION_IDS` order. Used when the user still has active on-chain
 * subscriptions to specialists while chatting with another agent (e.g. Beam).
 */
export function mergeAllowedHandlersForAgentKeys(
  agentKeys: readonly string[],
): HandlerActionId[] {
  const set = new Set<HandlerActionId>();
  for (const raw of agentKeys) {
    for (const h of getAllowedHandlersForAgentKey(raw)) {
      set.add(h);
    }
  }
  return HANDLER_ACTION_IDS.filter((h) => set.has(h));
}

/**
 * First catalog agent in seed order among `candidateAgentKeys` that is allowed
 * to run `handler`. Used to attribute a tool-call turn to the specialist agent
 * (e.g. `ledger` for x402, `fiscus` for tax) instead of the composing agent.
 */
export function resolveCatalogAgentKeyForHandler(
  handler: HandlerActionId,
  candidateAgentKeys: readonly string[],
): string | null {
  const keySet = new Set(candidateAgentKeys.map((k) => k.trim()));
  for (const row of STARDORM_CATALOG_SEED) {
    if (!keySet.has(row.agentKey)) continue;
    if ((row.allowedHandlers as readonly string[]).includes(handler)) {
      return row.agentKey;
    }
  }
  return null;
}
