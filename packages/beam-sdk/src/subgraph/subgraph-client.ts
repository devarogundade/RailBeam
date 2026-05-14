import { agentGraphEntityIdFromChainAgentId } from "./entity-ids.js";
import { postGraphql } from "./graphql.js";
import { mapAgentRow, mapFeedbackRow, mapValidationRow } from "./map-rows.js";
import {
  GET_AGENT,
  GET_AGENTS_PAGE,
  GET_FEEDBACKS_BY_AGENT,
  GET_VALIDATION_BY_REQUEST_HASH,
  GET_VALIDATIONS_BY_AGENT,
} from "./queries.js";
import type { SubgraphAgent, SubgraphFeedback, SubgraphValidation } from "./types.js";

function chainAgentIdBigInt(agentId: bigint | number | string): bigint {
  if (typeof agentId === "bigint") return agentId;
  const s = typeof agentId === "string" ? agentId.trim() : String(agentId);
  return BigInt(s);
}

/** Graph `Bytes!` variables expect `0x` + hex; accept bare 64-char hashes. */
export function normalizeGraphBytesInput(hash: string): string {
  const t = hash.trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(t)) return `0x${t}`;
  return hash.trim();
}

export type BeamSubgraphClientOptions = {
  /** GraphQL HTTP endpoint for the Stardorm / Beam subgraph. */
  url: string;
  fetchImpl?: typeof fetch;
};

export class BeamSubgraphClient {
  private readonly url: string;

  private readonly fetchImpl: typeof fetch;

  constructor(opts: BeamSubgraphClientOptions) {
    this.url = opts.url.trim();
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Paginated registry agents (`page` is 1-based; `pageSize` maps to The Graph `first` / `skip`).
   */
  async agents(page: number, pageSize: number): Promise<SubgraphAgent[]> {
    if (page < 1 || !Number.isFinite(page)) {
      throw new Error("agents: page must be a finite integer >= 1");
    }
    if (pageSize < 1 || !Number.isFinite(pageSize)) {
      throw new Error("agents: pageSize must be a finite integer >= 1");
    }
    const skip = (page - 1) * pageSize;
    const data = await postGraphql<{
      agents: Record<string, unknown>[];
    }>(
      this.url,
      GET_AGENTS_PAGE,
      { first: pageSize, skip },
      this.fetchImpl,
    );
    return (data.agents ?? []).map((row) => mapAgentRow(row));
  }

  async agentByEntityId(id: string): Promise<SubgraphAgent | null> {
    const data = await postGraphql<{ agent: Record<string, unknown> | null }>(
      this.url,
      GET_AGENT,
      { id },
      this.fetchImpl,
    );
    if (!data.agent) return null;
    return mapAgentRow(data.agent);
  }

  async agentByChainAgentId(
    agentId: bigint | number | string,
  ): Promise<SubgraphAgent | null> {
    const id = agentGraphEntityIdFromChainAgentId(chainAgentIdBigInt(agentId));
    return this.agentByEntityId(id);
  }

  async feedbacksByAgentId(
    agentId: bigint | number | string,
    opts?: { first?: number; skip?: number },
  ): Promise<SubgraphFeedback[]> {
    const first = opts?.first ?? 100;
    const skip = opts?.skip ?? 0;
    const data = await postGraphql<{
      feedbacks: Record<string, unknown>[];
    }>(
      this.url,
      GET_FEEDBACKS_BY_AGENT,
      {
        agentId: chainAgentIdBigInt(agentId).toString(),
        first,
        skip,
      },
      this.fetchImpl,
    );
    return data.feedbacks.map((row) => mapFeedbackRow(row));
  }

  async validationsByAgentId(
    agentId: bigint | number | string,
    opts?: { first?: number; skip?: number },
  ): Promise<SubgraphValidation[]> {
    const first = opts?.first ?? 100;
    const skip = opts?.skip ?? 0;
    const data = await postGraphql<{
      validations: Record<string, unknown>[];
    }>(
      this.url,
      GET_VALIDATIONS_BY_AGENT,
      {
        agentId: chainAgentIdBigInt(agentId).toString(),
        first,
        skip,
      },
      this.fetchImpl,
    );
    return data.validations.map((row) => mapValidationRow(row));
  }

  async validationByRequestHash(
    requestHash: string,
  ): Promise<SubgraphValidation | null> {
    const data = await postGraphql<{
      validations: Record<string, unknown>[];
    }>(
      this.url,
      GET_VALIDATION_BY_REQUEST_HASH,
      { requestHash: normalizeGraphBytesInput(requestHash) },
      this.fetchImpl,
    );
    const row = data.validations[0];
    return row ? mapValidationRow(row) : null;
  }
}
