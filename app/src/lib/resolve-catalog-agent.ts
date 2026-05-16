import type { Agent, CatalogResponse } from "@railbeam/stardorm-api-contract";
import {
  buildStardormCatalogResponse,
  resolveStardormAgentKey,
  resolveStardormChainAgentId,
} from "@railbeam/stardorm-api-contract";
import type { QueryClient } from "@tanstack/react-query";
import { parseAgentUriFromString } from "./agent-uri-metadata";
import { isBeamConfiguredChainId } from "./beam-chain-config";
import { queryKeys } from "./query-keys";
import { fetchStardormCatalog } from "./stardorm-catalog";
import { mapSubgraphAgentToCatalogAgent } from "./stardorm-subgraph-catalog";
import { fetchSubgraphAgentByChainAgentId } from "./stardorm-subgraph-queries";
import { getStardormSubgraphUrlForChain } from "./stardorm-subgraph-config";

/**
 * Match persisted chat `agentKey` to a catalog row when ids differ
 * (e.g. `beam-default` vs `chain-1` for the same registry token).
 */
export function resolveCatalogAgentForChatBubble(
  persistedAgentKey: string | undefined,
  agents: readonly Agent[],
): Agent | undefined {
  const raw = persistedAgentKey?.trim();
  if (!raw) return undefined;

  const direct = agents.find((a) => a.id === raw);
  if (direct) return direct;

  const chainFromKey = resolveStardormChainAgentId(raw);
  if (chainFromKey != null) {
    const byChainId = agents.find((a) => a.chainAgentId === chainFromKey);
    if (byChainId) return byChainId;
    const prefixed = `chain-${chainFromKey}`;
    const byPrefixed = agents.find((a) => a.id === prefixed);
    if (byPrefixed) return byPrefixed;
  }

  const m = /^chain-(\d+)$/i.exec(raw);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) {
      const byPrefixed = agents.find((a) => a.id === raw);
      if (byPrefixed) return byPrefixed;
      const byChainId = agents.find((a) => a.chainAgentId === n);
      if (byChainId) return byChainId;
      const slug = resolveStardormAgentKey(n);
      if (slug) {
        const bySlug = agents.find((a) => a.id === slug);
        if (bySlug) return bySlug;
      }
    }
  }

  return undefined;
}

/**
 * Resolve a catalog row by `chain-{id}` or static id, then fall back to a direct
 * subgraph read (covers cloned agents omitted from the non-viewer catalog cache).
 */
export async function resolveCatalogAgentByParamId(
  queryClient: QueryClient,
  beamChainId: number,
  agentId: string,
): Promise<Agent | null> {
  await queryClient.ensureQueryData({
    queryKey: queryKeys.agents.catalog(beamChainId, null),
    queryFn: () => fetchStardormCatalog(beamChainId, undefined),
  });
  const data = queryClient.getQueryData<CatalogResponse>(
    queryKeys.agents.catalog(beamChainId, null),
  );
  const fromCatalog = data?.agents.find((a) => a.id === agentId);
  if (fromCatalog) return fromCatalog;

  const chainFromParam = resolveStardormChainAgentId(agentId);
  if (chainFromParam != null) {
    const byChainId = data?.agents.find((a) => a.chainAgentId === chainFromParam);
    if (byChainId) return byChainId;
    const prefixedId = `chain-${chainFromParam}`;
    const byPrefixed = data?.agents.find((a) => a.id === prefixedId);
    if (byPrefixed) return byPrefixed;
    if (!/^chain-\d+$/i.test(agentId)) {
      agentId = prefixedId;
    }
  }

  const m = /^chain-(\d+)$/.exec(agentId);
  if (!m) return null;
  const chainAgentId = Number(m[1]);
  if (!Number.isFinite(chainAgentId) || chainAgentId <= 0) return null;

  const subgraphUrl =
    isBeamConfiguredChainId(beamChainId) ? getStardormSubgraphUrlForChain(beamChainId) : undefined;
  if (!subgraphUrl) return null;

  const row = await fetchSubgraphAgentByChainAgentId(chainAgentId, { subgraphUrl });
  if (!row) return null;

  const seed = buildStardormCatalogResponse();
  const seedByChain = new Map<number, Agent>();
  for (const a of seed.agents) {
    if (a.chainAgentId != null) seedByChain.set(a.chainAgentId, a);
  }
  return mapSubgraphAgentToCatalogAgent(row, seedByChain, parseAgentUriFromString(row.uri));
}
