<script setup lang="ts">
import { Html5Qrcode } from "html5-qrcode";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import { notify } from "@/reactives/notify";
import { paymentUrlSignalsFromHref } from "@/router/paymentSession";
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppFrame from "@/components/layout/AppFrame.vue";

const router = useRouter();

const READER_ID = "beam-payment-scan-qr";

const html5 = ref<Html5Qrcode | null>(null);
const camError = ref<string | null>(null);
const camStarting = ref(true);
const decodeBusy = ref(false);
let lastInvalidQrToast = 0;

function wipeReaderMount() {
  const el = document.getElementById(READER_ID);
  if (el) el.innerHTML = "";
}

async function teardownScanner() {
  const s = html5.value;
  html5.value = null;
  if (!s) {
    wipeReaderMount();
    return;
  }
  try {
    if (s.isScanning) await s.stop();
  } catch {
    /* */
  }
  try {
    s.clear();
  } catch {
    /* */
  }
  wipeReaderMount();
}

async function startCamera() {
  camError.value = null;
  camStarting.value = true;
  decodeBusy.value = false;
  await teardownScanner();
  await nextTick();

  const scanner = new Html5Qrcode(READER_ID, false);
  html5.value = scanner;

  try {
    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 15,
        /** Large central region — video stays full bleed; only a thin dimmed margin. */
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const vw = viewfinderWidth;
          const vh = viewfinderHeight;
          const edge = Math.floor(Math.min(vw * 0.92, vh * 0.78, Math.min(vw, vh) - 24));
          const size = Math.max(200, Math.min(edge, Math.min(vw, vh) - 16));
          return { width: size, height: size };
        },
      },
      (decodedText) => {
        void onDecoded(decodedText);
      },
      () => {}
    );
  } catch (e: unknown) {
    camError.value =
      e instanceof Error
        ? e.message
        : "Could not open the camera. Allow access in Settings, or use HTTPS.";
    await teardownScanner();
  } finally {
    camStarting.value = false;
  }
}

async function onDecoded(raw: string) {
  const text = raw.trim();
  if (!text || decodeBusy.value) return;

  if (!paymentUrlSignalsFromHref(text)) {
    const now = Date.now();
    if (now - lastInvalidQrToast > 3500) {
      lastInvalidQrToast = now;
      notify.push({
        title: "Not a payment QR",
        description: "Use a Beam checkout link (initiator + session, intent, or tx).",
        category: "error",
      });
    }
    return;
  }

  decodeBusy.value = true;
  try {
    const url = new URL(text, window.location.origin);
    await teardownScanner();
    if (url.origin === window.location.origin) {
      await router.push({ path: url.pathname, query: Object.fromEntries(url.searchParams) });
    } else {
      window.location.assign(url.href);
    }
  } catch (e) {
    console.error(e);
    decodeBusy.value = false;
    notify.push({
      title: "Could not open payment",
      description: "Try scanning again.",
      category: "error",
    });
    await startCamera();
  }
}

function retry() {
  void startCamera();
}

async function goBack() {
  await teardownScanner();
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    await router.push({ name: "payment-home" });
  }
}

onMounted(() => {
  void startCamera();
});

onBeforeUnmount(() => {
  void teardownScanner();
});
</script>

<template>
  <div class="scan-root" role="application" aria-label="Scan QR code to pay">
    <header class="scan-top sticky-top">
      <AppFrame :topInset="false" fullWidth>
        <div class="scan-top__inner">
          <button type="button" class="scan-back" aria-label="Close scanner" @click="goBack">
            <span class="scan-back-inner">
              <ChevronLeftIcon />
            </span>
          </button>
          <h1 class="scan-title">Scan to pay</h1>
          <span class="scan-top-spacer" aria-hidden="true" />
        </div>
      </AppFrame>
    </header>

    <div class="scan-stage">
      <div v-if="camStarting && !camError" class="scan-overlay scan-overlay--loading">
        <div class="scan-spinner" aria-hidden="true" />
        <p>Starting camera…</p>
      </div>
      <div v-else-if="camError" class="scan-overlay scan-overlay--error">
        <p class="scan-error-msg">{{ camError }}</p>
        <button type="button" class="scan-retry" @click="retry">Try again</button>
      </div>
      <div :id="READER_ID" class="qr-mount" />
    </div>

    <footer v-if="!camError" class="scan-footer">
      <p class="scan-hint">Align the QR in the frame. Checkout opens automatically.</p>
    </footer>
  </div>
</template>

<style scoped>
.scan-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  width: 100%;
  max-width: 100%;
  min-height: 100dvh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #000;
  color: #fff;
  overflow: hidden;
}

.scan-top {
  flex-shrink: 0;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 0 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.35) 70%, transparent 100%);
  z-index: 3;
  pointer-events: none;
}

.scan-top__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.scan-top > * {
  pointer-events: auto;
}

.scan-back {
  border: none;
  padding: 0;
  margin: 0;
  background: none;
  cursor: pointer;
  border-radius: var(--radius-full);
  -webkit-tap-highlight-color: transparent;
}

.scan-back-inner {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.scan-back-inner :deep(svg) {
  width: 22px;
  height: 22px;
  display: block;
}

.scan-back-inner :deep(svg path) {
  stroke: #fff;
  stroke-width: 1.5;
}

.scan-back:active .scan-back-inner {
  background: rgba(255, 255, 255, 0.22);
}

.scan-title {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
}

.scan-top-spacer {
  width: 44px;
  flex-shrink: 0;
}

.scan-stage {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  background: #000;
}

.qr-mount {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Full-bleed preview — native camera feel */
.qr-mount :deep(video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: 0 !important;
}

.qr-mount :deep(#qr-shaded-region) {
  border-radius: 0 !important;
}

.scan-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
  background: rgba(0, 0, 0, 0.55);
}

.scan-overlay--loading {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
}

.scan-overlay--loading p {
  margin: 0;
}

.scan-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.95);
  animation: scan-spin 0.75s linear infinite;
}

@keyframes scan-spin {
  to {
    transform: rotate(360deg);
  }
}

.scan-overlay--error {
  padding: 28px 24px;
  background: rgba(0, 0, 0, 0.75);
}

.scan-error-msg {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
  max-width: 300px;
}

.scan-retry {
  min-height: 48px;
  padding: 0 28px;
  border-radius: var(--radius-full);
  border: none;
  background: #fff;
  color: #0a0a0b;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.scan-retry:active {
  opacity: 0.9;
}

.scan-footer {
  flex-shrink: 0;
  padding: 14px max(20px, env(safe-area-inset-right, 0px)) calc(18px + env(safe-area-inset-bottom, 0px))
    max(20px, env(safe-area-inset-left, 0px));
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.5) 65%, transparent 100%);
  z-index: 3;
  pointer-events: none;
}

.scan-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.72);
  text-align: center;
  text-wrap: balance;
}
</style>
