import {
  agentCategorySchema,
  buildStardormCatalogResponse,
  catalogResponseSchema,
  type Agent,
  type AgentCategory,
  type CatalogResponse,
} from "@beam/stardorm-api-contract";
import { formatUnits, hexToString, isHex } from "viem";
import { fetchAllSubgraphAgents, fetchAllSubgraphAgentsClonedByOwner, type SubgraphAgentMapped } from "./stardorm-subgraph-queries";
import { type AgentUriParseResult, parseAgentUriFromString } from "./agent-uri-metadata";
import { IDENTITY_REGISTRY_NATIVE_DECIMALS } from "./web3/identity-registry";

function shortOwner(owner: string): string {
  const o = owner.trim();
  if (!o.startsWith("0x") || o.length < 10) return o;
  return `${o.slice(0, 6)}…${o.slice(-4)}`;
}

function decodeMetadataValue(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (isHex(s as `0x${string}`)) {
    try {
      return hexToString(s as `0x${string}`);
    } catch {
      return s;
    }
  }
  return s;
}

function metadataMap(meta: SubgraphAgentMapped["metadata"]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const row of meta) {
    m[row.key] = decodeMetadataValue(row.value);
  }
  return m;
}

function pricePerMonthFromFeePerDay(feePerDay: string | null): number | undefined {
  if (feePerDay == null || String(feePerDay).trim() === "") return undefined;
  try {
    const wei = BigInt(String(feePerDay).trim());
    const perDay = Number.parseFloat(formatUnits(wei, IDENTITY_REGISTRY_NATIVE_DECIMALS));
    if (!Number.isFinite(perDay)) return undefined;
    return Math.max(0, perDay * 30);
  } catch {
    return undefined;
  }
}

/** Normalises the subgraph `feePerDay` field into a decimal-string wei value (or `undefined` if missing / 0). */
function feePerDayWeiFromRow(feePerDay: string | null): string | undefined {
  if (feePerDay == null) return undefined;
  const s = String(feePerDay).trim();
  if (!s) return undefined;
  try {
    const wei = BigInt(s);
    if (wei <= 0n) return undefined;
    return wei.toString();
  } catch {
    return undefined;
  }
}

/**
 * ERC-8004 registration JSON often uses root-relative `imageUrl` (`/images/…`).
 * Pass those through; only normalize absolute http(s) URLs.
 */
function resolveCatalogAvatarUrl(
  row: SubgraphAgentMapped,
  uriDetails: AgentUriParseResult | null | undefined,
): string {
  const raw = uriDetails?.imageUrl?.trim();
  const fallback = "/images/beam.png";
  if (!raw) return fallback;

  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).href;
    } catch {
      return fallback;
    }
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  return fallback;
}

function taglineFromUriDescription(description: string | undefined): string | undefined {
  if (!description?.trim()) return undefined;
  const line = description.trim().split(/\r?\n/)[0]?.trim();
  if (!line) return undefined;
  return line.length > 160 ? `${line.slice(0, 159)}…` : line;
}

const CATEGORY_ENUM: readonly AgentCategory[] = [
  "Payments",
  "Taxes",
  "Reports",
  "DeFi",
  "Compliance",
  "General",
] as const;

/** Match registration / metadata category strings case-insensitively to the catalog enum. */
function normalizeAgentCategory(raw: string | undefined): AgentCategory | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toLowerCase();
  for (const c of CATEGORY_ENUM) {
    if (c.toLowerCase() === t) return c;
  }
  return null;
}

function categoryFromMetaOrUri(
  metaCategory: string | undefined,
  uriCategory: string | undefined,
): AgentCategory {
  const fromMeta = normalizeAgentCategory(metaCategory);
  if (fromMeta) return fromMeta;
  const fromUri = normalizeAgentCategory(uriCategory);
  if (fromUri) return fromUri;
  const strictMeta = metaCategory ? agentCategorySchema.safeParse(metaCategory.trim()) : null;
  if (strictMeta?.success) return strictMeta.data;
  const strictUri = uriCategory ? agentCategorySchema.safeParse(uriCategory.trim()) : null;
  if (strictUri?.success) return strictUri.data;
  return "General";
}

