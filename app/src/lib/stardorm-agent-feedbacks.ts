import {
  agentFeedbacksPageResponseSchema,
  agentFeedbacksQuerySchema,
  type AgentFeedbacksPageResponse,
} from "@beam/stardorm-api-contract";
import { fetchSubgraphFeedbacksForAgent } from "./stardorm-subgraph-queries";

/**
 * Paginated on-chain feedback for an agent from the Stardorm subgraph (`feedbacks` collection).
 * `chainAgentId` is the ERC-8004 numeric token id (same as `agent.chainAgentId` in the catalog).
 */
export async function fetchAgentFeedbacksPage(
  chainAgentId: number,
  query: unknown,
  opts: { subgraphUrl: string },
): Promise<AgentFeedbacksPageResponse> {
  const q = agentFeedbacksQuerySchema.parse(query);
  const rows = await fetchSubgraphFeedbacksForAgent(chainAgentId, q.limit + 1, q.skip, {
    subgraphUrl: opts.subgraphUrl,
  });
  const hasMore = rows.length > q.limit;
  const feedbacks = rows.slice(0, q.limit);
  return agentFeedbacksPageResponseSchema.parse({
    feedbacks,
    page: { limit: q.limit, skip: q.skip, hasMore },
  });
}
