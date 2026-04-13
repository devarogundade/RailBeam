<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import { getDemoShellSubscription } from "@/data/demoShellSubscriptions";
import { notify } from "@/reactives/notify";
import AppFrame from "@/components/layout/AppFrame.vue";

const route = useRoute();
const router = useRouter();

const id = computed(() => (route.params.id as string) ?? "");

const sub = computed(() => getDemoShellSubscription(id.value));

/** Demo: local cancel state until a real API exists. */
const cancelledLocal = ref(false);
watch(id, () => {
  cancelledLocal.value = false;
});

const statusDisplay = computed(() => {
  if (cancelledLocal.value) return "Cancelled (demo)";
  return sub.value?.status ?? "—";
});

const metaRows = computed(() => {
  const s = sub.value;
  if (!s) {
    return [
      { k: "Subscription", v: `#${id.value}` },
      { k: "Status", v: "Not found (demo)" },
    ];
  }
  return [
    { k: "Subscription", v: s.id },
    { k: "Status", v: statusDisplay.value },
    { k: "Merchant", v: s.merchant },
    { k: "Plan", v: s.planId },
    { k: "Cadence", v: s.cadence },
    { k: "Next charge", v: s.next },
    { k: "Amount", v: `${s.amount} / ${s.cadence.toLowerCase()}` },
    { k: "Started", v: s.started },
    { k: "Network", v: s.network },
  ];
});

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
      ? `Demo: past-period receipt for “${s.name}”.`
      : `Demo: minting a subscription receipt for “${s.name}” (${s.amount}).`,
    category: "success",
  });
}

function cancelSubscription() {
  const s = sub.value;
  if (!s || cancelledLocal.value) return;
  cancelledLocal.value = true;
  notify.push({
    title: "Subscription cancelled",
    description: `Demo: “${s.name}” will not renew. You can still mint a receipt for past charges.`,
    category: "success",
  });
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
        <template v-if="sub">
          <div class="hero">
            <img class="hero-av" :src="sub.img" alt="" width="56" height="56" />
            <div class="hero-text">
              <p class="hero-title">{{ sub.name }}</p>
              <p class="hero-amt">{{ sub.amount }} <span class="per">/ {{ sub.cadence.toLowerCase() }}</span></p>
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
            Cancelling stops future renewals in this demo. On-chain billing would call your wallet/SDK here.
          </p>

          <div class="sub-actions">
            <button
              type="button"
              class="cancel-sub"
              :disabled="cancelledLocal"
              @click="cancelSubscription"
            >
              {{ cancelledLocal ? "Cancelled" : "Cancel subscription" }}
            </button>
          </div>

          <footer class="mint-footer">
            <button type="button" class="mint-primary" @click="mintReceipt">Mint Receipt</button>
          </footer>
        </template>

        <template v-else>
          <p class="warn">No demo subscription for id “{{ id }}”. Open this screen from Activity or Home.</p>
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
