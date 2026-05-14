import { useQuery } from "@tanstack/react-query";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { queryKeys } from "@/lib/query-keys";
import type { CatalogResponse } from "@beam/stardorm-api-contract";
import { fetchStardormCatalog } from "@/lib/stardorm-catalog";

/** Remote catalog: agents, categories, default hires, chat suggestions. */
export function useStardormCatalog() {
  const { effectiveChainId } = useBeamNetwork();
  return useQuery<CatalogResponse, Error>({
    queryKey: queryKeys.agents.catalog(effectiveChainId),
    queryFn: () => fetchStardormCatalog(effectiveChainId),
    staleTime: 60_000,
  });
}
