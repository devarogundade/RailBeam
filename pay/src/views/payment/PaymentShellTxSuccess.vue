<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppFrame from "@/components/layout/AppFrame.vue";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import SuccessIcon from "@/components/icons/SuccessIcon.vue";
import { useShellTransactionDetail } from "@/composables/useBeamShellQueries";
import { useWalletStore } from "@/stores/wallet";
import { mapTransactionToShellRow } from "@/scripts/shellActivity";

const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();

const id = computed(() => (route.params.id as string) ?? "");
const invalidId = computed(() => !!id.value && !id.value.toLowerCase().startsWith("0x"));

const { data: txRaw, isFetching } = useShellTransactionDetail(id);

const tx = computed(() => {
  const t = txRaw.value;
  if (!t) return null;
  return mapTransactionToShellRow(t, walletStore.address);
});

function goBack() {
  router.push({ name: "payment-activity" });
}

function viewTransaction() {
  router.push({ name: "payment-tx", params: { id: id.value } });
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
          <h1 class="bar-title">Success</h1>
          <span class="bar-spacer" />
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <div class="page-body">
        <p v-if="invalidId" class="warn">
          Invalid transaction id. Open this screen from a successful payment.
        </p>

        <template v-else>
          <div class="hero">
            <div class="hero-ico">
              <SuccessIcon />
            </div>
            <p class="hero-title">Payment sent</p>
            <p v-if="tx" class="hero-sub">
              {{ tx.title }} · <span class="amt" :class="tx.tone">{{ tx.amount }}</span>
            </p>
            <p v-else-if="isFetching" class="hero-sub muted">Loading transaction…</p>
            <p v-else class="hero-sub muted">Transaction saved — details may take a moment to index.</p>
          </div>

          <button type="button" class="primary" :disabled="!id" @click="viewTransaction">
            View transaction
          </button>
          <button type="button" class="secondary" @click="goBack">Back to activity</button>
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
  padding: 16px 0 max(28px, env(safe-area-inset-bottom, 0px));
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
  border-radius: var(--radius-16);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(0, 0, 0, 0.18);
  padding: 18px 16px;
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
  margin-bottom: 16px;
}

.hero-ico {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: rgba(159, 214, 41, 0.08);
  border: 1px solid rgba(159, 214, 41, 0.14);
  margin-bottom: 10px;
}

.hero-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--tx-semi);
  line-height: 1.45;
}

.muted {
  color: var(--tx-dimmed);
}

.amt.green {
  color: var(--accent-green);
  font-weight: 700;
}

.amt.red {
  color: var(--accent-red);
  font-weight: 700;
}

.primary {
  width: 100%;
  min-height: var(--native-tap, 44px);
  height: 50px;
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

.primary:active {
  transform: scale(0.98);
  opacity: 0.94;
}

.secondary {
  width: 100%;
  margin-top: 10px;
  min-height: var(--native-tap, 44px);
  height: 50px;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.12));
  background: rgba(0, 0, 0, 0.22);
  color: var(--tx-normal);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.secondary:active {
  transform: scale(0.98);
  opacity: 0.94;
}

.warn {
  font-size: 14px;
  color: var(--tx-semi);
  line-height: 1.5;
}
</style>

