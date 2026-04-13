<script setup lang="ts">
import WalletIcon from "./icons/WalletIcon.vue";
import MetamaskIcon from "./icons/MetamaskIcon.vue";
import BeamLogo from "./icons/BeamLogo.vue";
import AppFrame from "@/components/layout/AppFrame.vue";
import { useDataStore } from "@/stores/data";
import { config } from "@/scripts/config";
import { useWalletStore } from "@/stores/wallet";
import { useWeb3Modal } from "@web3modal/wagmi/vue";
import { watchAccount } from "@wagmi/core";
import { onMounted } from "vue";
import Converter from "@/scripts/converter";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants/ui";

const dataStore = useDataStore();
const walletStore = useWalletStore();
const modal = useWeb3Modal();

onMounted(() => {
  watchAccount(config, {
    onChange(account) {
      walletStore.setAddress(account.address ?? null);
    },
  });
});
</script>

<template>
  <header class="app-header">
    <AppFrame :topInset="false">
      <div class="app-header__top">
        <div class="app-header__brand" aria-hidden="true">
          <BeamLogo />
        </div>

        <a
          v-if="dataStore.initiator"
          class="app-header__merchant"
          :href="dataStore.initiator.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            class="app-header__favicon"
            :src="dataStore.initiator.favicon ? dataStore.initiator.favicon : DEFAULT_PLACEHOLDER_IMAGE"
            alt=""
            width="28"
            height="28"
          />
          <span class="app-header__merchant-name">{{ dataStore.initiator.title }}</span>
        </a>

        <button type="button" class="wallet-pill" @click="modal.open()">
          <WalletIcon v-if="!walletStore.address" class="wallet-pill__ico" />
          <MetamaskIcon v-else class="wallet-pill__ico" />
          <span class="wallet-pill__text">{{
            walletStore.address ? Converter.fineAddress(walletStore.address, 4) : "Connect"
          }}</span>
        </button>
      </div>
    </AppFrame>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 90;
  flex-shrink: 0;
  min-height: var(--native-tap, 44px);
  padding-top: 6px;
  padding-bottom: 8px;
  margin-bottom: 0;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: var(--frost-bg, rgba(22, 22, 24, 0.78));
  backdrop-filter: blur(24px) saturate(1.65);
  -webkit-backdrop-filter: blur(24px) saturate(1.65);
}

.app-header__top {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.app-header__brand {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.app-header__brand :deep(svg) {
  display: block;
  max-width: min(100px, 26vw);
  width: 100%;
  height: auto;
}

.app-header__merchant {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: var(--native-tap, 44px);
  padding: 6px 12px;
  border-radius: var(--radius-12);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(36, 36, 38, 0.88);
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
  color: inherit;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.app-header__merchant:active {
  opacity: 0.92;
}

.app-header__favicon {
  border-radius: var(--radius-8);
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--bg-lightest);
}

.app-header__merchant-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--tx-semi);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.wallet-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--native-tap, 44px);
  padding: 0 14px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(36, 36, 38, 0.95);
  color: var(--tx-normal);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  max-width: min(148px, 40vw);
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
  -webkit-tap-highlight-color: transparent;
}

.wallet-pill:active {
  transform: scale(0.98);
  opacity: 0.92;
}

.wallet-pill__ico {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.wallet-pill__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
</style>