export function mapSubgraphAgentToCatalogAgent(
  row: SubgraphAgentMapped,
  seedByChain: Map<number, Agent>,
  uriDetails?: AgentUriParseResult | null,
): Agent {
  const meta = metadataMap(row.metadata);
  const name =
    meta.name?.trim() ||
    uriDetails?.name?.trim() ||
    meta.title?.trim() ||
    uriDetails?.title?.trim() ||
    `Agent #${row.agentId}`;
  const handleRaw =
    meta.handle?.trim() ||
    uriDetails?.handle?.trim() ||
    (uriDetails?.name ? slugHandle(uriDetails.name, row.agentId) : null) ||
    `agent${row.agentId}`;
  const handle = handleRaw.startsWith("@") ? handleRaw.slice(1) : handleRaw;
  const seed = seedByChain.get(row.agentId);
  const category = categoryFromMetaOrUri(meta.category, uriDetails?.category);
  const description =
    meta.description?.trim() ||
    uriDetails?.description?.trim() ||
    (row.uri
      ? `Agent #${row.agentId} on the registry.`
      : `Agent #${row.agentId} · listed by ${shortOwner(row.owner)}.`);
  const tagline =
    meta.tagline?.trim() ||
    uriDetails?.tagline?.trim() ||
    taglineFromUriDescription(uriDetails?.description) ||
    "Agent on 0G";
  const skillsRaw = meta.skills?.trim();
  const skillsFromMeta = skillsRaw
    ? skillsRaw
        .split(/[,|]/)
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  const skills =
    skillsFromMeta.length > 0
      ? skillsFromMeta
      : uriDetails?.skills?.length
        ? uriDetails.skills
        : ["General"];

  const pricePerMonth = pricePerMonthFromFeePerDay(row.feePerDay);
  const feePerDayWei = feePerDayWeiFromRow(row.feePerDay);
  const avatar = resolveCatalogAvatarUrl(row, uriDetails);

  const ownerLower = row.owner.trim().toLowerCase();
  const ownerAddress =
    /^0x[a-f0-9]{40}$/.test(ownerLower) ? (ownerLower as `0x${string}`) : undefined;

  return {
    id: `chain-${row.agentId}`,
    name,
    handle,
    avatar,
    category,
    tagline,
    description,
    hires: row.subscriptionCount,
    ...(pricePerMonth !== undefined ? { pricePerMonth } : {}),
    ...(feePerDayWei !== undefined ? { feePerDayWei } : {}),
    skills: skills.length ? skills : ["General"],
    creator: shortOwner(row.owner),
    ...(uriDetails?.skillHandles?.length
      ? { skillHandles: uriDetails.skillHandles }
      : seed?.skillHandles?.length
        ? { skillHandles: seed.skillHandles }
        : {}),
    chainAgentId: row.agentId,
    isCloned: row.isCloned,
    ...(ownerAddress ? { ownerAddress } : {}),
    ...(row.uri && row.uri.length > 0 ? { registrationUriRaw: row.uri } : {}),
  };
}

function slugHandle(name: string, agentId: number): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  if (s.length >= 2) return s;
  return `agent${agentId}`;
}

/**
 * Marketplace catalog built from the Stardorm subgraph (`agents` + metadata),
 * merged with static Beam router row, categories, and chat suggestions from the API contract seed.
 */
export async function fetchSubgraphBackedCatalogResponse(opts: {
  subgraphUrl: string;
  /** When set, merged in cloned agents this wallet owns (excluded from marketplace query). */
  viewerAddress?: `0x${string}`;
}): Promise<CatalogResponse> {
  const seed = buildStardormCatalogResponse();
  const beam = seed.agents.find((a: Agent) => a.id === "beam-default");
  if (!beam) {
    throw new Error("buildStardormCatalogResponse: missing beam-default");
  }
  /** Avoid colliding with any on-chain token id used for hire / feedback matching. */
  const beamRouter: Agent = { ...beam, chainAgentId: undefined };

  const seedByChain = new Map<number, Agent>();
  for (const a of seed.agents) {
    if (a.chainAgentId != null) seedByChain.set(a.chainAgentId, a);
  }

  const rows = await fetchAllSubgraphAgents({ subgraphUrl: opts.subgraphUrl });
  const chainAgents = rows.map((r) =>
    mapSubgraphAgentToCatalogAgent(r, seedByChain, parseAgentUriFromString(r.uri)),
  );

  const viewer = opts.viewerAddress?.trim().toLowerCase() as `0x${string}` | undefined;
  const cloneRows: SubgraphAgentMapped[] =
    viewer && /^0x[a-f0-9]{40}$/.test(viewer)
      ? await fetchAllSubgraphAgentsClonedByOwner(viewer, { subgraphUrl: opts.subgraphUrl })
      : [];
  const clonedAgents = cloneRows.map((r) =>
    mapSubgraphAgentToCatalogAgent(r, seedByChain, parseAgentUriFromString(r.uri)),
  );

  const agents: Agent[] = [beamRouter, ...chainAgents, ...clonedAgents];

  const defaultHiredIds = seed.defaultHiredIds.filter((id: string) =>
    agents.some((a: Agent) => a.id === id),
  );
  if (!defaultHiredIds.includes("beam-default")) {
    defaultHiredIds.unshift("beam-default");
  }
  /** Token #1 is already default-hired as `beam-default` in the seed; do not also add `chain-1` or the same slot appears twice in "My agents". */

  const categorySet = new Set<AgentCategory>();
  for (const a of chainAgents) {
    categorySet.add(a.category);
  }
  const categories = CATEGORY_ENUM.filter((c) => categorySet.has(c));

  return catalogResponseSchema.parse({
    agents,
    categories,
    defaultHiredIds,
    chatSuggestions: seed.chatSuggestions,
  });
}
