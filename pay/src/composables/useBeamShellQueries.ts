import { useQuery } from "@tanstack/vue-query";
import { computed, unref, type MaybeRefOrGetter, toValue } from "vue";
import type { Hex } from "viem";
import { TransactionType } from '@railbeam/beam-ts';
import type { Transaction } from '@railbeam/beam-ts';
import { getBeamSdk } from "@/scripts/beamSdk";
import {
  buildShellSubscriptions,
  mapTransactionToShellRow,
  type ShellSubRow,
  type ShellTxRow,
} from "@/scripts/shellActivity";
import { useWalletStore } from "@/stores/wallet";

function safePayerTxs(
  fetcher: () => Promise<Transaction[]>,
): Promise<Transaction[]> {
  return fetcher().catch(() => []);
}

function normalizeHexAddress(v: unknown): Hex | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  // Minimal Hex address guard to avoid silently querying nonsense.
  if (!lower.startsWith("0x") || lower.length !== 42) return null;
  return lower as Hex;
}

export function usePayerShellTransactions(
  limit: MaybeRefOrGetter<number> = 50,
) {
  const wallet = useWalletStore();
  const address = computed(() => normalizeHexAddress(wallet.address));

  return useQuery({
    queryKey: computed(() => [
      "beam",
      "shell-txs",
      unref(address),
      toValue(limit),
    ]),
    queryFn: async (): Promise<ShellTxRow[]> => {
      const addr = unref(address);
      if (!addr) return [];
      const sdk = getBeamSdk();
      const txs = await safePayerTxs(() =>
        sdk.oneTimeTransaction.getPayerTransactions({
          payer: addr,
          page: 1,
          limit: toValue(limit),
        }),
      );
      return txs.map((t) => mapTransactionToShellRow(t, addr));
    },
    enabled: computed(() => !!unref(address)),
  });
}

export function usePayerShellSubscriptions() {
  const wallet = useWalletStore();
  const address = computed(() => normalizeHexAddress(wallet.address));

  return useQuery({
    queryKey: computed(() => ["beam", "shell-subs", unref(address)]),
    queryFn: async (): Promise<ShellSubRow[]> => {
      const addr = unref(address);
      if (!addr) return [];
      const sdk = getBeamSdk();
      const txs = await safePayerTxs(() =>
        sdk.recurrentTransaction.getPayerTransactions({
          payer: addr,
          page: 1,
          limit: 100,
          type: TransactionType.Recurrent,
        }),
      );
      return buildShellSubscriptions(txs, (id) =>
        sdk.recurrentTransaction.getSubscription({ subscriptionId: id }),
      );
    },
    enabled: computed(() => !!unref(address)),
  });
}

export function useShellTransactionDetail(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ["beam", "shell-tx", toValue(id).toLowerCase()]),
    queryFn: async () => {
      const raw = toValue(id);
      if (!raw?.startsWith("0x")) return null;
      const sdk = getBeamSdk();
      try {
        return await sdk.oneTimeTransaction.getTransaction({
          transactionId: raw as Hex,
        });
      } catch {
        return null;
      }
    },
    enabled: computed(() => toValue(id)?.startsWith("0x") ?? false),
  });
}

export function useShellSubscriptionDetail(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ["beam", "shell-sub", toValue(id).toLowerCase()]),
    queryFn: async () => {
      const raw = toValue(id);
      if (!raw?.startsWith("0x")) return null;
      const sdk = getBeamSdk();
      try {
        return await sdk.recurrentTransaction.getSubscription({
          subscriptionId: raw as Hex,
        });
      } catch {
        return null;
      }
    },
    enabled: computed(() => toValue(id)?.startsWith("0x") ?? false),
  });
}
