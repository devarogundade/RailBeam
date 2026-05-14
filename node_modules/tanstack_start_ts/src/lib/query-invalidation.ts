import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/** Stardorm catalog (all viewer variants for this chain). */
export function invalidateAgentsCatalogForChain(qc: QueryClient, beamChainId: number) {
  void qc.invalidateQueries({
    queryKey: [...queryKeys.agents.all, "catalog", beamChainId],
    exact: false,
  });
}

/** Subgraph-backed data for one Beam chain (hires, agents, feedbacks, validations, …). */
export function invalidateSubgraphChain(qc: QueryClient, beamChainId: number) {
  void qc.invalidateQueries({
    queryKey: queryKeys.subgraph.chainScope(beamChainId),
    exact: false,
  });
}

/** After identity-registry writes (subscribe, clone, transfer, URI, …). */
export function invalidateAfterIdentityRegistryWrite(qc: QueryClient, beamChainId: number) {
  invalidateAgentsCatalogForChain(qc, beamChainId);
  invalidateSubgraphChain(qc, beamChainId);
}

/** Dashboard / treasury panels backed by the Beam API. */
export function invalidateBeamHttpDashboardLists(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.beamHttp.paymentRequests() });
  void qc.invalidateQueries({ queryKey: queryKeys.beamHttp.kycStatus() });
  void qc.invalidateQueries({ queryKey: queryKeys.beamHttp.onRamps() });
  void qc.invalidateQueries({ queryKey: queryKeys.beamHttp.creditCards() });
}
