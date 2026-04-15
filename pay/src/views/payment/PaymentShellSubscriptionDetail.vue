<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import { useShellSubscriptionDetail } from "@/composables/useBeamShellQueries";
import { notify } from "@/reactives/notify";
import AppFrame from "@/components/layout/AppFrame.vue";
import { mapSubscriptionToShellRow } from "@/scripts/shellActivity";
import { useWalletStore } from "@/stores/wallet";
import { TransactionType } from '@railbeam/beam-ts';
import type { Transaction } from '@railbeam/beam-ts';
import type { Hex } from "viem";
import { getBeamSdk } from "@/scripts/beamSdk";
import { BeamContract } from "@/scripts/contract";
import { SCHEMA_JSON } from '@railbeam/beam-ts';
import { zeroAddress } from "viem";
import StorageImage from "@/components/StorageImage.vue";

const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();

const id = computed(() => (route.params.id as string) ?? "");

const { data: plan, isFetching } = useShellSubscriptionDetail(id);

const cancelledLocal = ref(false);
const cancelling = ref(false);
const renewing = ref(false);

const latestTx = ref<Transaction | null>(null);
watch(id, () => {
  cancelledLocal.value = false;
  latestTx.value = null;
});

const sub = computed(() => {
  const p = plan.value;
  if (!p) return null;
  return mapSubscriptionToShellRow(p, latestTx.value);
});

const statusDisplay = computed(() => {
  if (cancelledLocal.value) return "Cancelled (local)";
  return sub.value?.status ?? "—";
});

