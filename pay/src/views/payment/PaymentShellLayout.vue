<script setup lang="ts">
import type { Ref } from "vue";
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useWeb3Modal } from "@web3modal/wagmi/vue";
import { watchAccount } from "@wagmi/core";
import { config } from "@/scripts/config";
import { useWalletStore } from "@/stores/wallet";
import Converter from "@/scripts/converter";
import EyeIcon from "@/components/icons/EyeIcon.vue";
import EyeOffIcon from "@/components/icons/EyeOffIcon.vue";
import BottomSheet from "@/components/mobile/BottomSheet.vue";
import AssetsSheetContent from "@/components/mobile/AssetsSheetContent.vue";
import { USER_AVATAR_OTHER, USER_AVATAR_SELF } from "@/constants/ui";
import { notify } from "@/reactives/notify";
import AppFrame from "@/components/layout/AppFrame.vue";
import ChevronDownIcon from "@/components/icons/ChevronDownIcon.vue";
import { getTokens } from "beam-ts/src/utils/constants";
import type { Hex } from "viem";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants/ui";

const router = useRouter();
const route = useRoute();
const modal = useWeb3Modal();
const walletStore = useWalletStore();

const cardSheetOpen = ref(false);
const profileSheetOpen = ref(false);
const assetsSheetOpen = ref(false);
const cardSheetStep = ref<"details" | "remove">("details");
const cardFrozen = ref(false);
const removeAmount = ref("");
const removeAssetAddress = ref<Hex | "">((getTokens[0]?.address as Hex | undefined) ?? "");
const removeAssetMenuOpen = ref(false);
const cvvVisible = ref(false);

const sheetTitle = computed(() =>
  cardSheetStep.value === "details" ? "Card details" : "Remove funds"
);

watch(cardSheetOpen, (open) => {
  if (!open) {
    cardSheetStep.value = "details";
    cvvVisible.value = false;
  }
});

const cardSuffix = computed(() => {
  const a = walletStore.address;
  if (!a || a.length < 6) return "4242";
  return a.slice(-4);
});

const selectedRemoveToken = computed(
  () => getTokens.find((t) => t.address === removeAssetAddress.value) ?? getTokens[0]
);

const removeUsdNum = computed(() => Number(removeAmount.value));
const removeAssetEquivalent = computed(() => {
  const usd = removeUsdNum.value;
  const price = selectedRemoveToken.value?.price ?? 0;
  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(price) || price <= 0) return 0;
  return usd / price;
});

const removeAssetEquivalentDisplay = computed(() => {
  if (!removeAssetEquivalent.value) return "—";
  const sym = selectedRemoveToken.value?.symbol ?? "—";
  return `≈ ${Converter.toMoney(removeAssetEquivalent.value)} ${sym}`;
});

function onRemoveTokenImgError(e: Event) {
  const el = e.target as HTMLImageElement;
  el.src = DEFAULT_PLACEHOLDER_IMAGE;
}

function pickRemoveAsset(address: Hex) {
  removeAssetAddress.value = address;
  removeAssetMenuOpen.value = false;
}

function toggleRemoveAssetMenu() {
  removeAssetMenuOpen.value = !removeAssetMenuOpen.value;
}

/** Demo / read-only strings for the virtual card sheet (not real PAN/CVV). */
const sheetCardName = "ALEX BEAM";
const sheetCardPan = computed(() => `4532 12•• •••• ${cardSuffix.value}`);
/** Demo CVV only — toggled with the eye control in the sheet. */
const sheetCardCvvReveal = "782";
const sheetCardExp = "12 / 28";
const sheetBillingLine1 = "400 Market Street";
const sheetBillingLine2 = "San Francisco, CA";
const sheetBillingPostal = "94105";
const sheetBillingCountry = "United States";

const greetingName = computed(() =>
  walletStore.address
    ? Converter.fineAddress(walletStore.address, 4)
    : "there"
);

const headerAvatar = computed(() =>
  walletStore.address ? USER_AVATAR_SELF : USER_AVATAR_OTHER
);

/** Line shown as “username” in the profile sheet (demo). */
const profileUsername = computed(() =>
  walletStore.address ? greetingName.value : "Guest"
);

function openProfileSheet() {
  cardSheetOpen.value = false;
  profileSheetOpen.value = true;
}

provide("paymentShellHeader", {
  openProfileSheet,
  openWalletModal: () => modal.open(),
  greetingName,
  headerAvatar,
  walletAddress: computed(() => walletStore.address),
});

