import type { Hex } from "viem";
import { beamSdk } from "@/scripts/beamSdk";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import type { Merchant, Transaction } from "@railbeam/beam-ts";
import type { Plan } from "@railbeam/beam-ts";
import { mapSubscriptionPlanToPlan } from "@railbeam/beam-ts";
import { computed, unref, type Ref } from "vue";

type MaybeRef<T> = T | Ref<T>;

export const beamQueryKeys = {
  merchant: (merchant: Hex | null | undefined) => ["beamMerchant", merchant ?? null] as const,
  plans: (merchant: Hex | null | undefined) => ["beamPlans", merchant ?? null] as const,
  oneTimeTxns: (merchant: Hex | null | undefined, page = 1, limit = 50) =>
    ["beamOneTimeTxns", merchant ?? null, page, limit] as const,
};

export function useBeamMerchantQuery(merchant: MaybeRef<Hex | null | undefined>) {
  return useQuery({
    queryKey: computed(() => beamQueryKeys.merchant(unref(merchant))),
    enabled: computed(() => !!unref(merchant)),
    queryFn: async (): Promise<Merchant | null> => {
      const m = unref(merchant) as Hex;
      return beamSdk.merchant.getMerchant({ merchant: m });
    },
  });
}

export function useBeamOneTimeTransactionsQuery(
  merchant: MaybeRef<Hex | null | undefined>,
  params?: { page?: number; limit?: number },
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  return useQuery({
    queryKey: computed(() => beamQueryKeys.oneTimeTxns(unref(merchant), page, limit)),
    enabled: computed(() => !!unref(merchant)),
    queryFn: async (): Promise<Transaction[]> => {
      const m = unref(merchant) as Hex;
      return beamSdk.oneTimeTransaction.getTransactions({ merchant: m, page, limit });
    },
  });
}

export function useBeamPlansQuery(merchant: MaybeRef<Hex | null | undefined>) {
  return useQuery({
    queryKey: computed(() => beamQueryKeys.plans(unref(merchant))),
    enabled: computed(() => !!unref(merchant)),
    queryFn: async (): Promise<Plan[]> => {
      const m = unref(merchant) as Hex;
      const rows = (await beamSdk.recurrentTransaction.getSubscriptions({
        merchant: m,
        page: 1,
        limit: 1000,
      })) as any[];

      return rows
        .filter((r) => !r.trashed)
        .map((r) => mapSubscriptionPlanToPlan(r));
    },
  });
}

export function useBeamInvalidateMerchant() {
  const qc = useQueryClient();
  return (merchant: Hex | null | undefined) => {
    qc.invalidateQueries({ queryKey: beamQueryKeys.merchant(merchant) });
  };
}

