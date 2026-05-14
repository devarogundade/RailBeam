import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type { AgentFeedbacksPageResponse } from "@beam/stardorm-api-contract";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { queryKeys } from "@/lib/query-keys";
import { fetchAgentFeedbacksPage } from "@/lib/stardorm-agent-feedbacks";
import { getStardormSubgraphUrl, getStardormSubgraphUrlForChain } from "@/lib/stardorm-subgraph-config";

const DEFAULT_PAGE_SIZE = 15;

export function useAgentFeedbacksInfinite(
  catalogAgentId: string,
  chainAgentId: number | undefined,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const enabled = Boolean(getStardormSubgraphUrl() && subgraphUrl && chainAgentId != null);
  return useInfiniteQuery<
    AgentFeedbacksPageResponse,
    Error,
    InfiniteData<AgentFeedbacksPageResponse>,
    ReturnType<typeof queryKeys.subgraph.feedbacksInfinite>,
    number
  >({
    queryKey: queryKeys.subgraph.feedbacksInfinite(effectiveChainId, catalogAgentId, pageSize),
    queryFn: ({ pageParam }) =>
      fetchAgentFeedbacksPage(chainAgentId!, { limit: pageSize, skip: pageParam }, {
        subgraphUrl: subgraphUrl!,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page.hasMore ? lastPage.page.skip + lastPage.page.limit : undefined,
    enabled,
    staleTime: 30_000,
  });
}
