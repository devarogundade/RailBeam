import type { Agent } from "@/lib/types";

/**
 * Identity registry token #1 — default Beam agent, free for all.
 * Matches catalog `beam-default`, subgraph `chain-1`, and on-chain `chainAgentId`.
 */
export function isRegistryTokenIdOneAgent(agent: Pick<Agent, "id" | "chainAgentId">): boolean {
  if (agent.chainAgentId === 1) return true;
  if (agent.id === "beam-default") return true;
  const m = /^chain-(\d+)$/.exec(agent.id);
  return m != null && m[1] === "1";
}

/** Tailwind classes for the avatar ring on registry token #1. */
export const REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS =
  "ring-2 ring-primary ring-offset-2 ring-offset-background";

/** Avoid "hire" / "fire" copy for the default registry agent (token #1). */
export function agentPortfolioAddVerb(agent: Pick<Agent, "id" | "chainAgentId">): "Chat" | "Hire" {
  return isRegistryTokenIdOneAgent(agent) ? "Chat" : "Hire";
}

export function agentPortfolioAddedBadge(agent: Pick<Agent, "id" | "chainAgentId">): "In chat" | "Hired" {
  return isRegistryTokenIdOneAgent(agent) ? "In chat" : "Hired";
}

/** Primary CTA label (detail page, hire dialog title, etc.). */
export function agentPortfolioAddCta(agent: Pick<Agent, "id" | "chainAgentId">, name: string): string {
  return isRegistryTokenIdOneAgent(agent) ? `Chat with ${name}` : `Hire ${name}`;
}

export function agentPortfolioRemoveCta(agent: Pick<Agent, "id" | "chainAgentId">): "Remove agent" | "Fire agent" {
  return isRegistryTokenIdOneAgent(agent) ? "Remove agent" : "Fire agent";
}

export function agentPortfolioRemoveDialogTitle(
  agent: Pick<Agent, "id" | "chainAgentId">,
  name: string,
): string {
  return isRegistryTokenIdOneAgent(agent) ? `Remove ${name}?` : `Fire ${name}?`;
}