const planImage = computed(() => {
  const p = plan.value;
  const rawValue = p?.catalog_metadata_value;
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return null;
  try {
    const obj = JSON.parse(rawValue) as unknown;
    if (!obj || typeof obj !== "object") return null;
    const images = (obj as Record<string, unknown>).images;
    if (!Array.isArray(images) || images.length === 0) return null;
    const first = images[0];
    if (typeof first !== "string") return null;
    const trimmed = first.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
});

function toBigIntSafe(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return 0n;
    return BigInt(Math.trunc(v));
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0n;
    try {
      return BigInt(s);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

function daysUntil(tsSec: number): number | null {
  if (!Number.isFinite(tsSec) || tsSec <= 0) return null;
  const nowSec = Date.now() / 1000;
  return Math.ceil((tsSec - nowSec) / 86400);
}

const nextChargeDays = computed(() => {
  const p = plan.value;
  const txDue = latestTx.value?.dueDate;
  const txDueNum =
    typeof txDue === "string" ? Number(txDue) : typeof txDue === "number" ? txDue : 0;

  const startedSec = p ? Number(p.blockTimestamp) : 0;
  const durationSec = p ? Number(p.interval) : 0;
  const computedDueSec =
    startedSec > 0 && durationSec > 0 ? startedSec + durationSec : 0;

  const dueSec = computedDueSec > 0 ? computedDueSec : txDueNum;
  return daysUntil(dueSec);
});

const nextChargeDisplay = computed(() => {
  if (nextChargeDays.value == null) return sub.value?.next ?? "—";
  if (nextChargeDays.value <= 0) return "Due now";
  if (nextChargeDays.value === 1) return "In 1 day";
  return `In ${nextChargeDays.value} days`;
});

const metaRows = computed(() => {
  const s = sub.value;
  const p = plan.value;
  if (!s || !p) {
    return [
      { k: "Subscription", v: id.value.slice(0, 18) + (id.value.length > 18 ? "…" : "") },
      { k: "Status", v: "Not found" },
    ];
  }
  return [
    { k: "Subscription", v: `${p.subsciptionId.slice(0, 10)}…${p.subsciptionId.slice(-6)}` },
    { k: "Status", v: statusDisplay.value },
    { k: "Merchant", v: s.merchant },
    { k: "Plan", v: p.description?.trim() || "—" },
    { k: "Cadence", v: s.cadence },
    { k: "Due date", v: `${s.next}${nextChargeDays.value != null ? ` · ${nextChargeDisplay.value}` : ""}` },
    { k: "Amount", v: `${s.amount} / ${s.cadence.toLowerCase()}` },
    { k: "Started", v: s.started },
    { k: "Network", v: s.network },
  ];
});

const invalidId = computed(
  () => !!id.value && !id.value.toLowerCase().startsWith("0x")
);

function goBack() {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    void router.push({ name: "payment-activity" });
  }
}

function mintReceipt() {
  const s = sub.value;
  if (!s) return;
  notify.push({
    title: "Mint Receipt",
    description: cancelledLocal.value
      ? `Past-period receipt for “${s.name}”.`
      : `Minting a subscription receipt for “${s.name}” (${s.amount}).`,
    category: "success",
  });
}

async function loadLatestSubscriptionTx() {
  const p = plan.value;
  const addr = walletStore.address;
  if (!p || !addr || !addr.toLowerCase().startsWith("0x")) {
    latestTx.value = null;
    return;
  }
  const sdk = getBeamSdk();
  const txs = await sdk.recurrentTransaction
    .getPayerTransactions({
      payer: addr as Hex,
      page: 1,
      limit: 100,
      type: TransactionType.Recurrent,
    })
    .catch(() => []);

  const matches = txs.filter(
    (t) =>
      (t.subscriptionId ?? "").toLowerCase() === p.subsciptionId.toLowerCase(),
  );
  if (matches.length === 0) {
    latestTx.value = null;
    return;
  }
  latestTx.value = matches.reduce((best, t) => {
    const bt = toBigIntSafe(t.timestamp ?? 0);
    const bb = toBigIntSafe(best.timestamp ?? 0);
    return bt > bb ? t : best;
  }, matches[0]!);
}

watch([id, () => walletStore.address], () => {
  void loadLatestSubscriptionTx();
});

async function cancelSubscription() {
  const p = plan.value;
  const addr = walletStore.address;
  if (!p || cancelledLocal.value || !addr || cancelling.value) return;
  cancelling.value = true;
  try {
    const sdk = getBeamSdk();
    const txs = await sdk.recurrentTransaction
      .getPayerTransactions({
        payer: addr as Hex,
        page: 1,
        limit: 100,
        type: TransactionType.Recurrent,
      })
      .catch(() => []);
    const match = txs.find(
      (t) =>
        (t.subscriptionId ?? "").toLowerCase() === p.subsciptionId.toLowerCase(),
    );
    if (!match) {
      notify.push({
        title: "Cancel",
        description:
          "No matching recurrent transaction for this wallet. Connect the wallet that originally subscribed.",
        category: "error",
      });
      return;
    }

    const txHash = await BeamContract.cancelRecurrentTransaction({
      transactionId: match.id as Hex,
    });

    if (!txHash) {
      notify.push({
        title: "Cancel failed",
        description: "Transaction was rejected or failed.",
        category: "error",
      });
      return;
    }

    cancelledLocal.value = true;
    notify.push({
      title: "Cancellation sent",
      description: "Your subscription cancellation was submitted on-chain.",
      category: "success",
      linkTitle: "View Tx",
      linkUrl: `${import.meta.env.VITE_EXPLORER_URL}/tx/${txHash}`,
    });
    await loadLatestSubscriptionTx();
  } finally {
    cancelling.value = false;
  }
}

async function renewSubscription() {
  const p = plan.value;
  const addr = walletStore.address;
  if (!p || !addr || renewing.value) return;
  renewing.value = true;
  try {
    const value =
      (p.token ?? zeroAddress) === zeroAddress ? toBigIntSafe(p.amount) : 0n;
    const txHash = await BeamContract.recurrentTransaction(
      {
        merchant: p.merchant as Hex,
        subscriptionId: p.subsciptionId as Hex,
        description: p.description?.trim() || "",
        metadata: { schemaVersion: SCHEMA_JSON, value: "{}" },
      },
      value,
    );

    if (!txHash) {
      notify.push({
        title: "Renew failed",
        description: "Transaction was rejected or failed.",
        category: "error",
      });
      return;
    }

    cancelledLocal.value = false;
    notify.push({
      title: "Renewal sent",
      description: "Your subscription renewal was submitted on-chain.",
      category: "success",
      linkTitle: "View Tx",
      linkUrl: `${import.meta.env.VITE_EXPLORER_URL}/tx/${txHash}`,
    });
    await loadLatestSubscriptionTx();
  } finally {
    renewing.value = false;
  }
}
</script>

<template>
  <div class="page">
    <header class="bar sticky-top">
      <AppFrame :topInset="false">
        <div class="bar__inner">
          <button type="button" class="icon-btn" aria-label="Back" @click="goBack">
            <ChevronLeftIcon />
          </button>
          <h1 class="bar-title">Subscription</h1>
          <span class="bar-spacer" />
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <div class="page-body">
        <p v-if="invalidId" class="warn">
          Invalid subscription id. Open this screen from Activity or Home.
        </p>
        <p v-else-if="isFetching && !plan" class="muted">Loading…</p>

        <template v-else-if="sub && plan">
          <div class="hero">
            <StorageImage class="hero-av" :src="planImage || sub.img" alt="" width="56" height="56" />
            <div class="hero-text">
              <p class="hero-title">{{ sub.name }}</p>
              <p class="hero-amt">
                {{ sub.amount }} <span class="per">/ {{ sub.cadence.toLowerCase() }}</span>
              </p>
              <p class="hero-merchant">{{ sub.merchant }}</p>
            </div>
          </div>

          <p class="lead">{{ sub.description }}</p>

          <ul class="rows">
            <li v-for="r in metaRows" :key="r.k" class="row">
              <span class="k">{{ r.k }}</span>
              <span class="v">{{ r.v }}</span>
            </li>
          </ul>

          <p class="note">
            Cancelling is handled through the Beam recurrent checkout when your wallet matches the payer on-chain.
          </p>

          <div class="sub-actions">
            <button type="button" class="cancel-sub" :disabled="cancelledLocal || cancelling"
              @click="cancelSubscription">
              {{
                cancelledLocal
                  ? "Cancelled"
                  : cancelling
                    ? "Cancelling…"
                    : "Cancel subscription"
              }}
            </button>

            <button type="button" class="renew-sub" :disabled="renewing" @click="renewSubscription">
              {{ renewing ? "Renewing…" : "Renew subscription" }}
            </button>
          </div>

          <footer class="mint-footer">
            <button type="button" class="mint-primary" @click="mintReceipt">Mint Receipt</button>
          </footer>
        </template>

        <template v-else-if="!invalidId">
          <p class="warn">
            No subscription found for this id. Try again later.
          </p>
          <button type="button" class="link-back" @click="goBack">Back</button>
        </template>
      </div>
    </AppFrame>
  </div>
</template>

<style scoped>
.page {
  min-height: 50vh;
  color: var(--tx-normal);
  padding: 0;
}

.page-body {
  padding: 12px 0 max(28px, env(safe-area-inset-bottom, 0px));
}

.muted {
  font-size: 14px;
  color: var(--tx-dimmed);
}

.bar {
  margin: 0 0 20px;
  position: sticky;
  top: 0;
  z-index: 30;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 0 12px;
  background: var(--frost-bg, rgba(22, 22, 24, 0.78));
  backdrop-filter: blur(24px) saturate(1.65);
  -webkit-backdrop-filter: blur(24px) saturate(1.65);
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.bar__inner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.icon-btn {
  width: var(--native-tap, 44px);
  height: var(--native-tap, 44px);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(36, 36, 38, 0.95);
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
  cursor: pointer;
}

.icon-btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}

.bar-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
}

.bar-spacer {
  width: 44px;
}

.hero {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
  padding: 4px 0;
}

.hero-av {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-14);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  flex-shrink: 0;
}

