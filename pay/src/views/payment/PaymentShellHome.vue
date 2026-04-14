<script setup lang="ts">
import type { Ref } from "vue";
import { computed, inject } from "vue";
import { useRouter } from "vue-router";
import { useWalletStore } from "@/stores/wallet";
import PlusIcon from "@/components/icons/PlusIcon.vue";
import ShellTransactionCard from "@/components/shell/ShellTransactionCard.vue";
import {
  usePayerShellSubscriptions,
  usePayerShellTransactions,
} from "@/composables/useBeamShellQueries";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

type CardApi = { openCardSheet: () => void; cardFrozen: Ref<boolean>; };
type AssetsApi = { openAssetsSheet: () => void; };
const card = inject<CardApi>("paymentShellCard");
const assetsApi = inject<AssetsApi>("paymentShellAssets");
const router = useRouter();
const walletStore = useWalletStore();

const txQuery = usePayerShellTransactions(50);
const subQuery = usePayerShellSubscriptions();
const recentTx = computed(() => (txQuery.data.value ?? []).slice(0, 3));
const subs = computed(() => subQuery.data.value ?? []);
const txLoading = computed(() => txQuery.isFetching.value);
const txError = computed(() => (txQuery.error.value as unknown) ?? null);


const swiperMods = [Pagination];

