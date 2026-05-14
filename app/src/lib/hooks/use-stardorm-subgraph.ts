import { useQuery } from "@tanstack/react-query";
import { isBeamConfiguredChainId } from "@/lib/beam-chain-config";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { queryKeys } from "@/lib/query-keys";
import type { AgentOnchainFeedbackItem } from "@beam/stardorm-api-contract";
import type { UserSubscriptionNode } from "@/lib/schemas/subgraph";
import {
  fetchActiveSubscribedChainAgentIds,
  fetchRecentUserSubscriptions,
  fetchSubgraphAgentByChainAgentId,
  fetchSubgraphAgentByEntityId,
  fetchSubgraphAgentsPage,
  fetchSubgraphFeedbacksForAgent,
  fetchSubgraphFeedbackResponsesForAgent,
  fetchSubgraphUserSubscriptionsPage,
  fetchSubgraphValidationByRequestHash,
  fetchSubgraphValidationsForAgent,
  type SubgraphAgentMapped,
  type SubgraphFeedbackResponseMapped,
  type SubgraphValidationMapped,
} from "@/lib/stardorm-subgraph";
import { getStardormSubgraphUrlForChain } from "@/lib/stardorm-subgraph-config";

function subgraphEnabledForEffectiveChain(chainId: number, subgraphUrl: string | undefined): boolean {
  return Boolean(subgraphUrl && isBeamConfiguredChainId(chainId));
}

function normalizeUser(user: `0x${string}` | null | undefined): `0x${string}` | null {
  if (!user) return null;
  return user.toLowerCase() as `0x${string}`;
}

/** Recent `userSubscriptions` rows (global or filtered by wallet). */
export function useStardormRecentSubscriptions(opts: {
  user?: `0x${string}` | undefined;
  limit?: number;
}) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const limit = opts.limit ?? 20;
  const userKey = normalizeUser(opts.user ?? null);
  const userArg = opts.user ? (opts.user.toLowerCase() as `0x${string}`) : undefined;

  return useQuery({
    queryKey: queryKeys.subgraph.recentSubscriptions(effectiveChainId, userKey, limit),
    queryFn: (): Promise<UserSubscriptionNode[]> =>
      fetchRecentUserSubscriptions(
        { limit, user: userArg },
        { subgraphUrl: subgraphUrl! },
      ),
    enabled: subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl),
  });
}

/** Paginated `userSubscriptions` (TanStack wrapper). */
export function useStardormUserSubscriptionsPage(opts: {
  user?: `0x${string}` | null;
  first: number;
  skip: number;
}) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const userKey = normalizeUser(opts.user ?? null);
  const userArg = opts.user ? (opts.user.toLowerCase() as `0x${string}`) : undefined;

  return useQuery({
    queryKey: queryKeys.subgraph.userSubscriptionsPage(
      effectiveChainId,
      userKey,
      opts.first,
      opts.skip,
    ),
    queryFn: () =>
      fetchSubgraphUserSubscriptionsPage(
        { first: opts.first, skip: opts.skip, user: userArg },
        { subgraphUrl: subgraphUrl! },
      ),
    enabled: subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl),
  });
}

/** Chain `agentId`s the wallet still has an active indexer subscription for. */
export function useMyActiveSubscribedChainAgentIds(user: `0x${string}` | null) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const userKey = normalizeUser(user);

  return useQuery({
    queryKey: queryKeys.subgraph.myActiveHires(effectiveChainId, userKey),
    queryFn: () => fetchActiveSubscribedChainAgentIds(user!, { subgraphUrl: subgraphUrl! }),
    enabled: Boolean(subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl) && userKey),
  });
}

/** `agent(id:)` with nested metadata. */
export function useStardormAgentByEntityId(entityId: string | null) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);

  return useQuery({
    queryKey: queryKeys.subgraph.agentByEntityId(effectiveChainId, entityId ?? "__none__"),
    queryFn: (): Promise<SubgraphAgentMapped | null> =>
      fetchSubgraphAgentByEntityId(entityId!, { subgraphUrl: subgraphUrl! }),
    enabled: Boolean(subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl) && entityId),
  });
}

