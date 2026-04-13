<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import PayerShareList from "@/components/PayerShareList.vue";
import { getDemoShellTransaction } from "@/data/demoShellTransactions";
import { notify } from "@/reactives/notify";
import { useWalletStore } from "@/stores/wallet";
import { buildPayerShareRows } from "@/utils/payerShares";
import AppFrame from "@/components/layout/AppFrame.vue";

const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();

const id = computed(() => (route.params.id as string) ?? "");

const tx = computed(() => getDemoShellTransaction(id.value));

const shareRows = computed(() => {
  const t = tx.value;
  if (!t?.payers?.length || !t.amountsWei?.length) return [];
  return buildPayerShareRows(t.payers, t.amountsWei, walletStore.address);
});

const metaRows = computed(() => {
  const t = tx.value;
  if (!t) {
    return [
      { k: "Transaction", v: `#${id.value}` },
      { k: "Status", v: "Not found (demo)" },
    ];
  }
  const n = t.payers?.length ?? 0;
  const rows: { k: string; v: string }[] = [
    { k: "Transaction", v: `#${t.id}` },
    { k: "Status", v: "Completed (demo)" },
    { k: "Date", v: t.detailDate ?? "—" },
    { k: "Network", v: t.detailNetwork ?? "—" },
    { k: "Total", v: t.amount },
  ];
  if (n > 1) rows.push({ k: "Payers", v: String(n) });
  return rows;
});

/** Demo amounts use parseEther; label as ETH for readability. */
const amountSymbol = "ETH";

function goBack() {
  router.push({ name: "payment-activity" });
}

function mintReceipt() {
  const t = tx.value;
  if (!t) return;
  notify.push({
    title: "Mint Receipt",
    description: `Demo: minting a receipt for “${t.title}” (${t.amount}).`,
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
          <h1 class="bar-title">Transaction</h1>
          <span class="bar-spacer" />
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <div class="page-body">
        <template v-if="tx">
          <div class="tx-hero">
            <img class="hero-av" :src="tx.img" alt="" width="56" height="56" />
            <div class="hero-text">
              <p class="hero-title">{{ tx.title }}</p>
              <p class="hero-amt" :class="tx.tone">{{ tx.amount }}</p>
            </div>
          </div>

          <ul class="rows">
            <li v-for="r in metaRows" :key="r.k" class="row">
              <span class="k">{{ r.k }}</span>
              <span class="v">{{ r.v }}</span>
            </li>
          </ul>

          <section v-if="shareRows.length > 1" class="payer-block">
            <h2 class="block-title">Split</h2>
            <p class="block-copy">Each payer’s share of the total (demo).</p>
            <div class="payer-card">
              <PayerShareList :rows="shareRows" :symbol="amountSymbol" />
            </div>
          </section>

          <p v-else class="note">Single-payer transaction — no split breakdown.</p>

          <footer class="mint-footer">
            <button type="button" class="mint-primary" @click="mintReceipt">Mint Receipt</button>
          </footer>
        </template>

        <template v-else>
          <p class="warn">No demo transaction for id “{{ id }}”. Open this screen from Activity or Home.</p>
          <button type="button" class="link-back" @click="goBack">Back to activity</button>
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
.tx-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
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
}
.hero-amt {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.hero-amt.green {
  color: var(--accent-green);
}
.hero-amt.red {
  color: var(--accent-red);
}
.mint-footer {
  margin-top: 28px;
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
  word-break: break-all;
}
.payer-block {
  margin-top: 20px;
}
.block-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}
.block-copy {
  font-size: 13px;
  color: var(--tx-dimmed);
  margin-bottom: 12px;
  line-height: 1.45;
}
.payer-card {
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: var(--bg-light);
  padding: 8px 16px 4px;
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
}
.note {
  margin-top: 16px;
  font-size: 13px;
  color: var(--tx-dimmed);
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