function parseSignedAmountNumber(v: string): number {
  // `ShellTxRow.amount` is formatted like "+0.42 0G" or "-1.0 USDC".
  const m = v.trim().match(/^([+-]?\d+(?:\.\d+)?)/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function parseSymbol(v: string): string | null {
  const parts = v.trim().split(/\s+/);
  if (parts.length < 2) return null;
  return parts[parts.length - 1] || null;
}

const primarySymbol = computed(() => {
  const rows = txQuery.data.value ?? [];
  for (const r of rows) {
    const sym = parseSymbol(r.amount);
    if (sym) return sym;
  }
  return "TOKEN";
});

const netBalance = computed(() => {
  const rows = txQuery.data.value ?? [];
  const net = rows.reduce((acc, r) => acc + parseSignedAmountNumber(r.amount), 0);
  const rounded = Math.round(net * 10_000) / 10_000;
  return `${rounded} ${primarySymbol.value}`;
});

</script>

<template>
  <div class="tab">
    <section class="card-wrap">
      <Swiper class="cards-swiper" :modules="swiperMods" :slides-per-view="1.1" :space-between="10"
        :centered-slides="false" :pagination="{ clickable: true }">
        <SwiperSlide>
          <div class="bal-card" role="button" tabindex="0" aria-label="Open assets"
            @click="assetsApi?.openAssetsSheet()" @keydown.enter.prevent="assetsApi?.openAssetsSheet()"
            @keydown.space.prevent="assetsApi?.openAssetsSheet()">
            <div class="bal-card-bg" />
            <div class="bal-card-top">
              <p class="bal-kicker">Balance</p>
              <p class="bal-pill">
                <span class="dot" :class="{ on: !!walletStore.address }" />
                {{ walletStore.address ? "Connected" : "Connect wallet" }}
              </p>
            </div>
            <p class="bal-amt">{{ walletStore.address ? netBalance : `0 ${primarySymbol}` }}</p>
            <p class="bal-sub">
              {{ walletStore.address ? "Tap to view assets" : "Connect to see your assets" }}
            </p>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <div class="v-card" :class="{ frozen: card?.cardFrozen?.value }" role="button" tabindex="0"
            aria-label="Open card details" @click="card?.openCardSheet()" @keydown.enter.prevent="card?.openCardSheet()"
            @keydown.space.prevent="card?.openCardSheet()">
            <div class="v-card-bg" />
            <p v-if="card?.cardFrozen?.value" class="frozen-badge">Frozen</p>
            <div class="v-card-top">
              <span class="network">VISA</span>
              <span class="dots">···· {{ walletStore.address?.slice(-4) ?? "—" }}</span>
              <span class="exp">Exp —</span>
            </div>
            <div class="v-card-mid">
              <p class="bal-label">Card</p>
              <p class="bal-val">—</p>
            </div>
            <button type="button" class="fab-plus" aria-label="Add funds"
              @click.stop="router.push({ name: 'payment-fund' })">
              <PlusIcon />
            </button>
          </div>
        </SwiperSlide>
      </Swiper>
    </section>
    <section class="quick">
      <h2>Quick actions</h2>
      <div class="quick-row">
        <button type="button" class="q" @click="router.push({ name: 'payment-scan' })"><span
            class="q-ico qr" /><span>Scan QR</span></button>
        <button type="button" class="q" @click="router.push({ name: 'payment-send' })"><span
            class="q-ico send" /><span>Send</span></button>
        <button type="button" class="q" @click="router.push({ name: 'payment-receive' })"><span
            class="q-ico recv" /><span>Receive</span></button>
      </div>
    </section>
    <section class="list-sec">
      <div class="list-head">
        <h2>Transactions</h2><button type="button" class="linkish"
          @click="router.push({ name: 'payment-activity' })">View all</button>
      </div>
      <p v-if="walletStore.address && txError" class="list-empty">
        Couldn’t load transactions. Try again in a moment.
      </p>
      <p v-else-if="walletStore.address && txLoading && !recentTx.length" class="list-empty">
        Loading transactions…
      </p>
      <p v-if="walletStore.address && !recentTx.length" class="list-empty">No recent transactions.</p>
      <ul v-else-if="recentTx.length" class="tx-list">
        <ShellTransactionCard v-for="t in recentTx" :key="t.id" :tx="t"
          @open="router.push({ name: 'payment-tx', params: { id: t.id } })" />
      </ul>
      <p v-else class="list-empty">Connect a wallet to load activity.</p>
    </section>
    <section class="list-sec">
      <div class="list-head">
        <h2>Subscriptions</h2><button type="button" class="linkish"
          @click="router.push({ name: 'payment-activity' })">Manage</button>
      </div>
      <p v-if="walletStore.address && !subs.length" class="list-empty">No subscriptions for this wallet.</p>
      <ul v-else-if="subs.length" class="sub-list">
        <li v-for="s in subs" :key="s.id" class="sub" role="button" tabindex="0"
          @click="router.push({ name: 'payment-subscription', params: { id: s.id } })"
          @keydown.enter.prevent="router.push({ name: 'payment-subscription', params: { id: s.id } })">
          <img class="sub-av" :src="s.img" alt="" width="40" height="40" />
          <div class="sub-main">
            <p class="sub-name">{{ s.name }}</p>
            <p class="sub-meta">{{ s.cadence }} · Next {{ s.nextSummary }}</p>
          </div>
          <p class="sub-amt">{{ s.amount }}</p>
        </li>
      </ul>
      <p v-else class="list-empty">Connect a wallet to load subscriptions.</p>
    </section>
  </div>
</template>

<style scoped>
.tab {
  color: var(--tx-normal);
  padding: 8px max(4px, env(safe-area-inset-left, 0px)) max(32px, env(safe-area-inset-bottom, 0px)) max(4px, env(safe-area-inset-right, 0px));
}

.card-wrap {
  margin-bottom: 22px;
}

.cards-swiper {
  padding-bottom: 18px;
}

.cards-swiper :deep(.swiper-pagination) {
  bottom: 0;
}

.cards-swiper :deep(.swiper-pagination-bullet) {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  opacity: 1;
  margin: 0 4px !important;
}

.cards-swiper :deep(.swiper-pagination-bullet-active) {
  background: rgba(255, 255, 255, 0.72);
}

.bal-card {
  position: relative;
  border-radius: var(--radius-14);
  padding: 22px 22px 22px;
  min-height: 168px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: none;
  cursor: pointer;
  text-align: left;
}

.bal-card:active {
  opacity: 0.94;
}

.bal-card-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 0% 0%, rgba(80, 120, 255, 0.32), transparent 58%),
    radial-gradient(90% 80% at 100% 100%, rgba(245, 95, 20, 0.2), transparent 55%),
    linear-gradient(145deg, #1f1f24 0%, #0c0c0f 100%);
}

.bal-card-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bal-kicker {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
  font-weight: 700;
}

.bal-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  padding: 6px 10px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.bal-pill .dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
}