function onProfileUpdate() {
  notify.push({
    title: "Profile",
    description: walletStore.address
      ? "Demo: your profile update was saved."
      : "Connect a wallet to link a Beam profile.",
    category: "success",
  });
  profileSheetOpen.value = false;
}

function openCardSheet() {
  profileSheetOpen.value = false;
  assetsSheetOpen.value = false;
  cardSheetStep.value = "details";
  cardSheetOpen.value = true;
}

function openAssetsSheet() {
  cardSheetOpen.value = false;
  profileSheetOpen.value = false;
  assetsSheetOpen.value = true;
}

function openFundFromSheet() {
  cardSheetOpen.value = false;
  router.push({ name: "payment-fund" });
}

function toggleFreeze() {
  cardFrozen.value = !cardFrozen.value;
  notify.push({
    title: cardFrozen.value ? "Card frozen" : "Card active",
    description: cardFrozen.value
      ? "New charges are paused until you unfreeze."
      : "Your card can be used again.",
    category: "success",
  });
}

function confirmRemove() {
  if (!removeAssetAddress.value) {
    notify.push({
      title: "Asset",
      description: "Choose which asset to withdraw to.",
      category: "error",
    });
    return;
  }
  if (!removeAmount.value || Number(removeAmount.value) <= 0) {
    notify.push({
      title: "Amount",
      description: "Enter a USD amount to remove.",
      category: "error",
    });
    return;
  }
  const sym = selectedRemoveToken.value?.symbol ?? "—";
  notify.push({
    title: "Withdrawal queued",
    description: `Removing $${removeAmount.value} (≈ ${Converter.toMoney(removeAssetEquivalent.value)} ${sym}) to your wallet (demo).`,
    category: "success",
  });
  removeAmount.value = "";
  removeAssetMenuOpen.value = false;
  cardSheetOpen.value = false;
}

provide("paymentShellCard", {
  openCardSheet,
  cardFrozen: cardFrozen as Ref<boolean>,
});

provide("paymentShellAssets", {
  openAssetsSheet,
});

onMounted(() => {
  watchAccount(config, {
    onChange(account) {
      walletStore.setAddress(account.address ?? null);
    },
  });
  document.addEventListener("keydown", onDocKeydown);
});

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") removeAssetMenuOpen.value = false;
}

onUnmounted(() => {
  document.removeEventListener("keydown", onDocKeydown);
});

/** Layout routes exclude scan; keep class for safety. */
const isImmersiveScan = computed(() => route.name === "payment-scan");
</script>