/** Numeric ERC-8004 token id → full subgraph `Agent`. */
export function useStardormAgentByChainId(chainAgentId: number | null | undefined) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const id = chainAgentId ?? null;

  return useQuery({
    queryKey: queryKeys.subgraph.agentByChainId(effectiveChainId, id ?? 0),
    queryFn: (): Promise<SubgraphAgentMapped | null> =>
      fetchSubgraphAgentByChainAgentId(id!, { subgraphUrl: subgraphUrl! }),
    enabled: Boolean(subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl) && id != null && id > 0),
  });
}

/** `agents` collection page (sorted by block time desc in query). */
export function useStardormAgentsPage(opts: { first: number; skip: number }) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);

  return useQuery({
    queryKey: queryKeys.subgraph.agentsPage(effectiveChainId, opts.first, opts.skip),
    queryFn: () =>
      fetchSubgraphAgentsPage(
        { first: opts.first, skip: opts.skip },
        { subgraphUrl: subgraphUrl! },
      ),
    enabled: subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl),
  });
}

/** `feedbacks` for one on-chain agent (non-infinite; use `useAgentFeedbacksInfinite` for scroll). */
export function useStardormFeedbacksForAgent(
  chainAgentId: number | null | undefined,
  opts: { first: number; skip: number },
) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const id = chainAgentId ?? null;

  return useQuery({
    queryKey:
      id != null
        ? queryKeys.subgraph.feedbacksForAgent(effectiveChainId, id, opts.first, opts.skip)
        : (["subgraph", "feedbacks", "disabled"] as const),
    queryFn: (): Promise<AgentOnchainFeedbackItem[]> =>
      fetchSubgraphFeedbacksForAgent(id!, opts.first, opts.skip, { subgraphUrl: subgraphUrl! }),
    enabled: Boolean(subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl) && id != null && id > 0),
  });
}

/** `feedbackResponses` for one agent. */
export function useStardormFeedbackResponsesForAgent(
  chainAgentId: number | null | undefined,
  opts: { first: number; skip: number },
) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const id = chainAgentId ?? null;

  return useQuery({
    queryKey:
      id != null
        ? queryKeys.subgraph.feedbackResponsesForAgent(
            effectiveChainId,
            id,
            opts.first,
            opts.skip,
          )
        : (["subgraph", "feedbackResponses", "disabled"] as const),
    queryFn: (): Promise<SubgraphFeedbackResponseMapped[]> =>
      fetchSubgraphFeedbackResponsesForAgent(id!, opts.first, opts.skip, {
        subgraphUrl: subgraphUrl!,
      }),
    enabled: Boolean(subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl) && id != null && id > 0),
  });
}

/** `validations` for one agent. */
export function useStardormValidationsForAgent(
  chainAgentId: number | null | undefined,
  opts: { first: number; skip: number },
) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const id = chainAgentId ?? null;

  return useQuery({
    queryKey:
      id != null
        ? queryKeys.subgraph.validationsForAgent(effectiveChainId, id, opts.first, opts.skip)
        : (["subgraph", "validations", "disabled"] as const),
    queryFn: (): Promise<SubgraphValidationMapped[]> =>
      fetchSubgraphValidationsForAgent(id!, opts.first, opts.skip, { subgraphUrl: subgraphUrl! }),
    enabled: Boolean(subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl) && id != null && id > 0),
  });
}

/** Single validation row by `requestHash` (first match). */
export function useStardormValidationByRequestHash(requestHash: string | null | undefined) {
  const { effectiveChainId } = useBeamNetwork();
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const h = requestHash?.trim() ?? "";

  return useQuery({
    queryKey: queryKeys.subgraph.validationByRequestHash(effectiveChainId, h || "__none__"),
    queryFn: (): Promise<SubgraphValidationMapped | null> =>
      fetchSubgraphValidationByRequestHash(h, { subgraphUrl: subgraphUrl! }),
    enabled: Boolean(subgraphEnabledForEffectiveChain(effectiveChainId, subgraphUrl) && h.length > 2),
  });
}