.bal-pill .dot.on {
  background: rgba(80, 255, 170, 0.85);
}

.bal-amt {
  position: relative;
  z-index: 1;
  margin-top: 28px;
  font-size: 34px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.bal-sub {
  position: relative;
  z-index: 1;
  margin-top: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}

.v-card {
  position: relative;
  border-radius: var(--radius-14);
  padding: 22px 22px 26px;
  min-height: 168px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: none;
  cursor: pointer;
  text-align: left;
}

.v-card.frozen {
  opacity: 0.88;
  filter: grayscale(0.25);
}

.frozen-badge {
  position: absolute;
  top: 14px;
  right: 56px;
  z-index: 2;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: var(--radius-6);
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--tx-semi);
}

.v-card-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 80% at 20% 0%, rgba(245, 95, 20, 0.35), transparent 55%),
    radial-gradient(90% 70% at 100% 100%, rgba(80, 120, 255, 0.2), transparent 50%),
    linear-gradient(145deg, #1f1f24 0%, #0c0c0f 100%);
}

.v-card-top,
.v-card-mid {
  position: relative;
  z-index: 1;
}

.v-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.network {
  font-weight: 700;
}

.dots {
  flex: 1;
  font-variant-numeric: tabular-nums;
}

.exp {
  font-size: 11px;
}

.v-card-mid {
  margin-top: 28px;
}

.bal-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}

.bal-val {
  margin-top: 6px;
  font-size: 32px;
  font-weight: 600;
}

.fab-plus {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 3;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-round);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: var(--tx-normal);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.fab-plus :deep(svg) {
  width: 20px;
  height: 20px;
}

.highlights h2,
.quick h2 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.list-sec .list-head h2 {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}

.hl-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.hl {
  border-radius: var(--radius-12);
  padding: 14px 16px;
  background: var(--bg-light);
  border: 1px solid var(--bg-lightest);
}

.hl-ico {
  width: 20px;
  height: 20px;
  opacity: 0.85;
}

.hl-label {
  margin-top: 10px;
  font-size: 12px;
  color: var(--tx-dimmed);
}

.hl-amt {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 600;
}

.quick {
  margin-top: 22px;
}

.quick-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.q {
  border-radius: var(--radius-14);
  min-height: 76px;
  padding: 14px 8px;
  background: var(--bg-light);
  border: 1px solid var(--bg-lightest);
  color: var(--tx-normal);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.q:active {
  opacity: 0.92;
}

.q-ico {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-10);
  background: var(--bg-lighter);
  border: 1px solid var(--bg-lightest);
  position: relative;
}

.q-ico.qr::before,
.q-ico.send::before,
.q-ico.recv::before {
  content: "";
  position: absolute;
  inset: 6px;
  border: 2px solid var(--tx-semi);
  border-radius: var(--radius-4);
}

.q-ico.send::before {
  border: none;
  border-bottom: 2px solid var(--tx-semi);
  border-right: 2px solid var(--tx-semi);
  transform: rotate(-45deg);
  top: 10px;
  left: 8px;
  width: 12px;
  height: 12px;
}

.q-ico.recv::before {
  border: none;
  border-top: 2px solid var(--tx-semi);
  border-left: 2px solid var(--tx-semi);
  transform: rotate(-45deg);
  top: 6px;
  left: 8px;
  width: 12px;
  height: 12px;
}

.list-sec {
  margin-top: 24px;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.linkish {
  background: none;
  border: none;
  color: var(--primary-light);
  font-size: 13px;
  cursor: pointer;
}

.tx-list {
  list-style: none;
  border-radius: var(--radius-12);
  border: 1px solid var(--bg-lightest);
  overflow: hidden;
  background: var(--bg-light);
}

.sub-list {
  list-style: none;
  border-radius: var(--radius-12);
  border: 1px solid var(--bg-lightest);
  overflow: hidden;
  background: var(--bg-light);
}

.sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  min-height: 56px;
  border-bottom: 1px solid var(--bg-lightest);
  cursor: pointer;
}

.sub:active {
  background: rgba(255, 255, 255, 0.03);
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

.list-empty {
  font-size: 13px;
  color: var(--tx-dimmed);
  padding: 8px 0 4px;
}
</style>
