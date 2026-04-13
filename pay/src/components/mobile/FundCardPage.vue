<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import { notify } from "@/reactives/notify";
import AppFrame from "@/components/layout/AppFrame.vue";
import ChevronDownIcon from "@/components/icons/ChevronDownIcon.vue";
import { getTokens } from "beam-ts/src/utils/constants";
import type { Hex } from "viem";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants/ui";
import Converter from "@/scripts/converter";

const router = useRouter();
const assetAddress = ref<Hex | "">((getTokens[0]?.address as Hex | undefined) ?? "");
const amount = ref("");
const assetMenuOpen = ref(false);

const selectedToken = computed(
  () => getTokens.find((t) => t.address === assetAddress.value) ?? getTokens[0]
);

const amountNum = computed(() => Number(amount.value));

const usdEquivalent = computed(() => {
  const n = amountNum.value;
  const price = selectedToken.value?.price ?? 0;
  if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(price) || price <= 0) return 0;
  return n * price;
});

const usdEquivalentDisplay = computed(() => {
  if (!usdEquivalent.value) return "—";
  return `≈ $${Converter.toMoney(usdEquivalent.value)}`;
});

function back() {
  router.push({ name: "payment-home" });
}

function addFunds() {
  if (!assetAddress.value) {
    notify.push({
      title: "Asset",
      description: "Choose which asset to fund from.",
      category: "error",
    });
    return;
  }

  if (!amount.value || Number(amount.value) <= 0) {
    notify.push({
      title: "Amount",
      description: "Enter an amount greater than zero.",
      category: "error",
    });
    return;
  }
  const sym = selectedToken.value?.symbol ?? "—";
  notify.push({
    title: "Demo top-up",
    description: `Added ${amount.value} ${sym} (${usdEquivalentDisplay.value}) from wallet (demo).`,
    category: "success",
  });
  router.push({ name: "payment-home" });
}

function onTokenImgError(e: Event) {
  const el = e.target as HTMLImageElement;
  el.src = DEFAULT_PLACEHOLDER_IMAGE;
}

function pickAsset(address: Hex) {
  assetAddress.value = address;
  assetMenuOpen.value = false;
}

function toggleAssetMenu() {
  assetMenuOpen.value = !assetMenuOpen.value;
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") assetMenuOpen.value = false;
}

onMounted(() => {
  document.addEventListener("keydown", onDocKeydown);
});
onUnmounted(() => {
  document.removeEventListener("keydown", onDocKeydown);
});
</script>

<template>
  <div class="page">
    <header class="bar">
      <AppFrame :topInset="false">
        <div class="bar__inner">
          <button type="button" class="icon-btn" aria-label="Back" @click="back">
            <ChevronLeftIcon />
          </button>
          <h1 class="bar-title">Fund card</h1>
          <span class="bar-spacer" />
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <div class="page-body">
        <p class="intro">Pay from wallet, pick an asset, then enter how much to add.</p>

        <div class="field asset-field">
          <span id="fund-asset-label" class="field-label">Asset</span>
          <div class="asset-dd">
            <button
              id="fund-asset-trigger"
              type="button"
              class="asset-trigger"
              :aria-expanded="assetMenuOpen"
              aria-haspopup="listbox"
              aria-labelledby="fund-asset-label fund-asset-trigger"
              @click="toggleAssetMenu"
            >
              <img
                v-if="selectedToken"
                class="asset-trigger-ico"
                :src="selectedToken.image"
                alt=""
                width="28"
                height="28"
                @error="onTokenImgError"
              />
              <span class="asset-trigger-sym">{{ selectedToken?.symbol ?? "—" }}</span>
              <ChevronDownIcon class="asset-trigger-chev" :class="{ 'asset-trigger-chev--open': assetMenuOpen }" />
            </button>

            <div v-if="assetMenuOpen" class="asset-backdrop" aria-hidden="true" @click="assetMenuOpen = false" />

            <ul v-if="assetMenuOpen" class="asset-menu" role="listbox" aria-labelledby="fund-asset-label">
              <li
                v-for="t in getTokens"
                :key="t.address"
                role="option"
                :aria-selected="t.address === assetAddress"
                class="asset-menu-item"
                :class="{ 'asset-menu-item--active': t.address === assetAddress }"
                @click="pickAsset(t.address)"
              >
                <img
                  class="asset-menu-ico"
                  :src="t.image"
                  alt=""
                  width="28"
                  height="28"
                  @error="onTokenImgError"
                />
                <span class="asset-menu-sym">{{ t.symbol }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="field">
          <label for="fund-amt">Amount</label>
          <input id="fund-amt" v-model="amount" type="number" min="0" step="any" placeholder="0.00" />
          <div class="hint-row">
            <p v-if="selectedToken" class="field-hint">In {{ selectedToken.symbol }}</p>
            <p class="field-hint field-hint--right">{{ usdEquivalentDisplay }}</p>
          </div>
        </div>

        <button type="button" class="primary" @click="addFunds">Add funds</button>
      </div>
    </AppFrame>
  </div>
</template>

<style scoped>
.page {
  width: 100%;
  min-height: 0;
  margin: 0;
  max-width: none;
  padding: 0;
  background: transparent;
  color: var(--tx-normal);
}

.page-body {
  padding: 12px 0 max(28px, env(safe-area-inset-bottom, 0px));
}

.bar {
  margin-bottom: 20px;
  position: sticky;
  top: 0;
  z-index: 30;
  margin-top: 0;
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
  width: var(--native-tap, 44px);
}

.intro {
  font-size: 14px;
  line-height: 1.5;
  color: var(--tx-semi);
  margin-bottom: 24px;
}

.field {
  margin-bottom: 18px;
}

.field label,
.field-label {
  display: block;
  font-size: 13px;
  color: var(--tx-dimmed);
  margin-bottom: 8px;
}

.field > input {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-8);
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  padding: 0 14px;
  font-size: 15px;
  color: var(--tx-normal);
  outline: none;
}

.field input::placeholder {
  color: var(--tx-dimmed);
}

.asset-field {
  position: relative;
}

.asset-dd {
  position: relative;
}

.asset-trigger {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 10px;
  border-radius: var(--radius-8);
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  color: var(--tx-normal);
  font-size: 15px;
  cursor: pointer;
  text-align: left;
}

.asset-trigger-ico {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-8);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  flex-shrink: 0;
}

.asset-trigger-sym {
  flex: 1;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.asset-trigger-chev {
  flex-shrink: 0;
  opacity: 0.75;
  transition: transform 0.18s ease;
}

.asset-trigger-chev--open {
  transform: rotate(180deg);
}

.asset-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: transparent;
}

.asset-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 40;
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: var(--radius-10);
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  max-height: min(280px, 45dvh);
  overflow-y: auto;
}

.asset-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px;
  border-radius: var(--radius-8);
  cursor: pointer;
  color: var(--tx-normal);
}

.asset-menu-item:active {
  opacity: 0.9;
}

.asset-menu-item--active {
  background: var(--bg-light);
}

.asset-menu-ico {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-8);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  flex-shrink: 0;
}

.asset-menu-sym {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.hint-row {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.field-hint {
  margin: 0;
  font-size: 12px;
  color: var(--tx-dimmed);
}

.field-hint--right {
  text-align: right;
}

.primary {
  margin-top: 12px;
  width: 100%;
  min-height: var(--native-tap, 44px);
  height: 50px;
  border: none;
  border-radius: var(--radius-12);
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
</style>
