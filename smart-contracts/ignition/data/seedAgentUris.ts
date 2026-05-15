import { parseEther } from "viem";

type SkillHandle = { handle: string; label: string };

/** Must stay in sync with `stardorm/backend/src/handlers/handler.types` HANDLER_ACTION_IDS */
const SEED_HANDLER_ACTION_IDS = [
  "generate_tax_report",
  "create_x402_payment",
  "generate_financial_report",
  "generate_audit_report",
  "payroll_settlement",
  "defi_strategy",
  "on_ramp_tokens",
  "complete_stripe_kyc",
  "create_credit_card",
  "draft_native_transfer",
  "draft_erc20_transfer",
  "draft_nft_transfer",
  "draft_token_swap",
] as const;
type SeedHandlerActionId = (typeof SEED_HANDLER_ACTION_IDS)[number];

type StardormCatalogAgent = {
  agentKey: string;
  name: string;
  imageUrl: string;
  handle: string;
  category: string;
  tagline: string;
  description: string;
  skills: string[];
  skillHandles: SkillHandle[];
  feesPerDay: string;
  /** Declared handler CTAs; mirrored as registration `metadata` for subgraph `handlerCapabilities` rows */
  handlerCapabilities: readonly SeedHandlerActionId[];
};

const catalogJson: Record<string, StardormCatalogAgent> = {
  "beam-default": {
    agentKey: "beam-default",
    name: "Beam",
    handle: "beam.0g",
    imageUrl: "/images/beam.png",
    category: "General",
    tagline: "Your default conversational agent",
    description:
      "Beam routes your prompts to the best hired agent and handles general financial questions.",
    skills: ["Routing", "General Q&A", "Wallet"],
    skillHandles: [],
    feesPerDay: "0",
    handlerCapabilities: [
      "draft_native_transfer",
      "draft_erc20_transfer",
      "draft_nft_transfer",
      "draft_token_swap",
    ],
  },
  ledger: {
    agentKey: "ledger",
    name: "Ledger",
    imageUrl: "/images/ledger.png",
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
    feesPerDay: parseEther("0.001").toString(),
    handlerCapabilities: ["create_x402_payment"],
  },
  fiscus: {
    agentKey: "fiscus",
    name: "Fiscus",
    imageUrl: "/images/fiscus.png",
    handle: "fiscus.0g",
    category: "Taxes",
    tagline: "Crypto-native tax calculations",
    description:
      "Pulls onchain activity, classifies events, and produces jurisdiction-aware tax reports.",
    skills: ["Tax", "Cost basis", "Reports"],
    skillHandles: [
      { handle: "estimate_crypto_tax", label: "Estimate crypto tax exposure" },
      {
        handle: "classify_transactions",
        label: "Classify onchain transactions",
      },
      {
        handle: "export_tax_packet",
        label: "Export tax packet (CSV / summary)",
      },
      { handle: "generate_pdf", label: "Generate tax summary PDF" },
    ],
    feesPerDay: parseEther("0.001").toString(),
    handlerCapabilities: ["generate_tax_report"],
  },
  scribe: {
    agentKey: "scribe",
    name: "Scribe",
    imageUrl: "/images/scribe.png",
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
    feesPerDay: parseEther("0.002").toString(),
    handlerCapabilities: ["generate_financial_report"],
  },
  yieldr: {
    agentKey: "yieldr",
    name: "Yieldr",
    imageUrl: "/images/yieldr.png",
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
    feesPerDay: parseEther("0.002").toString(),
    handlerCapabilities: ["defi_strategy"],
  },
  audita: {
    agentKey: "audita",
    name: "Audita",
    imageUrl: "/images/audita.png",
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
    feesPerDay: parseEther("0.002").toString(),
    handlerCapabilities: ["generate_audit_report"],
  },
  settler: {
    agentKey: "settler",
    name: "Settler",
    imageUrl: "/images/settler.png",
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
    feesPerDay: parseEther("0.002").toString(),
    handlerCapabilities: ["payroll_settlement"],
  },
  quanta: {
    agentKey: "quanta",
    name: "Quanta",
    imageUrl: "/images/quanta.png",
    handle: "quanta.0g",
    category: "DeFi",
    tagline: "Quant strategies for stablecoin yield",
    description: "Runs market-neutral strategies with strict drawdown limits.",
    skills: ["Quant", "Stables", "Hedging"],
    skillHandles: [
      { handle: "quant_backtest", label: "Describe quant backtest" },
      { handle: "stable_yield_scan", label: "Scan stablecoin yield" },
      { handle: "hedge_plan", label: "Hedging / neutral plan" },
      { handle: "generate_pdf", label: "Export strategy summary PDF" },
    ],
    feesPerDay: parseEther("0.002").toString(),
    handlerCapabilities: ["defi_strategy"],
  },
  ramp: {
    agentKey: "ramp",
    name: "Ramp",
    imageUrl: "/images/ramp.png",
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
    feesPerDay: parseEther("0.002").toString(),
    handlerCapabilities: ["on_ramp_tokens"],
  },
  passport: {
    agentKey: "passport",
    name: "Passport",
    imageUrl: "/images/passport.png",
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
    feesPerDay: parseEther("0.001").toString(),
    handlerCapabilities: ["complete_stripe_kyc"],
  },
  capita: {
    agentKey: "capita",
    name: "Capita",
    imageUrl: "/images/capita.png",
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
    feesPerDay: parseEther("0.002").toString(),
    handlerCapabilities: ["create_credit_card"],
  },
};
/**
 * EIP-8004 registration v1 JSON minted by Ignition (`Stardorm8004` module).
 * Built from the same catalog the backend uses when Mongo has no row.
 */
function catalogAgentSupportsX402(agent: StardormCatalogAgent): boolean {
  return agent.skillHandles.some(
    (s) => s.handle === "create_x402_link" || s.handle === "x402_payment",
  );
}

export function registrationUriFromCatalogAgent(agent: StardormCatalogAgent): {
  uri: string;
  handlerCapabilities: {
    metadataKey: string;
    metadataValue: string;
  };
  feesPerDay: string;
} {
  const x402Support = catalogAgentSupportsX402(agent);
  return {
    uri: JSON.stringify({
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: agent.name,
      description: [agent.tagline, agent.description].filter(Boolean).join(" "),
      agentKey: agent.agentKey,
      imageUrl: agent.imageUrl,
      handle: agent.handle,
      category: agent.category,
      tagline: agent.tagline,
      skills: agent.skills,
      skillHandles: agent.skillHandles,
      services: [
        {
          name: "web",
          endpoint: `https://railbeam.xyz/agents/${agent.agentKey}`,
        },
      ],
      x402Support,
      active: true,
      registrations: [],
      supportedTrust: ["reputation"],
    }),
    handlerCapabilities: {
      metadataKey: "handlerCapabilities",
      metadataValue: agent.handlerCapabilities.join(","),
    },
    feesPerDay: agent.feesPerDay,
  };
}

/** Registration URIs in JSON object key order (beam-default, ledger, …). */
export const STARDORM_SEED_AGENT_URIS: readonly {
  uri: string;
  handlerCapabilities: {
    metadataKey: string;
    metadataValue: string;
  };
  feesPerDay: string;
}[] = Object.values(catalogJson).map(registrationUriFromCatalogAgent);