<template>
  <div class="shell" :class="{ 'shell--immersive-scan': isImmersiveScan }">
    <RouterView name="shellHeader" />

    <main class="scroll" :class="{ 'scroll--immersive-scan': isImmersiveScan }">
      <AppFrame :topInset="false">
        <RouterView />
      </AppFrame>
    </main>

    <nav class="dock" aria-label="Primary">
      <RouterLink class="dock-btn" active-class="active" :to="{ name: 'payment-home' }">
        <span class="dock-ico home" />
        <span>Home</span>
      </RouterLink>
      <RouterLink class="dock-btn" active-class="active" :to="{ name: 'payment-scan' }">
        <span class="dock-ico scan" />
        <span>Scan</span>
      </RouterLink>
      <RouterLink class="dock-btn" active-class="active" :to="{ name: 'payment-activity' }">
        <span class="dock-ico pulse" />
        <span>Activity</span>
      </RouterLink>
      <RouterLink class="dock-btn" active-class="active" :to="{ name: 'payment-agents' }">
        <span class="dock-ico agent" />
        <span>Agents</span>
      </RouterLink>
    </nav>

    <BottomSheet v-model="cardSheetOpen" :title="sheetTitle">
      <template v-if="cardSheetStep === 'details'">
        <div class="sheet-card-preview" :class="{ frozen: cardFrozen }">
          <p class="sheet-net">VISA · ···· {{ cardSuffix }}</p>
          <p class="sheet-bal">$1,732.10</p>
          <p class="sheet-exp">Exp {{ sheetCardExp }}</p>
        </div>

        <section class="sheet-kv-block" aria-label="Card numbers and billing">
          <div class="sheet-kv">
            <span class="sheet-k">Name on card</span>
            <span class="sheet-v sheet-v--caps">{{ sheetCardName }}</span>
          </div>
          <div class="sheet-kv">
            <span class="sheet-k">Number</span>
            <span class="sheet-v sheet-v--mono">{{ sheetCardPan }}</span>
          </div>
          <div class="sheet-kv sheet-kv--pair">
            <div class="sheet-kv-col">
              <span class="sheet-k">Expires</span>
              <span class="sheet-v sheet-v--mono">{{ sheetCardExp }}</span>
            </div>
            <div class="sheet-kv-col sheet-kv-col--narrow sheet-kv-col--cvv">
              <span class="sheet-k">CVV</span>
              <div class="sheet-cvv-row">
                <span class="sheet-v sheet-v--mono sheet-cvv-value">{{
                  cvvVisible ? sheetCardCvvReveal : "•••"
                }}</span>
                <button
                  type="button"
                  class="sheet-cvv-toggle"
                  :aria-label="cvvVisible ? 'Hide CVV' : 'Show CVV'"
                  :aria-pressed="cvvVisible"
                  @click="cvvVisible = !cvvVisible"
                >
                  <EyeOffIcon v-if="cvvVisible" class="sheet-cvv-ico" />
                  <EyeIcon v-else class="sheet-cvv-ico" />
                </button>
              </div>
            </div>
          </div>
          <div class="sheet-kv">
            <span class="sheet-k">Billing address</span>
            <span class="sheet-v">{{ sheetBillingLine1 }}</span>
          </div>
          <div class="sheet-kv">
            <span class="sheet-k">City & region</span>
            <span class="sheet-v">{{ sheetBillingLine2 }}</span>
          </div>
          <div class="sheet-kv sheet-kv--pair">
            <div class="sheet-kv-col">
              <span class="sheet-k">Postal code</span>
              <span class="sheet-v sheet-v--mono">{{ sheetBillingPostal }}</span>
            </div>
            <div class="sheet-kv-col">
              <span class="sheet-k">Country</span>
              <span class="sheet-v">{{ sheetBillingCountry }}</span>
            </div>
          </div>
        </section>

        <button type="button" class="sheet-primary" @click="openFundFromSheet">
          Add funds
        </button>
        <button
          type="button"
          class="sheet-secondary"
          :disabled="cardFrozen"
          @click="cardSheetStep = 'remove'"
        >
          Remove funds
        </button>
        <div class="sheet-row">
          <span>Freeze card</span>
          <button
            type="button"
            class="toggle"
            :class="{ on: cardFrozen }"
            role="switch"
            :aria-checked="cardFrozen"
            @click="toggleFreeze"
          >
            <span class="knob" />
          </button>
        </div>
      </template>
      <template v-else>
        <p class="sheet-muted">Withdraw from your virtual card balance to your wallet.</p>
        <div class="sheet-field">
          <span id="rm-asset-label" class="sheet-label">Asset</span>
          <div class="asset-dd">
            <button
              id="rm-asset-trigger"
              type="button"
              class="asset-trigger"
              :aria-expanded="removeAssetMenuOpen"
              aria-haspopup="listbox"
              aria-labelledby="rm-asset-label rm-asset-trigger"
              @click="toggleRemoveAssetMenu"
            >
              <img
                v-if="selectedRemoveToken"
                class="asset-trigger-ico"
                :src="selectedRemoveToken.image"
                alt=""
                width="28"
                height="28"
                @error="onRemoveTokenImgError"
              />
              <span class="asset-trigger-sym">{{ selectedRemoveToken?.symbol ?? "—" }}</span>
              <ChevronDownIcon
                class="asset-trigger-chev"
                :class="{ 'asset-trigger-chev--open': removeAssetMenuOpen }"
              />
            </button>

            <div
              v-if="removeAssetMenuOpen"
              class="asset-backdrop"
              aria-hidden="true"
              @click="removeAssetMenuOpen = false"
            />

            <ul
              v-if="removeAssetMenuOpen"
              class="asset-menu"
              role="listbox"
              aria-labelledby="rm-asset-label"
            >
              <li
                v-for="t in getTokens"
                :key="t.address"
                role="option"
                :aria-selected="t.address === removeAssetAddress"
                class="asset-menu-item"
                :class="{ 'asset-menu-item--active': t.address === removeAssetAddress }"
                @click="pickRemoveAsset(t.address)"
              >
                <img
                  class="asset-menu-ico"
                  :src="t.image"
                  alt=""
                  width="28"
                  height="28"
                  @error="onRemoveTokenImgError"
                />
                <span class="asset-menu-sym">{{ t.symbol }}</span>
              </li>
            </ul>
          </div>
        </div>
        <label class="sheet-label" for="rm-amt">Amount (USD)</label>
        <input
          id="rm-amt"
          v-model="removeAmount"
          class="sheet-input"
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
        />
        <div class="sheet-hint-row">
          <span class="sheet-hint">Equivalent asset amount</span>
          <span class="sheet-hint sheet-hint--right">{{ removeAssetEquivalentDisplay }}</span>
        </div>
        <button type="button" class="sheet-primary" @click="confirmRemove">
          Confirm removal
        </button>
        <button type="button" class="sheet-ghost" @click="cardSheetStep = 'details'">
          Back
        </button>
      </template>
    </BottomSheet>

    <BottomSheet v-model="profileSheetOpen" title="Profile">
      <div class="profile-sheet">
        <img class="profile-sheet-avatar" :src="headerAvatar" width="96" height="96" alt="" />
        <p class="profile-sheet-label">Username</p>
        <p class="profile-sheet-username">{{ profileUsername }}</p>
        <button type="button" class="sheet-primary profile-sheet-cta" @click="onProfileUpdate">
          Update profile
        </button>
      </div>
    </BottomSheet>

    <BottomSheet v-model="assetsSheetOpen" title="Assets">
      <AssetsSheetContent />
    </BottomSheet>
  </div>
