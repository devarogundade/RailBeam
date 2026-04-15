import type { Agent } from '@railbeam/beam-ts';

export type AgentCard = {
  name: string;
  description: string;
  image?: string;
  services?: Array<{ name?: string; endpoint?: string; version?: string }>;
  x402Support?: boolean;
  active?: boolean;
  supportedTrust?: string[];
};

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function agentCardFromUri(uri: string | null): AgentCard | null {
  if (!uri) return null;
  const parsed = safeJsonParse<AgentCard>(uri);
  return parsed;
}

export function agentDisplayName(agent: Agent): string {
  const card = agentCardFromUri(agent.uri);
  return card?.name?.trim() || `Agent #${agent.agentId.toString()}`;
}

export function agentDisplayDescription(agent: Agent): string {
  const card = agentCardFromUri(agent.uri);
  return card?.description?.trim() || "";
}

