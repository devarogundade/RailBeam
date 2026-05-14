import type { AgentOnchainFeedbackItem } from "@beam/stardorm-api-contract";
import { agentOnchainFeedbackItemSchema } from "@beam/stardorm-api-contract";
import type { z } from "zod";
import { requestStardormSubgraph } from "./stardorm-graphql-client";
import { getStardormSubgraphUrl } from "./stardorm-subgraph-config";
import {
  agentByIdDataSchema,
  agentsListDataSchema,
  feedbackResponsesByAgentDataSchema,
  feedbacksByAgentDataSchema,
  recentSubscriptionsDataSchema,
  subgraphAgentRowSchema,
  type SubgraphAgentCoreRow,
  type SubgraphFeedbackRaw,
  type SubgraphFeedbackResponseRaw,
  type SubgraphValidationRaw,
  userSubscriptionsPageDataSchema,
  validationsByAgentDataSchema,
  validationsByRequestHashDataSchema,
  type UserSubscriptionNode,
} from "./schemas/subgraph";
import { agentGraphEntityIdFromChainAgentId } from "./subgraph-entity-ids";

export type SubgraphRequestOpts = { subgraphUrl?: string };

/** Active subscription on a canonical registry agent (not an ERC-7857 clone token). */
function userSubscriptionQualifiesAsHired(row: UserSubscriptionNode, nowSec: bigint): boolean {
  const end = BigInt(row.endDate);
  if (end <= nowSec) return false;
  return row.agent?.isCloned !== true;
}

function subgraphUrlOrThrow(opts?: SubgraphRequestOpts): string {
  const u = opts?.subgraphUrl ?? getStardormSubgraphUrl();
  if (!u) {
    throw new Error(
      "Subgraph URL not configured (set VITE_STARDORM_SUBGRAPH_URL or MAINNET/TESTNET URLs)",
    );
  }
  return u;
}

function parseBigIntString(s: string): number {
  const n = Number(s);
  if (!Number.isFinite(n)) {
    throw new Error(`Expected finite number from subgraph bigint string: ${s}`);
  }
  return n;
}

/** Lowercase `0x…` for GraphQL `Bytes` filters (subgraph stores hashes in canonical form). */
function normalizeSubgraphBytesHexFilter(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t.startsWith("0x")) return `0x${t}`;
  return t;
}

export function mapSubgraphFeedbackRaw(raw: SubgraphFeedbackRaw): AgentOnchainFeedbackItem {
  return agentOnchainFeedbackItemSchema.parse({
    id: raw.id,
    agentId: parseBigIntString(raw.agentId),
    clientAddress: raw.clientAddress,
    feedbackIndex: raw.feedbackIndex,
    value: raw.value,
    valueDecimals: raw.valueDecimals,
    tag1: raw.tag1,
    tag2: raw.tag2,
    endpoint: raw.endpoint,
    feedbackURI: raw.feedbackURI,
    feedbackHash: raw.feedbackHash,
    revoked: raw.revoked,
    blockNumber: parseBigIntString(raw.blockNumber),
    blockTimestamp: parseBigIntString(raw.blockTimestamp),
    transactionHash: raw.transactionHash,
  });
}

export type SubgraphValidationMapped = {
  id: string;
  requestHash: string;
  validatorAddress: string;
  agentId: number;
  requestURI: string;
  response: number | null;
  responseURI: string | null;
  responseHash: string | null;
  tag: string | null;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
};

export function mapSubgraphValidationRaw(raw: SubgraphValidationRaw): SubgraphValidationMapped {
  return {
    id: raw.id,
    requestHash: raw.requestHash,
    validatorAddress: raw.validatorAddress,
    agentId: parseBigIntString(raw.agentId),
    requestURI: raw.requestURI,
    response: raw.response == null ? null : Number(raw.response),
    responseURI: raw.responseURI ?? null,
    responseHash: raw.responseHash ?? null,
    tag: raw.tag ?? null,
    blockNumber: parseBigIntString(raw.blockNumber),
    blockTimestamp: parseBigIntString(raw.blockTimestamp),
    transactionHash: raw.transactionHash,
  };
}