</template>

<style scoped>
/* Outer chrome (gradient, 430px column, side safe areas) lives on the view-level `AppFrame`. */
.shell {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  min-width: 0;
  padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  color: var(--tx-normal);
}

.shell.shell--immersive-scan {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  min-height: 100dvh;
  max-height: 100%;
  padding: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  overflow: hidden;
}

.profile-sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 8px 0 4px;
}

.profile-sheet-avatar {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-14);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.profile-sheet-label {
  margin: 20px 0 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.profile-sheet-username {
  margin: 8px 0 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--tx-normal);
  letter-spacing: -0.02em;
  word-break: break-word;
  max-width: 100%;
}

.profile-sheet-cta {
  margin-top: 28px;
}

.scroll {
  padding: 0;
  min-width: 0;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.scroll.scroll--immersive-scan {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dock {
  position: fixed;
  left: 50%;
  bottom: calc(10px + env(safe-area-inset-bottom, 0));
  transform: translateX(-50%);
  width: min(392px, calc(100% - 28px));
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 10px 12px 12px;
  border-radius: 22px;
  background: var(--frost-bg-strong, rgba(22, 22, 24, 0.92));
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  backdrop-filter: blur(28px) saturate(1.7);
  -webkit-backdrop-filter: blur(28px) saturate(1.7);
  box-shadow:
    var(--native-shadow-lg, 0 16px 48px rgba(0, 0, 0, 0.5)),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  z-index: 50;
}

.dock-btn {
  border: none;
  background: none;
  color: var(--tx-dimmed);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.01em;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: var(--native-tap, 44px);
  padding: 6px 4px;
  cursor: pointer;
  border-radius: 14px;
  text-decoration: none;
}

.dock-btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}

.dock-btn.active {
  color: var(--tx-normal);
  background: rgba(255, 255, 255, 0.08);
}

.dock-ico {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-8);
  border: 1px solid transparent;
  position: relative;
}

.dock-btn.active .dock-ico {
  border-color: var(--bg-lightest);
  background: var(--bg-light);
}

