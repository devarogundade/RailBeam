import type { Agent, AgentCategory } from "./agent.js";
import { catalogResponseSchema, type CatalogResponse } from "./catalog.js";

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

/** When the subgraph lists these agents, the client pre-hires them for new wallets. */
const DEFAULT_HIRED_IDS = ["beam-default", "chain-2", "chain-3"] as const;

const ALL_CATEGORIES: readonly AgentCategory[] = [
  "Payments",
  "Taxes",
  "Reports",
  "DeFi",
  "Compliance",
  "General",
] as const;

/**
 * Offline / API-only catalog: default Beam row (mirrors on-chain token 1 after ignition seed).
 * Full marketplace listings come from the subgraph.
 */
const BEAM_DEFAULT_AGENT: Agent = {
  id: "beam-default",
  name: "Beam",
  handle: "beam.0g",
  avatar: "/images/beam.png",
  category: "General",
  tagline: "Your default conversational agent",
  description:
    "Beam routes your prompts to the best hired agent and handles general financial questions.",
  skills: ["Routing", "General Q&A", "Wallet"],
  creator: "Beam",
  chainAgentId: 1,
};

/** Public marketplace payload for `GET /agents/catalog` when no subgraph is wired. */
export function buildStardormCatalogResponse(): CatalogResponse {
  return catalogResponseSchema.parse({
    agents: [BEAM_DEFAULT_AGENT],
    categories: [...ALL_CATEGORIES],
    defaultHiredIds: [...DEFAULT_HIRED_IDS],
    chatSuggestions: [...CHAT_SUGGESTIONS],
  });
}
