import { agentGraphEntityIdFromChainAgentId } from './entity-ids';
import { postGraphql } from './graphql';
import { mapAgentRow, mapFeedbackRow, mapValidationRow } from './map-rows';
import {
  GET_AGENT,
  GET_FEEDBACKS_BY_AGENT,
  GET_USER_SUBSCRIPTIONS_PAGE_FILTERED,
  GET_VALIDATION_BY_REQUEST_HASH,
  GET_VALIDATIONS_BY_AGENT,
} from './queries';
import type { Agent, Feedback, Validation } from './types';

const DEFAULT_SUBGRAPH_ENV = 'STARDORM_SUBGRAPH_URL';

const SUBSCRIPTION_PAGE_SIZE = 100;

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

type UserSubscriptionAgentEndRow = {
  agentId: string;
  endDate: string;
  agent?: { isCloned?: boolean; owner?: string } | null;
};

/** Active subscription on a canonical registry agent (not a clone token). */
function userSubscriptionQualifiesAsHired(
  row: UserSubscriptionAgentEndRow,
  nowSec: bigint,
): boolean {
  let end: bigint;
  try {
    end = BigInt(String(row.endDate));
  } catch {
    return false;
  }
  if (end <= nowSec) return false;
  return row.agent?.isCloned !== true;
}

function resolveSubgraphUrl(explicit?: string): string {
  const url = explicit ?? process.env[DEFAULT_SUBGRAPH_ENV];
  if (!url?.trim()) {
    throw new Error(
      `Missing subgraph URL: pass subgraphUrl or set ${DEFAULT_SUBGRAPH_ENV}`,
    );
  }
  return url.trim();
}

function chainAgentIdBigInt(agentId: bigint | number | string): bigint {
  if (typeof agentId === 'bigint') return agentId;
  const s = typeof agentId === 'string' ? agentId.trim() : String(agentId);
  return BigInt(s);
}

/** Graph `Bytes!` variables expect `0x` + hex; accept bare 64-char hashes. */
export function normalizeGraphBytesInput(hash: string): string {
  const t = hash.trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(t)) return `0x${t}`;
  return hash.trim();
}

/**
 * Load an `Agent` by subgraph entity id (same bytes id the indexer uses, usually `0x…` minimal big-endian).
 */
export async function getAgentById(
  id: string,
  subgraphUrl?: string,
): Promise<Agent | null> {
  const url = resolveSubgraphUrl(subgraphUrl);
  const data = await postGraphql<{ agent: Record<string, unknown> | null }>(
    url,
    GET_AGENT,
    { id },
  );
  if (!data.agent) {
    return null;
  }
  return mapAgentRow(data.agent);
}

/**
 * Convenience: chain-facing ERC-8004 numeric `agentId` → entity id → `getAgentById`.
 */
export async function getAgentByChainAgentId(
  agentId: bigint | number | string,
  subgraphUrl?: string,
): Promise<Agent | null> {
  const id = agentGraphEntityIdFromChainAgentId(chainAgentIdBigInt(agentId));
  return getAgentById(id, subgraphUrl);
}

export async function getFeedbacksByAgentId(
  agentId: bigint | number | string,
  opts?: { subgraphUrl?: string; first?: number; skip?: number },
): Promise<Feedback[]> {
  const url = resolveSubgraphUrl(opts?.subgraphUrl);
  const first = opts?.first ?? 100;
  const skip = opts?.skip ?? 0;
  const data = await postGraphql<{
    feedbacks: Record<string, unknown>[];
  }>(url, GET_FEEDBACKS_BY_AGENT, {
    agentId: chainAgentIdBigInt(agentId).toString(),
    first,
    skip,
  });
  return data.feedbacks.map((row) => mapFeedbackRow(row));
}

export async function getValidationsByAgentId(
  agentId: bigint | number | string,
  opts?: { subgraphUrl?: string; first?: number; skip?: number },
): Promise<Validation[]> {
  const url = resolveSubgraphUrl(opts?.subgraphUrl);
  const first = opts?.first ?? 100;
  const skip = opts?.skip ?? 0;
  const data = await postGraphql<{
    validations: Record<string, unknown>[];
  }>(url, GET_VALIDATIONS_BY_AGENT, {
    agentId: chainAgentIdBigInt(agentId).toString(),
    first,
    skip,
  });
  return data.validations.map((row) => mapValidationRow(row));
}

export async function getValidationByRequestHash(
  requestHash: string,
  subgraphUrl?: string,
): Promise<Validation | null> {
  const url = resolveSubgraphUrl(subgraphUrl);
  const data = await postGraphql<{
    validations: Record<string, unknown>[];
  }>(url, GET_VALIDATION_BY_REQUEST_HASH, {
    requestHash: normalizeGraphBytesInput(requestHash),
  });
  const row = data.validations[0];
  return row ? mapValidationRow(row) : null;
}

/**
 * ERC-8004 `agentId` values the wallet has an active subscription for
 * (`endDate` after now) on a **canonical** agent (`isCloned` is not true), deduped across paginated `userSubscriptions`.
 */
export async function fetchActiveSubscribedChainAgentIdsForUser(
  walletLower: `0x${string}`,
  subgraphUrl: string,
): Promise<number[]> {
  const url = resolveSubgraphUrl(subgraphUrl);
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const active = new Map<number, bigint>();
  let skip = 0;
  for (;;) {
    const data = await postGraphql<{
      userSubscriptions: UserSubscriptionAgentEndRow[];
    }>(url, GET_USER_SUBSCRIPTIONS_PAGE_FILTERED, {
      first: SUBSCRIPTION_PAGE_SIZE,
      skip,
      user: walletLower,
    });
    const page = data.userSubscriptions ?? [];
    for (const row of page) {
      if (row.agentId == null || row.endDate == null) continue;
      if (!userSubscriptionQualifiesAsHired(row, nowSec)) continue;
      let end: bigint;
      let aid: bigint;
      try {
        end = BigInt(String(row.endDate));
        aid = BigInt(String(row.agentId));
      } catch {
        continue;
      }
      if (aid > MAX_SAFE_BIGINT || aid < 0n) continue;
      const chainAgentId = Number(aid);
      const prev = active.get(chainAgentId);
      if (prev === undefined || end > prev) {
        active.set(chainAgentId, end);
      }
    }
    if (page.length < SUBSCRIPTION_PAGE_SIZE) break;
    skip += SUBSCRIPTION_PAGE_SIZE;
  }
  return [...active.keys()];
}