.dock :deep(a) {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.dock-ico.home::before {
  content: "";
  position: absolute;
  inset: 5px 4px 4px 4px;
  border: 2px solid currentColor;
  border-radius: 3px 3px 0 0;
  border-bottom: none;
}

.dock-ico.scan::before {
  content: "";
  position: absolute;
  inset: 4px;
  border: 2px solid currentColor;
  border-radius: 4px;
}

.dock-ico.pulse::before {
  content: "";
  position: absolute;
  left: 4px;
  right: 4px;
  top: 10px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 -6px 0 currentColor, 0 6px 0 currentColor;
}

.dock-ico.stack::before {
  content: "";
  position: absolute;
  inset: 6px 5px;
  border: 2px solid currentColor;
  border-radius: var(--radius-4);
  box-shadow: 0 -4px 0 -1px var(--bg-lighter);
}

.dock-ico.agent::before {
  content: "";
  position: absolute;
  inset: 6px;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.dock-ico.agent::after {
  content: "";
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 5px;
  height: 7px;
  border: 2px solid currentColor;
  border-top: none;
  border-radius: 0 0 10px 10px;
}

.sheet-card-preview {
  border-radius: var(--radius-12);
  padding: 18px 16px;
  margin-bottom: 16px;
  background: linear-gradient(145deg, #1f1f24 0%, #0c0c0f 100%);
  border: 1px solid var(--bg-lightest);
}

.sheet-card-preview.frozen {
  opacity: 0.85;
  filter: grayscale(0.3);
}

.sheet-net {
  font-size: 12px;
  color: var(--tx-semi);
  letter-spacing: 0.04em;
}

.sheet-bal {
  margin-top: 10px;
  font-size: 26px;
  font-weight: 600;
}

.sheet-exp {
  margin-top: 6px;
  font-size: 12px;
  color: var(--tx-dimmed);
}

.sheet-kv-block {
  border-radius: var(--radius-10);
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  padding: 4px 0;
  margin-bottom: 16px;
}

.sheet-kv {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--bg-lightest);
}

.sheet-kv:last-child {
  border-bottom: none;
}

.sheet-kv--pair {
  flex-direction: row;
  gap: 0;
  padding: 0;
}

.sheet-kv-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
}

.sheet-kv-col--narrow {
  flex: 0 0 38%;
  max-width: 120px;
}

.sheet-kv-col--cvv {
  flex: 0 0 46%;
  max-width: 152px;
  min-width: 124px;
}

.sheet-cvv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.sheet-cvv-value {
  min-width: 0;
}

.sheet-cvv-toggle {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-8);
  background: var(--bg-lighter);
  color: var(--tx-semi);
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

.sheet-cvv-toggle:hover {
  color: var(--tx-normal);
}

.sheet-cvv-ico {
  display: block;
}

.sheet-kv--pair .sheet-kv-col:first-child {
  border-right: 1px solid var(--bg-lightest);
}

.sheet-k {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.sheet-v {
  font-size: 15px;
  color: var(--tx-normal);
  line-height: 1.35;
  word-break: break-word;
}

.sheet-v--caps {
  font-weight: 600;
  letter-spacing: 0.08em;
}

.sheet-v--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  font-size: 14px;
  letter-spacing: 0.04em;
}

.sheet-primary {
  width: 100%;
  height: 48px;
  margin-bottom: 10px;
  border: none;
  border-radius: var(--radius-8);
  background: var(--primary);
  color: var(--tx-normal);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.sheet-secondary {
  width: 100%;
  height: 48px;
  margin-bottom: 16px;
  border-radius: var(--radius-8);
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  color: var(--tx-normal);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.sheet-secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sheet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid var(--bg-lightest);
  font-size: 15px;
  color: var(--tx-normal);
}

.toggle {
  width: 48px;
  height: 28px;
  border-radius: var(--radius-full);
  border: 1px solid var(--bg-lightest);
  background: var(--bg-lighter);
  position: relative;
  cursor: pointer;
  padding: 0;
}

.toggle.on {
  background: var(--primary);
  border-color: var(--primary-light);
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-round);
  background: var(--tx-normal);
  transition: transform 0.18s ease;
}

.toggle.on .knob {
  transform: translateX(20px);
}

.sheet-muted {
  font-size: 14px;
  color: var(--tx-dimmed);
  line-height: 1.5;
  margin-bottom: 14px;
}

.sheet-label {
  display: block;
  font-size: 12px;
  color: var(--tx-dimmed);
  margin-bottom: 8px;
}

.sheet-field {
  margin-bottom: 14px;
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
  background: var(--bg);
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

.sheet-hint-row {
  margin: -6px 0 14px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.sheet-hint {
  font-size: 12px;
  color: var(--tx-dimmed);
}

.sheet-hint--right {
  text-align: right;
}

.sheet-input {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-8);
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  color: var(--tx-normal);
  padding: 0 14px;
  font-size: 15px;
  margin-bottom: 14px;
  outline: none;
}

.sheet-ghost {
  width: 100%;
  margin-top: 8px;
  height: 44px;
  border: none;
  border-radius: var(--radius-8);
  background: transparent;
  color: var(--primary-light);
  font-size: 15px;
  cursor: pointer;
}
</style>
