<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import QrcodeVue from "qrcode.vue";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants/ui";
import { useWalletStore } from "@/stores/wallet";
import { useProfileStore } from "@/stores/profile";
import { notify } from "@/reactives/notify";
import AppFrame from "@/components/layout/AppFrame.vue";

const router = useRouter();
const walletStore = useWalletStore();
const profileStore = useProfileStore();

const username = computed(() => {
  const u = (profileStore.user?.username ?? "").trim();
  if (!u) return "";
  return u.startsWith("@") ? u : `@${u}`;
});

const viewMode = ref<"username" | "address">("address");

const displayAddress = computed(() => {
  if (!walletStore.address) return "";
  return walletStore.address;
});

const hasUsername = computed(() => !!username.value && username.value.length > 1);

const activeLabel = computed(() =>
  viewMode.value === "username" ? "Your username" : "Your address"
);

const activeValue = computed(() => {
  if (viewMode.value === "username") return username.value;
  return displayAddress.value;
});

const qrValue = computed(() => {
  const v = activeValue.value;
  if (!v) return "";
  return viewMode.value === "address" ? (`ethereum:${v}` as string) : v;
});

function back() {
  router.push({ name: "payment-home" });
}

function pickMode(mode: "username" | "address") {
  viewMode.value = mode;
}

async function copyActive() {
  const v = activeValue.value;
  if (!v) {
    notify.push({
      title: "Receive",
      description: hasUsername.value
        ? "Connect a wallet to load your receive details."
        : "Connect a wallet first.",
      category: "error",
    });
    return;
  }
  try {
    await navigator.clipboard.writeText(v);
    notify.push({
      title: "Copied",
      description:
        viewMode.value === "username"
          ? "Username copied to clipboard."
          : "Address copied to clipboard.",
      category: "success",
    });
  } catch {
    notify.push({
      title: "Copy failed",
      description: "Your browser blocked clipboard access.",
      category: "error",
    });
  }
}

onMounted(() => {
  if (walletStore.address) void profileStore.refresh(walletStore.address);
});

watch(
  () => walletStore.address,
  (addr) => {
    if (!addr) return;
    void profileStore.refresh(addr);
  },
  { immediate: true }
);

watch(
  hasUsername,
  (has) => {
    if (has) viewMode.value = "username";
    else viewMode.value = "address";
  },
  { immediate: true }
);
</script>

<template>
  <div class="page">
    <header class="bar">
      <AppFrame :topInset="false">
        <div class="bar__inner">
          <button type="button" class="icon-btn" aria-label="Back" @click="back">
            <ChevronLeftIcon />
          </button>
          <h1 class="bar-title">Receive</h1>
          <span class="bar-spacer" />
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <div class="page-body">
        <p class="intro">
          Share your Beam username or wallet address to receive funds on 0G Chain.
        </p>

        <div v-if="walletStore.address && hasUsername" class="seg">
          <button
            type="button"
            class="seg-btn"
            :class="{ on: viewMode === 'username' }"
            @click="pickMode('username')"
          >
            Username
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ on: viewMode === 'address' }"
            @click="pickMode('address')"
          >
            Address
          </button>
        </div>

        <div class="qr-card">
          <div v-if="qrValue" class="qr">
            <QrcodeVue
              :value="qrValue"
              :size="240"
              level="H"
              render-as="svg"
            />
          </div>
          <div v-else class="qr-fallback">
            <img :src="DEFAULT_PLACEHOLDER_IMAGE" alt="" width="80" height="80" class="ph" />
            <p>Connect wallet to generate QR</p>
          </div>
        </div>

        <div class="addr-block">
          <label>{{ activeLabel }}</label>
          <p v-if="walletStore.address" class="addr">{{ activeValue }}</p>
          <p v-else class="addr muted">Connect your wallet to see your receive details.</p>

          <div v-if="walletStore.address && hasUsername" class="sub">
            <p v-if="viewMode === 'username'" class="subline">
              Address: <span class="mono">{{ displayAddress }}</span>
            </p>
            <p v-else class="subline">
              Username: <span class="mono">{{ username }}</span>
            </p>
          </div>

          <button type="button" class="copy" :disabled="!activeValue" @click="copyActive">
            Copy {{ viewMode === "username" ? "username" : "address" }}
          </button>
        </div>
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
  margin-bottom: 16px;
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
  margin-bottom: 20px;
}

.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.seg-btn {
  min-height: var(--native-tap, 44px);
  border-radius: var(--radius-12);
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  color: var(--tx-semi);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.seg-btn.on {
  background: rgba(245, 95, 20, 0.18);
  border-color: rgba(245, 95, 20, 0.5);
  color: var(--tx-normal);
}

.qr-card {
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: var(--tx-normal);
  padding: 20px;
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
}

.qr {
  display: block;
  border-radius: var(--radius-8);
}

.qr :deep(svg) {
  display: block;
  border-radius: var(--radius-8);
}

.qr-fallback {
  text-align: center;
  padding: 24px 16px;
  color: var(--tx-dimmed);
  font-size: 14px;
}

.qr-fallback .ph {
  border-radius: var(--radius-10);
  margin-bottom: 12px;
  opacity: 0.9;
}

.addr-block {
  border-radius: var(--radius-12);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: var(--bg-light);
  padding: 16px;
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
}

.addr-block label {
  font-size: 12px;
  color: var(--tx-dimmed);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.addr {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.45;
  word-break: break-all;
  color: var(--tx-normal);
}

.addr.muted {
  color: var(--tx-dimmed);
}

.sub {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--bg-lightest);
}

.subline {
  font-size: 12px;
  line-height: 1.4;
  color: var(--tx-dimmed);
}

.mono {
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

.copy {
  margin-top: 14px;
  width: 100%;
  min-height: var(--native-tap, 44px);
  height: 50px;
  border-radius: var(--radius-12);
  border: none;
  background: var(--primary);
  color: var(--tx-normal);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(245, 95, 20, 0.35);
}

.copy:not(:disabled):active {
  transform: scale(0.98);
  opacity: 0.94;
}

.copy:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
