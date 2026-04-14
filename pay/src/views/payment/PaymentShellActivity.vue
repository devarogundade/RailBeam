<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ShellTransactionCard from "@/components/shell/ShellTransactionCard.vue";
import {
  usePayerShellSubscriptions,
  usePayerShellTransactions,
} from "@/composables/useBeamShellQueries";
import { useRoute, useRouter } from "vue-router";

type ActivityTab = "transactions" | "subscriptions";

const route = useRoute();
const router = useRouter();
const txQuery = usePayerShellTransactions(50);
const subQuery = usePayerShellSubscriptions();
const shellTx = computed(() => txQuery.data.value ?? []);
const subs = computed(() => subQuery.data.value ?? []);
const txLoading = computed(() => txQuery.isFetching.value);
const subLoading = computed(() => subQuery.isFetching.value);
const txError = computed(() => (txQuery.error.value as unknown) ?? null);

function normalizeTab(v: unknown): ActivityTab {
  return v === "subscriptions" ? "subscriptions" : "transactions";
}

const activeTab = ref<ActivityTab>(normalizeTab(route.query.tab));

watch(
  () => route.query.tab,
  (t) => {
    activeTab.value = normalizeTab(t);
  },
);

function setTab(t: ActivityTab) {
  if (activeTab.value === t) return;
  activeTab.value = t;
  router.replace({
    name: "payment-activity",
    query: { ...route.query, tab: t },
  });
}
</script>

<template>
  <section class="panel">
    <div class="tabs" role="tablist" aria-label="Activity tabs">
      <button
        type="button"
        class="tab-btn"
        role="tab"
        :aria-selected="activeTab === 'transactions'"
        :class="{ active: activeTab === 'transactions' }"
        @click="setTab('transactions')"
      >
        Transactions
      </button>
      <button
        type="button"
        class="tab-btn"
        role="tab"
        :aria-selected="activeTab === 'subscriptions'"
        :class="{ active: activeTab === 'subscriptions' }"
        @click="setTab('subscriptions')"
      >
        Subscriptions
      </button>
    </div>

    <div v-if="activeTab === 'transactions'" role="tabpanel" class="tab-panel">
      <p v-if="txError && !shellTx.length" class="hint muted">
        Couldn’t load transactions. Try again in a moment.
      </p>
      <p v-if="txLoading && !shellTx.length" class="hint">Loading transactions…</p>
      <p v-else-if="!shellTx.length" class="hint muted">
        No transactions yet, or connect a wallet that has paid through Beam.
      </p>
      <ul v-else class="tx-list tight">
        <ShellTransactionCard
          v-for="t in shellTx"
          :key="'a-' + t.id"
          :tx="t"
          @open="router.push({ name: 'payment-tx', params: { id: t.id } })"
        />
      </ul>
    </div>

    <div v-else role="tabpanel" class="tab-panel">
      <p v-if="subLoading && !subs.length" class="hint">Loading subscriptions…</p>
      <p v-else-if="!subs.length" class="hint muted">
        No active subscriptions for this wallet.
      </p>
      <ul v-else class="sub-list">
        <li
          v-for="s in subs"
          :key="'a-' + s.id"
          class="sub"
          role="button"
          tabindex="0"
          @click="router.push({ name: 'payment-subscription', params: { id: s.id } })"
          @keydown.enter.prevent="router.push({ name: 'payment-subscription', params: { id: s.id } })"
        >
          <img class="sub-av" :src="s.img" alt="" width="40" height="40" />
          <div class="sub-main">
            <p class="sub-name">{{ s.name }}</p>
            <p class="sub-meta">{{ s.cadence }} · Next {{ s.nextSummary }}</p>
          </div>
          <p class="sub-amt">{{ s.amount }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.panel {
  padding: 12px 0 max(28px, env(safe-area-inset-bottom, 0px));
  color: var(--tx-normal);
}
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 0 14px;
}
.tab-btn {
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(0, 0, 0, 0.18);
  color: var(--tx-semi);
  border-radius: var(--radius-12);
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
}
.tab-btn.active {
  background: rgba(255, 255, 255, 0.08);
  color: var(--tx-normal);
  border-color: rgba(255, 255, 255, 0.14);
}
.tab-btn:active {
  transform: scale(0.99);
}
.tab-btn:focus-visible {
  outline: 2px solid var(--primary-light);
  outline-offset: 2px;
}
.tab-panel {
  padding-top: 2px;
}
.tx-list {
  list-style: none;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  overflow: hidden;
  background: var(--bg-light);
  margin-bottom: 20px;
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
}
.sub-list {
  list-style: none;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  overflow: hidden;
  background: var(--bg-light);
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
}
.sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  min-height: 56px;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  cursor: pointer;
}
.sub:active {
  background: rgba(255, 255, 255, 0.06);
  transform: scale(0.995);
}
.sub:focus-visible {
  outline: 2px solid var(--primary-light);
  outline-offset: -2px;
}
.sub:last-child {
  border-bottom: none;
}
.sub-av {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-12);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  flex-shrink: 0;
}
.sub-main {
  flex: 1;
  min-width: 0;
}
.sub-name {
  font-size: 14px;
  font-weight: 500;
}
.sub-meta {
  font-size: 12px;
  color: var(--tx-dimmed);
  margin-top: 2px;
}
.sub-amt {
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
.hint {
  font-size: 14px;
  padding: 12px 0 16px;
  color: var(--tx-semi);
}
.hint.muted {
  color: var(--tx-dimmed);
}
</style>
