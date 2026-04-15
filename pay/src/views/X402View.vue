<script setup lang="ts">
import AppFrame from "@/components/layout/AppFrame.vue";
import CheckoutAppShell from "@/components/mobile/CheckoutAppShell.vue";
import ProgressBox from "@/components/ProgressBox.vue";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants/ui";
import { notify } from "@/reactives/notify";
import { createApiClient, getClientApi } from "@/scripts/clientApi";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

type X402ResourceView = {
  id: string;
  kind: "file" | "link";
  assetAmount: { asset: string; amount: number; extra?: Record<string, unknown> };
  currency: string;
  network: string;
  payTo: string;
  rootHash: string;
  filename?: string;
  mimeType?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
};

const route = useRoute();
const api = getClientApi();

const loading = ref(false);
const paying = ref(false);
const resource = ref<X402ResourceView | null>(null);
const unlockedLink = ref<string | null>(null);

const resourceId = computed(() => String(route.params.resourceId ?? ""));

async function load() {
  const id = resourceId.value.trim();
  if (!id) return;
  unlockedLink.value = null;
  resource.value = null;
  loading.value = true;
  try {
    resource.value = (await api.viewResource(id)) as X402ResourceView;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    notify.push({
      title: "Failed to load resource",
      description: msg,
      category: "error",
    });
  } finally {
    loading.value = false;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function unlock() {
  const id = resourceId.value.trim();
  if (!id || paying.value) return;
  paying.value = true;
  try {
    if (resource.value?.kind === "file") {
      const client = await createApiClient(true);
      const res = await client.get(`/resource/pay/${id}`, { responseType: "blob" });

      const cd = (res.headers?.["content-disposition"] ?? res.headers?.["Content-Disposition"]) as
        | string
        | undefined;
      const match = cd?.match(/filename="([^"]+)"/);
      const filename = match?.[1] || resource.value.filename || `resource-${id}`;

      const mime = String(res.headers?.["content-type"] ?? res.headers?.["Content-Type"] ?? "");
      const blob = new Blob([res.data], { type: mime || resource.value.mimeType || "application/octet-stream" });
      downloadBlob(blob, filename);

      notify.push({
        title: "File unlocked",
        description: "Your download should start automatically.",
        category: "success",
      });
      return;
    }

    const data = (await api.payResource(id)) as any;
    if (data?.kind === "link" && typeof data.link === "string") {
      unlockedLink.value = data.link;
      notify.push({
        title: "Link unlocked",
        description: "You can open it now.",
        category: "success",
      });
      return;
    }

    notify.push({
      title: "Unexpected response",
      description: "Payment succeeded but the response was not recognized.",
      category: "error",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    notify.push({
      title: "Payment failed",
      description: msg,
      category: "error",
    });
  } finally {
    paying.value = false;
  }
}

watch(
  () => route.params.resourceId,
  () => {
    load();
  },
);

onMounted(() => {
  load();
});
</script>

<template>
  <div class="x402-view">
    <header class="flat-header sticky-top">
      <AppFrame :topInset="false">
        <h1 class="flat-header__title">x402</h1>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <CheckoutAppShell>
        <ProgressBox v-if="loading" />

        <div v-else-if="!resource" class="flat-empty">
          <img class="flat-empty__img" :src="DEFAULT_PLACEHOLDER_IMAGE" alt="" width="64" height="64" />
          <p class="flat-empty__title">Resource not found</p>
          <p class="flat-empty__sub">Check the URL and try again.</p>
        </div>

        <div v-else class="flat">
          <section class="flat-section">
            <p class="flat-kicker">Resource</p>
            <p class="flat-title">{{ resource.title || (resource.kind === "file" ? resource.filename : "Paid link") }}</p>
            <p class="flat-meta">
              <span class="pill">{{ resource.kind }}</span>
              <span class="dot">·</span>
              <span class="muted">{{ resource.network }}</span>
            </p>
          </section>

          <section class="flat-section">
            <p class="flat-kicker">Price</p>
            <div class="flat-price">
              <span class="flat-price__amount">{{ resource.assetAmount.amount }}</span>
              <span class="flat-price__asset">{{ resource.assetAmount.asset }}</span>
              <span class="flat-price__ccy">{{ resource.currency }}</span>
            </div>
            <p class="flat-hint">
              Paid to <span class="mono">{{ resource.payTo }}</span>
            </p>
          </section>

          <section v-if="resource.kind === 'link' && unlockedLink" class="flat-section">
            <p class="flat-kicker">Unlocked link</p>
            <a class="flat-link" :href="unlockedLink" target="_blank" rel="noopener noreferrer">
              {{ unlockedLink }}
            </a>
          </section>

          <footer class="flat-footer">
            <button type="button" class="flat-cta" @click="unlock">
              {{ paying ? "Processing…" : resource.kind === "file" ? "Pay & download" : "Pay & unlock" }}
            </button>
          </footer>
        </div>
      </CheckoutAppShell>
    </AppFrame>
  </div>
</template>

<style scoped>
.flat {
  width: 100%;
  padding-bottom: 8px;
}

.flat-header {
  width: 100%;
  padding: calc(4px + env(safe-area-inset-top, 0px)) 0 20px;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.flat-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--tx-normal);
}

.flat-section {
  padding: 20px 0;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.flat-kicker {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.flat-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--tx-normal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flat-meta {
  margin: 8px 0 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--tx-semi);
  font-size: 14px;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(255, 255, 255, 0.04);
  color: var(--tx-normal);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 12px;
}

.dot {
  opacity: 0.7;
}

.muted {
  opacity: 0.9;
}

.flat-price {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.flat-price__amount {
  font-size: clamp(36px, 10vw, 46px);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--tx-normal);
  line-height: 1.05;
}

.flat-price__asset {
  font-size: 16px;
  font-weight: 700;
  color: var(--tx-normal);
}

.flat-price__ccy {
  font-size: 14px;
  color: var(--tx-semi);
}

.flat-hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--tx-semi);
  line-height: 1.4;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}

.flat-link {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--primary-light);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.flat-footer {
  padding: 24px 0 0;
  border-bottom: none;
}

.flat-cta {
  width: 100%;
  min-height: var(--native-tap, 44px);
  height: 52px;
  border: none;
  border-radius: var(--radius-12);
  background: var(--primary);
  color: var(--tx-normal);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(245, 95, 20, 0.35);
  -webkit-tap-highlight-color: transparent;
}

.flat-cta:active {
  transform: scale(0.98);
  opacity: 0.94;
}

.flat-empty {
  padding: 36px 0;
  text-align: center;
  color: var(--tx-semi);
}

.flat-empty__img {
  border-radius: 14px;
  opacity: 0.75;
}

.flat-empty__title {
  margin: 18px 0 6px;
  font-size: 16px;
  font-weight: 700;
  color: var(--tx-normal);
}

.flat-empty__sub {
  margin: 0;
  font-size: 14px;
  color: var(--tx-semi);
}
</style>
