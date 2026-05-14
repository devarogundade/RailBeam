import {
  buildStardormCatalogResponse,
  catalogResponseSchema,
  type CatalogResponse,
} from "@beam/stardorm-api-contract";
import { fetchTyped } from "./api";
import { getStardormApiBase } from "./stardorm-axios";
import { getStardormSubgraphUrlForChain } from "./stardorm-subgraph-config";
import { fetchSubgraphBackedCatalogResponse } from "./stardorm-subgraph-catalog";

/**
 * Public marketplace catalog (no JWT).
 * Prefers the Stardorm subgraph when `VITE_STARDORM_SUBGRAPH_URL` is set; otherwise `GET /agents/catalog`;
 * if the API base URL is unset, falls back to the bundled seed catalog.
 */
export async function fetchStardormCatalog(beamChainId?: number): Promise<CatalogResponse> {
  const subgraphUrl = getStardormSubgraphUrlForChain(beamChainId);
  if (subgraphUrl) {
    return fetchSubgraphBackedCatalogResponse({ subgraphUrl });
  }
  const base = getStardormApiBase();
  if (!base) {
    return buildStardormCatalogResponse();
  }
  const catalogUrl = `${base.replace(/\/$/, "")}/agents/catalog`;
  return fetchTyped(catalogUrl, catalogResponseSchema);
}
