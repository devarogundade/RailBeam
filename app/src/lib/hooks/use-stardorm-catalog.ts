import { useQuery } from "@tanstack/react-query";
import { useConnection } from "wagmi";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { queryKeys } from "@/lib/query-keys";
import type { CatalogResponse } from "@beam/stardorm-api-contract";
import { fetchStardormCatalog } from "@/lib/stardorm-catalog";

/** Remote catalog: agents, categories, default hires, chat suggestions. */
export function useStardormCatalog() {
  const { effectiveChainId } = useBeamNetwork();
  const { address, status } = useConnection();
  const viewerKey =
    status === "connected" && address
      ? (address.toLowerCase() as `0x${string}`)
      : null;
  return useQuery<CatalogResponse, Error>({
    queryKey: queryKeys.agents.catalog(effectiveChainId, viewerKey),
    queryFn: () => fetchStardormCatalog(effectiveChainId, viewerKey ?? undefined),
    staleTime: 60_000,
  });
}
