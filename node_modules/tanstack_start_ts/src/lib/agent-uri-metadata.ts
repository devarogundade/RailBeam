/**
 * Parse ERC-8004 registration from `tokenURI` text (on-chain URIs are JSON or hex-encoded JSON).
 *
 * When `type` is {@link EIP8004_REGISTRATION_V1_TYPE}, fields match Ignition
 * `registrationUriFromCatalogAgent` (see `smart-contracts/ignition/data/seedAgentUris.ts`).
 */

import { hexToString, isHex } from "viem";

/** Same string as `seedAgentUris.ts` → `JSON.stringify({ type: … })`. */
export const EIP8004_REGISTRATION_V1_TYPE =
  "https://eips.ethereum.org/EIPS/eip-8004#registration-v1" as const;

export type AgentUriParseResult = {
  name?: string;
  title?: string;
  description?: string;
  tagline?: string;
  imageUrl?: string;
  category?: string;
  skills?: string[];
  /** Registration document `agentKey`. */
  agentKey?: string;
  /** Registration document `handle` (e.g. `ledger.0g`). */
  handle?: string;
  skillHandles?: Array<{ handle: string; label: string }>;
  x402Support?: boolean;
  active?: boolean;
  /** `services` entries (`name`, optional `endpoint`). */
  services?: Array<{ name: string; endpoint?: string }>;
  supportedTrust?: string[];
};

