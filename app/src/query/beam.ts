import type { Hex } from "viem";
import { beamSdk } from "@/scripts/beamSdk";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import type { Merchant, Transaction } from "beam-ts";
import type { Plan } from "@/types/app";
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

      const parseCatalog = (value: unknown): { name?: string; description?: string; images?: string[]; category?: string } => {
        if (typeof value !== "string") return {};
        try {
          const obj = JSON.parse(value);
          if (!obj || typeof obj !== "object") return {};
          return {
            name: typeof obj.name === "string" ? obj.name : undefined,
            description: typeof obj.description === "string" ? obj.description : undefined,
            images: Array.isArray(obj.images)
              ? obj.images.filter((x: unknown) => typeof x === "string")
              : undefined,
            category: typeof obj.category === "string" ? obj.category : undefined,
          };
        } catch {
          return {};
        }
      };

      return rows
        .filter((r) => !r.trashed)
        .map((r) => {
          const c = parseCatalog(r.catalog_metadata_value);
          return {
            _id: r.subsciptionId,
            transactionHash: r.transactionHash,
            merchant: r.merchant,
            name: c.name || r.description,
            description: c.description || r.description,
            images: c.images ?? [],
            category: c.category ?? "",
            gracePeriod: Number(r.gracePeriod),
            available: true,
            interval: Number(r.interval),
            amount: Number(r.amount),
            token: r.token,
            createdAt: new Date(Number(r.blockTimestamp) * 1000),
            updatedAt: null,
          } satisfies Plan;
        });
    },
  });
}

export function useBeamInvalidateMerchant() {
  const qc = useQueryClient();
  return (merchant: Hex | null | undefined) => {
    qc.invalidateQueries({ queryKey: beamQueryKeys.merchant(merchant) });
  };
}

