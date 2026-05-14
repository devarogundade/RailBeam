/** Typed TanStack Query key segments for consistent cache identity. */
export const queryKeys = {
  user: {
    all: ["stardorm", "user"] as const,
    me: (wallet: `0x${string}` | null) => [...queryKeys.user.all, "me", wallet] as const,
    conversations: (wallet: `0x${string}` | null) =>
      [...queryKeys.user.all, "conversations", wallet] as const,
    chatMessages: (wallet: `0x${string}` | null, conversationId: string) =>
      [...queryKeys.user.all, "chatMessages", wallet, conversationId] as const,
  },
  agents: {
    all: ["agents"] as const,
    list: () => [...queryKeys.agents.all, "list"] as const,
    catalog: (beamChainId: number) => [...queryKeys.agents.all, "catalog", beamChainId] as const,
    detail: (id: string) => [...queryKeys.agents.all, "detail", id] as const,
  },
  subgraph: {
    all: ["subgraph"] as const,
    recentSubscriptions: (beamChainId: number, user: `0x${string}` | null, limit: number) =>
      [...queryKeys.subgraph.all, beamChainId, "userSubscriptions", "recent", user, limit] as const,
    /** Active `userSubscriptions` (endDate after now) for portfolio / hire state. */
    myActiveHires: (beamChainId: number, user: `0x${string}` | null) =>
      [...queryKeys.subgraph.all, beamChainId, "myActiveHires", user] as const,
    agentByEntityId: (beamChainId: number, id: string) =>
      [...queryKeys.subgraph.all, beamChainId, "agent", "entity", id] as const,
    /** ERC-8004 on-chain numeric id (not the same as EVM `beamChainId`). */
    agentByChainId: (beamChainId: number, chainAgentId: number) =>
      [...queryKeys.subgraph.all, beamChainId, "agent", "chain", chainAgentId] as const,
    agentsPage: (beamChainId: number, first: number, skip: number) =>
      [...queryKeys.subgraph.all, beamChainId, "agents", "page", first, skip] as const,
    /** Prefix for `invalidateQueries` after feedback txs; infinite queries nest under this. */
    agentFeedbacks: (beamChainId: number, catalogAgentId: string) =>
      [...queryKeys.subgraph.all, beamChainId, "agentFeedbacks", catalogAgentId] as const,
    feedbacksInfinite: (beamChainId: number, catalogAgentId: string, pageSize: number) =>
      [...queryKeys.subgraph.agentFeedbacks(beamChainId, catalogAgentId), "infinite", pageSize] as const,
    feedbacksForAgent: (beamChainId: number, chainAgentId: number, first: number, skip: number) =>
      [...queryKeys.subgraph.all, beamChainId, "feedbacks", chainAgentId, first, skip] as const,
    feedbackResponsesForAgent: (
      beamChainId: number,
      chainAgentId: number,
      first: number,
      skip: number,
    ) =>
      [
        ...queryKeys.subgraph.all,
        beamChainId,
        "feedbackResponses",
        chainAgentId,
        first,
        skip,
      ] as const,
    validationsForAgent: (beamChainId: number, chainAgentId: number, first: number, skip: number) =>
      [...queryKeys.subgraph.all, beamChainId, "validations", chainAgentId, first, skip] as const,
    validationByRequestHash: (beamChainId: number, requestHash: string) =>
      [...queryKeys.subgraph.all, beamChainId, "validation", "requestHash", requestHash] as const,
    userSubscriptionsPage: (
      beamChainId: number,
      user: `0x${string}` | null,
      first: number,
      skip: number,
    ) =>
      [...queryKeys.subgraph.all, beamChainId, "userSubscriptions", "page", user, first, skip] as const,
  },
} as const;