function parseDataUriJson(uri: string): unknown | null {
  const comma = uri.indexOf(",");
  if (comma < 0) return null;
  const header = uri.slice(0, comma).toLowerCase();
  const payload = uri.slice(comma + 1);
  try {
    if (header.includes(";base64")) {
      const bin = atob(payload);
      return JSON.parse(bin) as unknown;
    }
    return JSON.parse(decodeURIComponent(payload)) as unknown;
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Subgraph / RPC often returns `bytes` tokenURI as a `0x`-prefixed hex string. */
function decodeAgentUriIfHex(raw: string): string {
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

/** On-chain `uri` is often the raw JSON string from Ignition (not `http(s)` / `ipfs`). */
function tryParseJsonText(raw: string): unknown | null {
  const t = raw.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

/**
 * If `JSON.parse` yields a JSON string (double-encoded registration), parse again once.
 */
function parseJsonDocumentRoot(text: string): unknown | null {
  let v: unknown | null = tryParseJsonText(text);
  if (v === null) return null;
  if (typeof v === "string") {
    v = tryParseJsonText(v.trim());
  }
  return v;
}

function parseSkillHandlesV1(raw: unknown): Array<{ handle: string; label: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Array<{ handle: string; label: string }> = [];
  for (const item of raw) {
    const r = asRecord(item);
    if (!r) continue;
    const handle = typeof r.handle === "string" ? r.handle.trim() : "";
    const label = typeof r.label === "string" ? r.label.trim() : "";
    if (handle && label) out.push({ handle, label });
  }
  return out.length ? out : undefined;
}

function parseServicesV1(raw: unknown): Array<{ name: string; endpoint?: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Array<{ name: string; endpoint?: string }> = [];
  for (const item of raw) {
    const r = asRecord(item);
    if (!r) continue;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;
    const endpoint = typeof r.endpoint === "string" ? r.endpoint.trim() : undefined;
    out.push({ name, ...(endpoint ? { endpoint } : {}) });
  }
  return out.length ? out : undefined;
}

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) return undefined;
  const arr = (raw as string[]).map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

function pickString(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function httpsImageUrl(raw: string | undefined, name: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t && name) return `/images/${name}.png`;
  if (!t) return undefined;
  return t;
}

/**
 * EIP-8004 registration v1 object (flat root), as minted by `registrationUriFromCatalogAgent`.
 */
function extractEip8004RegistrationV1(o: Record<string, unknown>): AgentUriParseResult | null {
  if (o.type !== EIP8004_REGISTRATION_V1_TYPE) return null;

  const name = pickString(o, "name");
  const description = pickString(o, "description");
  const tagline = pickString(o, "tagline");
  const category = pickString(o, "category");
  const agentKey = pickString(o, "agentKey");
  const handle = pickString(o, "handle");
  const skills = parseStringArray(o.skills);
  const skillHandles = parseSkillHandlesV1(o.skillHandles);
  const services = parseServicesV1(o.services);
  const supportedTrust = parseStringArray(o.supportedTrust);

  const x402Support = typeof o.x402Support === "boolean" ? o.x402Support : undefined;
  const active = typeof o.active === "boolean" ? o.active : undefined;

  const imageUrl = httpsImageUrl(pickString(o, "imageUrl"), name);

  const out: AgentUriParseResult = {};
  if (name) out.name = name;
  if (description) out.description = description;
  if (tagline) out.tagline = tagline;
  if (category) out.category = category;
  if (agentKey) out.agentKey = agentKey;
  if (handle) out.handle = handle;
  if (skills?.length) out.skills = skills;
  if (skillHandles?.length) out.skillHandles = skillHandles;
  if (services?.length) out.services = services;
  if (supportedTrust?.length) out.supportedTrust = supportedTrust;
  if (x402Support !== undefined) out.x402Support = x402Support;
  if (active !== undefined) out.active = active;
  if (imageUrl) out.imageUrl = imageUrl;

  return Object.keys(out).length ? out : null;
}

function parseSkillsFromAttributes(attrs: unknown): string[] | undefined {
  if (!Array.isArray(attrs)) return undefined;
  const out: string[] = [];
  for (const a of attrs) {
    const r = asRecord(a);
    if (!r) continue;
    const trait = typeof r.trait_type === "string" ? r.trait_type.toLowerCase() : "";
    const val = r.value;
    if (
      (trait === "skill" || trait === "skills" || trait === "capability") &&
      typeof val === "string" &&
      val.trim()
    ) {
      out.push(val.trim());
    }
  }
  return out.length ? out : undefined;
}

function parseSkills(o: Record<string, unknown>): string[] | undefined {
  const direct = o.skills;
  if (Array.isArray(direct) && direct.every((x) => typeof x === "string")) {
    return (direct as string[]).map((s) => s.trim()).filter(Boolean);
  }
  const props = asRecord(o.properties);
  if (props) {
    const sk = props.skills;
    if (Array.isArray(sk) && sk.every((x) => typeof x === "string")) {
      return (sk as string[]).map((s) => s.trim()).filter(Boolean);
    }
  }
  const fromAttrs = parseSkillsFromAttributes(o.attributes);
  if (fromAttrs?.length) return fromAttrs;

  const endpoints = o.endpoints;
  if (Array.isArray(endpoints)) {
    const names: string[] = [];
    for (const e of endpoints) {
      const er = asRecord(e);
      if (!er) continue;
      const n = pickString(er, "name", "title", "type");
      if (n) names.push(n);
    }
    if (names.length) return names;
  }
  return undefined;
}

function extractGenericRegistration(o: Record<string, unknown>): AgentUriParseResult | null {
  const name = pickString(o, "name", "agentName");
  const title = pickString(o, "title");
  const description = pickString(o, "description", "about", "bio");
  const tagline = pickString(o, "tagline", "subtitle", "summary", "shortDescription");
  const category = pickString(o, "category", "type");
  const imageUrl = httpsImageUrl(pickString(o, "imageUrl"), name);
  const skills = parseSkills(o);

  const out: AgentUriParseResult = {};
  if (name) out.name = name;
  if (title) out.title = title;
  if (description) out.description = description;
  if (tagline) out.tagline = tagline;
  if (imageUrl) out.imageUrl = imageUrl;
  if (category) out.category = category;
  if (skills?.length) out.skills = skills;

  return Object.keys(out).length ? out : null;
}

function extractFromRegistrationJson(root: unknown): AgentUriParseResult | null {
  const top = asRecord(root);
  if (!top) return null;

  const v1Root = extractEip8004RegistrationV1(top);
  if (v1Root) return v1Root;

  const nested = asRecord(top.agent) ?? top;
  if (nested !== top) {
    const v1Nested = extractEip8004RegistrationV1(nested);
    if (v1Nested) return v1Nested;
  }

  return extractGenericRegistration(nested);
}

/**
 * Parses registration JSON embedded in `uri` without any network I/O.
 * Handles hex-encoded bytes (common from subgraphs), raw JSON (Ignition seed),
 * `data:application/json` URIs, and a single level of JSON string wrapping.
 */
export function parseAgentUriFromString(
  uri: string | null | undefined,
): AgentUriParseResult | null {
  const raw = uri?.trim();
  if (!raw) return null;

  const text = decodeAgentUriIfHex(raw);
  if (!text) return null;

  const inlineJson = parseJsonDocumentRoot(text);
  if (inlineJson !== null) {
    const fromJson = extractFromRegistrationJson(inlineJson);
    if (fromJson) return fromJson;
  }

  if (text.toLowerCase().startsWith("data:")) {
    const parsed = parseDataUriJson(text);
    if (parsed == null) return null;
    return extractFromRegistrationJson(parsed);
  }

  return null;
}

/**
 * Updates display fields on an EIP-8004 registration v1 JSON document while
 * preserving skills, skillHandles, services, and other non-display keys.
 */
export function mergeDisplayFieldsIntoRegistrationUri(
  rawUri: string | null | undefined,
  patch: { name: string; description: string; imageUrl: string },
): string {
  const raw = rawUri?.trim();
  let root: Record<string, unknown> = {
    type: EIP8004_REGISTRATION_V1_TYPE,
    name: patch.name.trim(),
    description: patch.description.trim(),
    imageUrl: patch.imageUrl.trim(),
    skills: ["General"],
    active: true,
  };

  if (raw) {
    const text = decodeAgentUriIfHex(raw);
    const parsed = parseJsonDocumentRoot(text);
    const rec =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? ({ ...(parsed as Record<string, unknown>) })
        : null;
    if (rec) root = rec;
  }

  root.type = EIP8004_REGISTRATION_V1_TYPE;
  root.name = patch.name.trim();
  root.description = patch.description.trim();
  root.imageUrl = patch.imageUrl.trim();

  return JSON.stringify(root);
}
