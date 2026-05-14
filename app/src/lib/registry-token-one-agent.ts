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

/**
 * True when this row is an ERC-7857 registry clone owned by the viewer.
 * You cannot `subscribe` (hire) your own clone token — use it directly from your wallet.
 */
export function isViewerOwnedClone(
  agent: Pick<Agent, "id" | "isCloned" | "ownerAddress">,
  viewerAddress: string | null | undefined,
  ownedCloneIds?: ReadonlySet<string>,
): boolean {
  if (agent.isCloned !== true) return false;
  if (ownedCloneIds?.has(agent.id)) return true;
  if (viewerAddress == null || viewerAddress === "") return false;
  const v = viewerAddress.trim().toLowerCase();
  return Boolean(agent.ownerAddress && agent.ownerAddress === v);
}

/** On-chain clone is not offered for the default Beam listing (registry token #1). */
export function canUserCloneCatalogAgent(
  agent: Pick<Agent, "id" | "chainAgentId" | "isCloned">,
): boolean {
  if (agent.isCloned === true) return false;
  if (agent.chainAgentId == null) return false;
  return !isRegistryTokenIdOneAgent(agent);
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