export type SubgraphFeedbackResponseMapped = {
  id: string;
  agentId: number;
  clientAddress: string;
  feedbackIndex: string;
  responder: string;
  responseURI: string;
  responseHash: string;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
};

export function mapSubgraphFeedbackResponseRaw(
  raw: SubgraphFeedbackResponseRaw,
): SubgraphFeedbackResponseMapped {
  return {
    id: raw.id,
    agentId: parseBigIntString(raw.agentId),
    clientAddress: raw.clientAddress,
    feedbackIndex: raw.feedbackIndex,
    responder: raw.responder,
    responseURI: raw.responseURI,
    responseHash: raw.responseHash,
    blockNumber: parseBigIntString(raw.blockNumber),
    blockTimestamp: parseBigIntString(raw.blockTimestamp),
    transactionHash: raw.transactionHash,
  };
}

export type SubgraphAgentMapped = {
  id: string;
  agentId: number;
  owner: string;
  uri: string | null;
  agentWallet: string | null;
  feePerDay: string | null;
  isCloned: boolean;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
  /** Count of `UserSubscription` rows linked to this agent (capped by query `first`). */
  subscriptionCount: number;
  metadata: Array<{
    id: string;
    agentId: number;
    key: string;
    value: string;
    updatedBy: string;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
  }>;
};

function mapAgentCore(
  raw: SubgraphAgentCoreRow,
  subscriptionCount: number,
): Omit<SubgraphAgentMapped, "metadata"> {
  return {
    id: raw.id,
    agentId: parseBigIntString(raw.agentId),
    owner: raw.owner,
    uri: raw.uri ?? null,
    agentWallet: raw.agentWallet ?? null,
    feePerDay: raw.feePerDay ?? null,
    isCloned: raw.isCloned ?? false,
    blockNumber: parseBigIntString(raw.blockNumber),
    blockTimestamp: parseBigIntString(raw.blockTimestamp),
    transactionHash: raw.transactionHash,
    subscriptionCount,
  };
}

export function mapSubgraphAgentRow(raw: z.input<typeof subgraphAgentRowSchema>): SubgraphAgentMapped {
  const row = subgraphAgentRowSchema.parse(raw);
  const subscriptions = row.subscriptions ?? [];
  const meta = row.metadata.map((m) => ({
    id: m.id,
    agentId: parseBigIntString(m.agentId),
    key: m.key,
    value: m.value,
    updatedBy: m.updatedBy,
    blockNumber: parseBigIntString(m.blockNumber),
    blockTimestamp: parseBigIntString(m.blockTimestamp),
    transactionHash: m.transactionHash,
  }));
  const subscriptionCount = subscriptions.length;
  return { ...mapAgentCore(row, subscriptionCount), metadata: meta };
}

const AGENT_DETAIL_FIELDS = /* GraphQL */ `
  id
  agentId
  owner
  uri
  agentWallet
  feePerDay
  isCloned
  blockNumber
  blockTimestamp
  transactionHash
  metadata {
    id
    agentId
    key
    value
    updatedBy
    blockNumber
    blockTimestamp
    transactionHash
  }
  subscriptions(first: 1000) {
    id
  }
`;

const GET_AGENT = /* GraphQL */ `
  query GetAgent($id: ID!) {
    agent(id: $id) {
      ${AGENT_DETAIL_FIELDS}
    }
  }
`;

const GET_AGENTS_MARKETPLACE_PAGE = /* GraphQL */ `
  query AgentsMarketplacePage($first: Int!, $skip: Int!) {
    agents(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
      where: { isCloned: false }
    ) {
      ${AGENT_DETAIL_FIELDS}
    }
  }
`;

const GET_AGENTS_CLONED_BY_OWNER_PAGE = /* GraphQL */ `
  query AgentsClonedByOwnerPage($first: Int!, $skip: Int!, $owner: Bytes!) {
    agents(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
      where: { isCloned: true, owner: $owner }
    ) {
      ${AGENT_DETAIL_FIELDS}
    }
  }
`;

