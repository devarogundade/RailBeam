import { useQuery } from "@tanstack/vue-query";
import { beamSdk } from "@/scripts/beamSdk";
import type { Agent } from "beam-ts";
import type { Hex } from "viem";
import { computed, unref, type Ref } from "vue";

type MaybeRef<T> = T | Ref<T>;

export const agentQueryKeys = {
  myAgents: (owner: Hex | null | undefined) => ["beamAgents", owner ?? null] as const,
};

export function useBeamAgentsQuery(owner: MaybeRef<Hex | null | undefined>) {
  return useQuery({
    queryKey: computed(() => agentQueryKeys.myAgents(unref(owner))),
    enabled: computed(() => !!unref(owner)),
    queryFn: async (): Promise<Agent[]> => {
      const o = unref(owner) as Hex;
      return beamSdk.agents.getAgents({ page: 1, limit: 100, owner: o });
    },
  });
}

