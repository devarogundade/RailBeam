<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { X402ResourceView } from "@/types/app";
import { Client } from "@/scripts/client";
import { notify } from "@/reactives/notify";

type PayState =
  | { kind: "idle" }
  | { kind: "paying" }
  | { kind: "paid"; message: string }
  | { kind: "requires-payment"; paymentRequired: string; details: any }
  | { kind: "error"; message: string };

const route = useRoute();
const router = useRouter();

const resourceId = computed(() => String(route.params.resourceId ?? "").trim());

const loading = ref(false);
const resource = ref<X402ResourceView | null>(null);
const loadError = ref<string | null>(null);

const payState = ref<PayState>({ kind: "idle" });

function abToText(ab: ArrayBuffer): string {
  return new TextDecoder().decode(new Uint8Array(ab));
}

function downloadBytes(bytes: ArrayBuffer, filename: string, mimeType?: string) {
  const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function loadView() {
  if (!resourceId.value) {
    loadError.value = "Missing resourceId";
    return;
  }
  loading.value = true;
  loadError.value = null;
  try {
    resource.value = await Client.viewResource(resourceId.value);
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function onPay() {
  if (!resourceId.value) return;
  payState.value = { kind: "paying" };
  try {
    const res = await Client.payResource(resourceId.value);

    if (res.status === 402) {
      const paymentRequired = String(res.headers?.["payment-required"] ?? "");
      const detailsText = abToText(res.data);
      let details: any = null;
      try {
        details = JSON.parse(detailsText);
      } catch {
        details = { raw: detailsText };
      }
      payState.value = {
        kind: "requires-payment",
        paymentRequired,
        details,
      };
      notify.push({
        title: "Payment required",
        description: "Complete the x402 payment in your wallet to access the resource.",
        category: "error",
      });
      return;
    }

    const contentType = String(res.headers?.["content-type"] ?? "");
    const paymentResponse = String(res.headers?.["payment-response"] ?? "");

    if (contentType.includes("application/json")) {
      const txt = abToText(res.data);
      const json = JSON.parse(txt) as { kind?: string; link?: string };
      if (json.kind === "link" && typeof json.link === "string") {
        payState.value = { kind: "paid", message: "Paid. Opening link…" };
        window.open(json.link, "_blank", "noopener,noreferrer");
      } else {
        payState.value = { kind: "paid", message: "Paid. Resource returned." };
      }
    } else {
      const filename =
        resource.value?.filename ||
        resource.value?.title ||
        `${resourceId.value}`;
      downloadBytes(res.data, filename, contentType || resource.value?.mimeType);
      payState.value = { kind: "paid", message: "Paid. Download started." };
    }

    if (paymentResponse) {
      // show a small success toast with proof header available if needed
      notify.push({
        title: "Paid",
        description: "Access granted.",
        category: "success",
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    payState.value = { kind: "error", message: msg };
    notify.push({ title: "Payment failed", description: msg, category: "error" });
  }
}

async function copyPaymentRequiredHeader() {
  if (payState.value.kind !== "requires-payment") return;
  const text = payState.value.paymentRequired || "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    notify.push({
      title: "Copied",
      description: "PAYMENT-REQUIRED header copied.",
      category: "success",
    });
  } catch {
    notify.push({
      title: "Copy failed",
      description: "Clipboard permission was denied.",
      category: "error",
    });
  }
}

watch(resourceId, async () => {
  resource.value = null;
  payState.value = { kind: "idle" };
  await loadView();
});

onMounted(async () => {
  await loadView();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <button type="button" class="btn_text" @click="router.back()">Back</button>
      <p class="options_label">x402 payment</p>
      <span class="sp" />
    </div>

    <div class="form">
      <div v-if="loading" class="banner"><p>Loading resource…</p></div>
      <div v-else-if="loadError" class="banner banner_error">
        <p>{{ loadError }}</p>
      </div>

      <div v-else-if="resource" class="card">
        <p class="title">{{ resource.title || "Paid resource" }}</p>
        <p class="sub">
          {{ resource.kind.toUpperCase() }} · {{ resource.currency }} · {{ resource.network }}
        </p>

        <div class="row">
          <p class="label">Price</p>
          <p class="value">
            {{ resource.assetAmount.amount }} {{ resource.currency }}
          </p>
        </div>
        <div class="row">
          <p class="label">Pay to</p>
          <p class="value mono">{{ resource.payTo }}</p>
        </div>
        <div class="row">
          <p class="label">Resource</p>
          <p class="value mono">{{ resource.id }}</p>
        </div>

        <div class="actions">
          <button
            type="button"
            class="btn_primary"
            :disabled="payState.kind === 'paying'"
            @click="onPay"
          >
            {{ payState.kind === "paying" ? "Paying…" : "Pay to access" }}
          </button>
        </div>

        <div v-if="payState.kind === 'requires-payment'" class="requires">
          <p class="req_title">PAYMENT-REQUIRED</p>
          <p class="req_hint">
            Your wallet/client needs to attach payment to this request. Copy the header below for debugging.
          </p>
          <pre class="req_box"><code>{{ payState.paymentRequired || "—" }}</code></pre>
          <div class="req_actions">
            <button type="button" class="btn_secondary" :disabled="!payState.paymentRequired" @click="copyPaymentRequiredHeader">
              Copy header
            </button>
          </div>
        </div>

        <div v-else-if="payState.kind === 'error'" class="banner banner_error">
          <p>{{ payState.message }}</p>
        </div>
      </div>

      <div v-else class="banner"><p>Resource not found.</p></div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 0 50px 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 16px;
  margin: 20px 0 28px;
  padding: 10px 0;
  width: 100%;
}

.options_label {
  font-size: 14px;
  color: var(--tx-dimmed);
  margin: 0;
}

.sp {
  flex: 1;
}

.form {
  width: 640px;
  max-width: min(640px, calc(100vw - 100px));
  box-sizing: border-box;
}

.card {
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
}

.title {
  margin: 0 0 6px;
  font-size: 16px;
  color: var(--tx-normal);
  font-weight: 600;
}

.sub {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--tx-semi);
}

.row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: start;
  padding: 10px 0;
  border-top: 1px solid var(--bg-lightest);
}

.row:first-of-type {
  border-top: none;
  padding-top: 0;
}

.label {
  margin: 0;
  font-size: 13px;
  color: var(--tx-dimmed);
}

.value {
  margin: 0;
  font-size: 13px;
  color: var(--tx-normal);
  word-break: break-word;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.actions {
  margin-top: 18px;
}

.btn_primary {
  height: 40px;
  width: 100%;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: var(--tx-normal);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn_primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn_secondary {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  color: var(--tx-normal);
  font-size: 14px;
  cursor: pointer;
}

.btn_secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn_text {
  border: none;
  background: none;
  color: var(--tx-semi);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  height: 32px;
}

.banner {
  padding: 20px;
  border-radius: 8px;
  border: 1px dashed var(--bg-lightest);
}

.banner_error {
  border-style: solid;
  border-color: rgba(232, 93, 93, 0.35);
}

.banner p {
  margin: 0;
  font-size: 14px;
  color: var(--tx-semi);
  text-align: center;
}

.requires {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--bg-lightest);
}

.req_title {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--tx-dimmed);
}

.req_hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--tx-semi);
  line-height: 1.45;
}

.req_box {
  margin: 0;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg);
  border: 1px solid var(--bg-lightest);
  overflow-x: auto;
  font-size: 12px;
  color: var(--tx-normal);
}

.req_actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
