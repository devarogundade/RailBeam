import { useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import type { Hex } from "viem";
import type { Agent, AgentMetadata } from "beam-ts/src/types";
import { getBeamSdk } from "@/scripts/beamSdk";

export function useBeamAgents(params?: {
  page?: MaybeRefOrGetter<number>;
  limit?: MaybeRefOrGetter<number>;
  owner?: MaybeRefOrGetter<Hex | undefined>;
}) {
  const page = computed(() => toValue(params?.page) ?? 1);
  const limit = computed(() => toValue(params?.limit) ?? 50);
  const owner = computed(() => toValue(params?.owner));

  return useQuery({
    queryKey: computed(() => ["beam", "agents", page.value, limit.value, owner.value]),
    queryFn: async (): Promise<Agent[]> => {
      const sdk = getBeamSdk();
      return sdk.agents.getAgents({
        page: page.value,
        limit: limit.value,
        owner: owner.value,
      });
    },
  });
}

export function useBeamAgentByAgentId(agentId: MaybeRefOrGetter<number | string>) {
  const idNum = computed(() => {
    const raw = toValue(agentId);
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
  });

  return useQuery({
    queryKey: computed(() => ["beam", "agent", idNum.value]),
    queryFn: async (): Promise<Agent | null> => {
      const n = idNum.value;
      if (n == null) return null;
      const sdk = getBeamSdk();
      return sdk.agents.getAgentByAgentId({ agentId: n });
    },
    enabled: computed(() => idNum.value != null),
  });
}

export function useBeamAgentMetadata(params: {
  agentId: MaybeRefOrGetter<number | string>;
  key?: MaybeRefOrGetter<string | undefined>;
  page?: MaybeRefOrGetter<number | undefined>;
  limit?: MaybeRefOrGetter<number | undefined>;
}) {
  const agentIdNum = computed(() => {
    const raw = toValue(params.agentId);
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
  });
  const key = computed(() => toValue(params.key));
  const page = computed(() => toValue(params.page));
  const limit = computed(() => toValue(params.limit));

  return useQuery({
    queryKey: computed(() => ["beam", "agent-metadata", agentIdNum.value, key.value, page.value, limit.value]),
    queryFn: async (): Promise<AgentMetadata[]> => {
      const n = agentIdNum.value;
      if (n == null) return [];
      const sdk = getBeamSdk();
      return sdk.agents.getAgentMetadata({
        agentId: n,
        key: key.value,
        page: page.value,
        limit: limit.value,
      });
    },
    enabled: computed(() => agentIdNum.value != null),
  });
}

