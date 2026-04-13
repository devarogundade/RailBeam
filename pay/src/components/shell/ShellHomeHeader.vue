<script setup lang="ts">
import { computed, inject } from "vue";
import WalletIcon from "@/components/icons/WalletIcon.vue";
import MetamaskIcon from "@/components/icons/MetamaskIcon.vue";
import AppFrame from "@/components/layout/AppFrame.vue";

type HeaderApi = {
  openProfileSheet: () => void;
  openWalletModal: () => void;
  greetingName: { value: string };
  headerAvatar: { value: string };
  walletAddress: { value: string | null };
};

const api = inject<HeaderApi>("paymentShellHeader");

const hasWallet = computed(() => !!api?.walletAddress.value);
</script>

<template>
  <header v-if="api" class="top sticky-top">
    <AppFrame :topInset="false">
      <div class="top__inner">
        <button type="button" class="brand" aria-label="Open profile" @click="api.openProfileSheet">
          <img class="avatar" :src="api.headerAvatar.value" width="44" height="44" alt="" />
          <div class="hello">
            <p class="kicker">Welcome back</p>
            <p class="name">{{ api.greetingName.value }}</p>
          </div>
        </button>
        <button type="button" class="wallet-pill" @click="api.openWalletModal">
          <WalletIcon v-if="!hasWallet" class="ico" />
          <MetamaskIcon v-else class="ico" />
          <span>{{ hasWallet ? "Wallet" : "Connect" }}</span>
        </button>
      </div>
    </AppFrame>
  </header>
</template>

<style scoped>
.top {
  padding: 12px 0;
  gap: 12px;
  min-width: 0;
}

.top__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  width: 100%;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: var(--native-tap, 44px);
  flex: 1;
  margin: 0;
  padding: 4px 8px 4px 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-12);
  -webkit-tap-highlight-color: transparent;
}

.brand:focus-visible {
  outline: 2px solid var(--primary-light);
  outline-offset: 2px;
}

.brand:active {
  opacity: 0.92;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  border: 1px solid var(--bg-lightest);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg);
}

.hello {
  min-width: 0;
}

.kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
  font-weight: 700;
}

.name {
  margin: 3px 0 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--tx-normal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.wallet-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.18);
  color: var(--tx-normal);
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wallet-pill:active {
  transform: scale(0.98);
  opacity: 0.92;
}

.wallet-pill .ico {
  width: 18px;
  height: 18px;
}
</style>