const GET_FEEDBACKS_BY_AGENT = /* GraphQL */ `
  query FeedbacksByAgent($agentId: BigInt!, $first: Int!, $skip: Int!) {
    feedbacks(
      where: { agentId: $agentId }
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      agentId
      clientAddress
      feedbackIndex
      value
      valueDecimals
      tag1
      tag2
      endpoint
      feedbackURI
      feedbackHash
      revoked
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

const GET_FEEDBACK_RESPONSES_BY_AGENT = /* GraphQL */ `
  query FeedbackResponsesByAgent($agentId: BigInt!, $first: Int!, $skip: Int!) {
    feedbackResponses(
      where: { agentId: $agentId }
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      agentId
      clientAddress
      feedbackIndex
      responder
      responseURI
      responseHash
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

const GET_VALIDATIONS_BY_AGENT = /* GraphQL */ `
  query ValidationsByAgent($agentId: BigInt!, $first: Int!, $skip: Int!) {
    validations(
      where: { agentId: $agentId }
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      requestHash
      validatorAddress
      agentId
      requestURI
      response
      responseURI
      responseHash
      tag
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

const GET_VALIDATION_BY_REQUEST_HASH = /* GraphQL */ `
  query ValidationByRequestHash($requestHash: Bytes!) {
    validations(where: { requestHash: $requestHash }, first: 1) {
      id
      requestHash
      validatorAddress
      agentId
      requestURI
      response
      responseURI
      responseHash
      tag
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

const RECENT_SUBSCRIPTIONS_QUERY = /* GraphQL */ `
  query RecentSubscriptions($first: Int!, $user: Bytes) {
    userSubscriptions(
      first: $first
      orderBy: blockTimestamp
      orderDirection: desc
      where: { user: $user }
    ) {
      id
      user
      agentId
      paidAmount
      endDate
      windowStart
      blockNumber
      blockTimestamp
      transactionHash
      agent {
        agentId
        uri
        isCloned
        owner
      }
    }
  }
`;

const RECENT_SUBSCRIPTIONS_ALL_QUERY = /* GraphQL */ `
  query RecentSubscriptionsAll($first: Int!) {
    userSubscriptions(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      user
      agentId
      paidAmount
      endDate
      windowStart
      blockNumber
      blockTimestamp
      transactionHash
      agent {
        agentId
        uri
        isCloned
        owner
      }
    }
  }
`;

const USER_SUBSCRIPTIONS_PAGE_FILTERED = /* GraphQL */ `
  query UserSubscriptionsPageFiltered($first: Int!, $skip: Int!, $user: Bytes!) {
    userSubscriptions(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
      where: { user: $user }
    ) {
      id
      user
      agentId
      paidAmount
      endDate
      windowStart
      blockNumber
      blockTimestamp
      transactionHash
      agent {
        agentId
        uri
        isCloned
        owner
      }
    }
  }
`;

const USER_SUBSCRIPTIONS_PAGE_ALL = /* GraphQL */ `
  query UserSubscriptionsPageAll($first: Int!, $skip: Int!) {
    userSubscriptions(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      user
      agentId
      paidAmount
      endDate
      windowStart
      blockNumber
      blockTimestamp
      transactionHash
      agent {
        agentId
        uri
        isCloned
        owner
      }
    }
  }
`;

/** `agent(id:)` — full row including nested metadata. */
export async function fetchSubgraphAgentByEntityId(
  id: string,
  opts?: SubgraphRequestOpts,
): Promise<SubgraphAgentMapped | null> {
  const url = subgraphUrlOrThrow(opts);
  const data = await requestStardormSubgraph(GET_AGENT, { id }, agentByIdDataSchema, url);
  return data.agent ? mapSubgraphAgentRow(data.agent) : null;
}

/** Numeric ERC-8004 `agentId` → subgraph entity id → `fetchSubgraphAgentByEntityId`. */
export async function fetchSubgraphAgentByChainAgentId(
  agentId: bigint | number | string,
  opts?: SubgraphRequestOpts,
): Promise<SubgraphAgentMapped | null> {
  const id = agentGraphEntityIdFromChainAgentId(BigInt(agentId));
  return fetchSubgraphAgentByEntityId(id, opts);
}

/** Paginated `agents` collection (no nested metadata). */
export async function fetchSubgraphAgentsPage(
  params: {
    first: number;
    skip: number;
  },
  opts?: SubgraphRequestOpts,
): Promise<SubgraphAgentMapped[]> {
  const first = Math.min(Math.max(1, Math.floor(params.first)), 100);
  const skip = Math.max(0, Math.floor(params.skip));
  const url = subgraphUrlOrThrow(opts);
  const data = await requestStardormSubgraph(
    GET_AGENTS_MARKETPLACE_PAGE,
    { first, skip },
    agentsListDataSchema,
    url,
  );
  return data.agents.map((a) => mapSubgraphAgentRow(a));
}

/** Paginated registry agents cloned to `owner` (lowercase `0x` address). */
export async function fetchSubgraphAgentsClonedByOwnerPage(
  params: {
    first: number;
    skip: number;
    owner: `0x${string}`;
  },
  opts?: SubgraphRequestOpts,
): Promise<SubgraphAgentMapped[]> {
  const first = Math.min(Math.max(1, Math.floor(params.first)), 100);
  const skip = Math.max(0, Math.floor(params.skip));
  const owner = params.owner.toLowerCase() as `0x${string}`;
  const url = subgraphUrlOrThrow(opts);
  const data = await requestStardormSubgraph(
    GET_AGENTS_CLONED_BY_OWNER_PAGE,
    { first, skip, owner },
    agentsListDataSchema,
    url,
  );
  return data.agents.map((a) => mapSubgraphAgentRow(a));
}

const AGENTS_PAGE_SIZE = 100;

/**
 * Walks paginated `agents` with `where: { isCloned: false }` (marketplace / canonical listings)
 * until a short page (or safety cap).
 */
export async function fetchAllSubgraphAgents(opts?: SubgraphRequestOpts): Promise<SubgraphAgentMapped[]> {
  const out: SubgraphAgentMapped[] = [];
  let skip = 0;
  const maxAgents = 10_000;
  for (;;) {
    const page = await fetchSubgraphAgentsPage({ first: AGENTS_PAGE_SIZE, skip }, opts);
    out.push(...page);
    if (page.length < AGENTS_PAGE_SIZE || out.length >= maxAgents) break;
    skip += AGENTS_PAGE_SIZE;
  }
  return out;
}

/** All cloned agents owned by `owner` (for merging into the viewer’s catalog). */
export async function fetchAllSubgraphAgentsClonedByOwner(
  owner: `0x${string}`,
  opts?: SubgraphRequestOpts,
): Promise<SubgraphAgentMapped[]> {
  const out: SubgraphAgentMapped[] = [];
  let skip = 0;
  const maxAgents = 500;
  for (;;) {
    const page = await fetchSubgraphAgentsClonedByOwnerPage(
      { first: AGENTS_PAGE_SIZE, skip, owner },
      opts,
    );
    out.push(...page);
    if (page.length < AGENTS_PAGE_SIZE || out.length >= maxAgents) break;
    skip += AGENTS_PAGE_SIZE;
  }
  return out;
}

/** `feedbacks` filtered by `agentId` (chain-facing token id). */
export async function fetchSubgraphFeedbacksForAgent(
  agentId: bigint | number | string,
  first: number,
  skip: number,
  opts?: SubgraphRequestOpts,
): Promise<AgentOnchainFeedbackItem[]> {
  const url = subgraphUrlOrThrow(opts);
  const data = await requestStardormSubgraph(
    GET_FEEDBACKS_BY_AGENT,
    {
      agentId: BigInt(agentId).toString(),
      first,
      skip,
    },
    feedbacksByAgentDataSchema,
    url,
  );
  return data.feedbacks.map((row) => mapSubgraphFeedbackRaw(row));
}

/** `feedbackResponses` filtered by `agentId`. */
export async function fetchSubgraphFeedbackResponsesForAgent(
  agentId: bigint | number | string,
  first: number,
  skip: number,
  opts?: SubgraphRequestOpts,
): Promise<SubgraphFeedbackResponseMapped[]> {
  const url = subgraphUrlOrThrow(opts);
  const data = await requestStardormSubgraph(
    GET_FEEDBACK_RESPONSES_BY_AGENT,
    {
      agentId: BigInt(agentId).toString(),
      first,
      skip,
    },
    feedbackResponsesByAgentDataSchema,
    url,
  );
  return data.feedbackResponses.map(mapSubgraphFeedbackResponseRaw);
}

/** `validations` filtered by `agentId`. */
export async function fetchSubgraphValidationsForAgent(
  agentId: bigint | number | string,
  first: number,
  skip: number,
  opts?: SubgraphRequestOpts,
): Promise<SubgraphValidationMapped[]> {
  const url = subgraphUrlOrThrow(opts);
  const data = await requestStardormSubgraph(
    GET_VALIDATIONS_BY_AGENT,
    {
      agentId: BigInt(agentId).toString(),
      first,
      skip,
    },
    validationsByAgentDataSchema,
    url,
  );
  return data.validations.map(mapSubgraphValidationRaw);
}

/** First validation row matching `requestHash`, if any. */
export async function fetchSubgraphValidationByRequestHash(
  requestHash: string,
  opts?: SubgraphRequestOpts,
): Promise<SubgraphValidationMapped | null> {
  const url = subgraphUrlOrThrow(opts);
  const data = await requestStardormSubgraph(
    GET_VALIDATION_BY_REQUEST_HASH,
    { requestHash: normalizeSubgraphBytesHexFilter(requestHash) },
    validationsByRequestHashDataSchema,
    url,
  );
  const row = data.validations[0];
  return row ? mapSubgraphValidationRaw(row) : null;
}

/** Paginated `userSubscriptions` (optional subscriber filter). */
export async function fetchSubgraphUserSubscriptionsPage(
  params: {
    first: number;
    skip: number;
    user?: `0x${string}`;
  },
  opts?: SubgraphRequestOpts,
): Promise<UserSubscriptionNode[]> {
  const first = Math.min(Math.max(1, Math.floor(params.first)), 100);
  const skip = Math.max(0, Math.floor(params.skip));
  const url = subgraphUrlOrThrow(opts);
  if (params.user) {
    const user = params.user.toLowerCase() as `0x${string}`;
    const data = await requestStardormSubgraph(
      USER_SUBSCRIPTIONS_PAGE_FILTERED,
      { first, skip, user },
      userSubscriptionsPageDataSchema,
      url,
    );
    return data.userSubscriptions;
  }
  const data = await requestStardormSubgraph(
    USER_SUBSCRIPTIONS_PAGE_ALL,
    { first, skip },
    userSubscriptionsPageDataSchema,
    url,
  );
  return data.userSubscriptions;
}

const SUBSCRIPTION_PAGE_SIZE = 100;

/**
 * Chain-facing ERC-8004 `agentId` values for which `user` currently has an active subscription
 * on a **canonical** agent (`agent.isCloned` is not true), deduped across paginated `userSubscriptions`.
 * Clone-token subscriptions are excluded from the hired roster.
 */
export async function fetchActiveSubscribedChainAgentIds(
  user: `0x${string}`,
  opts?: SubgraphRequestOpts,
): Promise<number[]> {
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const active = new Map<number, bigint>();

  let skip = 0;
  for (;;) {
    const page = await fetchSubgraphUserSubscriptionsPage(
      {
        first: SUBSCRIPTION_PAGE_SIZE,
        skip,
        user,
      },
      opts,
    );
    for (const row of page) {
      if (!userSubscriptionQualifiesAsHired(row, nowSec)) continue;
      const end = BigInt(row.endDate);
      const chainAgentId = Number(row.agentId);
      if (!Number.isFinite(chainAgentId)) continue;
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

export async function fetchRecentUserSubscriptions(
  params: {
    limit: number;
    /** If set, filters to this subscriber (checksummed or any case; normalized to lowercase). */
    user?: `0x${string}`;
  },
  opts?: SubgraphRequestOpts,
): Promise<UserSubscriptionNode[]> {
  const first = Math.min(Math.max(1, Math.floor(params.limit)), 100);
  const url = subgraphUrlOrThrow(opts);
  if (params.user) {
    const user = params.user.toLowerCase() as `0x${string}`;
    const data = await requestStardormSubgraph(
      RECENT_SUBSCRIPTIONS_QUERY,
      { first, user },
      recentSubscriptionsDataSchema,
      url,
    );
    return data.userSubscriptions;
  }
  const data = await requestStardormSubgraph(
    RECENT_SUBSCRIPTIONS_ALL_QUERY,
    { first },
    recentSubscriptionsDataSchema,
    url,
  );
  return data.userSubscriptions;
}