.hero-text {
  min-width: 0;
}

.hero-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.hero-amt {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--tx-normal);
}

.hero-amt .per {
  font-size: 15px;
  font-weight: 600;
  color: var(--tx-dimmed);
}

.hero-merchant {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--tx-semi);
  line-height: 1.35;
}

.lead {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--tx-semi);
}

.rows {
  list-style: none;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  overflow: hidden;
  background: var(--bg-light);
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  font-size: 14px;
}

.row:last-child {
  border-bottom: none;
}

.k {
  color: var(--tx-dimmed);
}

.v {
  color: var(--tx-normal);
  text-align: right;
  word-break: break-word;
}

.note {
  margin-top: 18px;
  font-size: 13px;
  color: var(--tx-dimmed);
  line-height: 1.45;
}

.sub-actions {
  margin-top: 20px;
  display: grid;
  gap: 10px;
}

.cancel-sub {
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  border-radius: var(--radius-14);
  border: 1px solid rgba(220, 80, 80, 0.45);
  background: transparent;
  color: #e85d5d;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.cancel-sub:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  border-color: var(--bg-lightest);
  color: var(--tx-dimmed);
}

.cancel-sub:not(:disabled):active {
  opacity: 0.88;
}

.renew-sub {
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.12));
  background: rgba(36, 36, 38, 0.95);
  color: var(--tx-normal);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.renew-sub:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.renew-sub:not(:disabled):active {
  transform: scale(0.99);
  opacity: 0.9;
}

.mint-footer {
  margin-top: 20px;
  padding-top: 16px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--bg-lightest);
}

.mint-primary {
  width: 100%;
  min-height: var(--native-tap, 44px);
  border: none;
  border-radius: var(--radius-14);
  background: var(--primary);
  color: var(--tx-normal);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(245, 95, 20, 0.35);
}

.mint-primary:active {
  transform: scale(0.98);
  opacity: 0.94;
}

.warn {
  font-size: 14px;
  color: var(--tx-semi);
  line-height: 1.5;
}

.link-back {
  margin-top: 16px;
  padding: 0;
  border: none;
  background: none;
  color: var(--primary-light);
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
}
</style>
