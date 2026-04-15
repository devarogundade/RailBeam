<script setup lang="ts">
// Moved from `x402View.vue` to keep that file focused on paying a resource by id.
import { useWalletStore } from "@/stores/wallet";
import { computed, ref, watch } from "vue";
import { notify } from "@/reactives/notify";
import { Client } from "@/scripts/client";
import type { X402ResourceView } from "@/types/app";
import { isAxiosError } from "axios";

type SourceKind = "link" | "file";

const walletStore = useWalletStore();
const sourceKind = ref<SourceKind>("link");
const resourceUrl = ref("");
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const title = ref("");
const amount = ref("" as string | number);

const submitting = ref(false);
const submitError = ref<string | null>(null);
const lastCreated = ref<X402ResourceView | null>(null);

const x402Network = import.meta.env.VITE_X402_NETWORK?.trim() || "eip155:16661";
const x402UsdcAsset = import.meta.env.VITE_X402_USDC_ASSET?.trim();

const clientOrigin = computed(() =>
  (import.meta.env.VITE_CLIENT_URL ?? "").replace(/\/+$/, ""),
);

const payUrl = computed(() => {
  if (!lastCreated.value || !clientOrigin.value) return "";
  return `${clientOrigin.value}/resource/pay/${lastCreated.value.id}`;
});

const isValidHttpUrl = (value: string): boolean => {
  const t = value.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const canContinue = computed(() => {
  if (!walletStore.merchant || submitting.value) return false;
  const n = Number(amount.value);
  if (!Number.isFinite(n) || n <= 0) return false;
  if (sourceKind.value === "link") return isValidHttpUrl(resourceUrl.value);
  return selectedFile.value !== null;
});

const parseApiError = (e: unknown): string => {
  if (isAxiosError(e)) {
    const d = e.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;
    if (d) {
      if (Array.isArray(d.message)) return d.message.join(", ");
      if (typeof d.message === "string") return d.message;
      if (typeof d.error === "string") return d.error;
    }
    if (e.message) return e.message;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
};

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  selectedFile.value = f ?? null;
};

const triggerFilePick = () => {
  fileInputRef.value?.click();
};

const clearFile = () => {
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
};

const buildMeta = () => {
  const m = walletStore.merchant!;
  return {
    amount: Number(amount.value),
    currency: "USDC" as const,
    network: x402Network,
    payTo: m.wallet,
    ...(x402UsdcAsset ? { asset: x402UsdcAsset } : {}),
    title: title.value.trim() || undefined,
  };
};

const onContinue = async () => {
  if (!canContinue.value || !walletStore.merchant) return;
  submitting.value = true;
  submitError.value = null;
  lastCreated.value = null;
  try {
    const meta = buildMeta();
    const created =
      sourceKind.value === "link"
        ? await Client.createLink({
            link: resourceUrl.value.trim(),
            ...meta,
          })
        : await Client.uploadFile(selectedFile.value!, meta);
    lastCreated.value = created;
    notify.push({
      title: "Paid resource created",
      description:
        created.kind === "link"
          ? "Share the payment link to sell access to your URL."
          : "Share the payment link to sell access to your file.",
      category: "success",
    });
  } catch (e) {
    submitError.value = parseApiError(e);
    notify.push({
      title: "Could not create resource",
      description: submitError.value,
      category: "error",
    });
  } finally {
    submitting.value = false;
  }
};

const copyPayUrl = async () => {
  const url = payUrl.value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    notify.push({
      title: "Copied",
      description: "Payment link copied to clipboard.",
      category: "success",
    });
  } catch {
    notify.push({
      title: "Copy failed",
      description: "Clipboard permission was denied.",
      category: "error",
    });
  }
};

const resetForm = () => {
  lastCreated.value = null;
  submitError.value = null;
  resourceUrl.value = "";
  clearFile();
  title.value = "";
  amount.value = "";
};

watch(sourceKind, (k) => {
  lastCreated.value = null;
  submitError.value = null;
  if (k === "link") clearFile();
  else resourceUrl.value = "";
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <p class="options_label">x402 source</p>
      <div class="tabs" role="tablist" aria-label="Resource source">
        <button
          type="button"
          role="tab"
          :aria-selected="sourceKind === 'link'"
          :class="sourceKind === 'link' ? 'tab tab_active' : 'tab'"
          @click="sourceKind = 'link'"
        >
          Link
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="sourceKind === 'file'"
          :class="sourceKind === 'file' ? 'tab tab_active' : 'tab'"
          @click="sourceKind = 'file'"
        >
          File
        </button>
      </div>
    </div>

    <div v-if="!walletStore.merchant" class="form">
      <div class="banner">
        <p>Select a merchant wallet to create x402 paid resources.</p>
      </div>
    </div>

    <div v-else class="form">
      <div v-if="lastCreated" class="result_card">
        <p class="result_title">Payment link</p>
        <p class="result_hint">
          Buyers open this URL; they pay via x402 and receive the resource.
        </p>
        <div class="result_url_row">
          <code class="result_url">{{ payUrl || "—" }}</code>
        </div>
        <div class="result_actions">
          <button
            type="button"
            class="btn_secondary"
            :disabled="!payUrl"
            @click="copyPayUrl"
          >
            Copy link
          </button>
          <button type="button" class="btn_secondary" @click="resetForm">
            Create another
          </button>
        </div>
      </div>

      <template v-else>
        <div class="inputs">
          <div class="field_label">
            <p>
              Title <span class="optional">optional</span>
            </p>
          </div>
          <input
            v-model="title"
            type="text"
            class="text_input"
            maxlength="120"
            placeholder="Shown in payment requirements"
          />
        </div>

        <div v-if="sourceKind === 'link'" class="inputs">
          <div class="field_label">
            <p>Resource URL</p>
          </div>
          <input
            v-model="resourceUrl"
            type="url"
            class="text_input"
            inputmode="url"
            autocomplete="url"
            placeholder="https://api.example.com/resource"
          />
        </div>

        <div v-else class="inputs">
          <div class="field_label">
            <p>File</p>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            class="sr_only"
            @change="onFileChange"
          />
          <div class="file_row">
            <button type="button" class="btn_file" @click="triggerFilePick">
              Choose file
            </button>
            <span class="file_name" :class="{ file_name_empty: !selectedFile }">
              {{ selectedFile?.name ?? "No file selected" }}
            </span>
            <button v-if="selectedFile" type="button" class="btn_clear" @click="clearFile">
              Clear
            </button>
          </div>
        </div>

        <div class="inputs">
          <div class="field_label">
            <p>Price</p>
          </div>
          <div class="input_grid">
            <p>USDC</p>
            <input v-model="amount" type="number" min="0" step="any" placeholder="0" />
          </div>
        </div>

        <p v-if="submitError" class="error_text">{{ submitError }}</p>

        <div class="actions">
          <button type="button" class="btn_primary" :disabled="!canContinue" @click="onContinue">
            {{ submitting ? "Creating…" : "Continue" }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 0 var(--page-gutter) 50px;
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

.tabs {
  display: flex;
  align-items: center;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--bg-lightest);
}

.tab {
  padding: 0 26px;
  color: var(--tx-dimmed);
  background: none;
  border: none;
  font-size: 16px;
  height: 40px;
  cursor: pointer;
}

.tab:first-of-type {
  border-right: 1px solid var(--bg-lightest);
}

.tab_active {
  color: var(--tx-normal);
  background: var(--bg-lighter);
}

.form {
  width: 520px;
  max-width: min(520px, calc(100vw - (var(--page-gutter) * 2)));
  box-sizing: border-box;
}

.field_label {
  margin-bottom: 10px;
}

.field_label p {
  font-size: 14px;
  color: var(--tx-dimmed);
  margin: 0;
}

.optional {
  color: var(--tx-semi);
  font-size: 12px;
}

.inputs + .inputs {
  margin-top: 28px;
}

.text_input {
  width: 100%;
  height: 44px;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--bg);
  border: 1px solid var(--bg-lightest);
  color: var(--tx-normal);
  padding: 0 16px;
  outline: none;
  font-size: 14px;
}

.text_input::placeholder {
  color: var(--tx-dimmed);
}

.file_row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.btn_file {
  height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  color: var(--tx-normal);
  font-size: 14px;
  cursor: pointer;
}

.file_name {
  font-size: 14px;
  color: var(--tx-normal);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file_name_empty {
  color: var(--tx-dimmed);
}

.btn_clear {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: none;
  background: none;
  color: var(--tx-semi);
  font-size: 13px;
  cursor: pointer;
}

.sr_only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.input_grid {
  overflow: hidden;
  display: grid;
  grid-template-columns: 72px 1fr;
  border: 1px solid var(--bg-lightest);
  border-radius: 8px;
  background: var(--bg);
}

.input_grid > p {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  color: var(--tx-normal);
  font-size: 14px;
  margin: 0;
}

.input_grid input {
  height: 44px;
  width: 100%;
  border: none;
  background: none;
  color: var(--tx-normal);
  padding: 0 16px;
  outline: none;
  font-size: 14px;
}

.input_grid input::placeholder {
  color: var(--tx-dimmed);
}

.error_text {
  margin-top: 16px;
  font-size: 13px;
  color: #e85d5d;
}

.actions {
  margin-top: 28px;
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
  height: 40px;
  padding: 0 18px;
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

.banner {
  padding: 20px;
  border-radius: 8px;
  border: 1px dashed var(--bg-lightest);
}

.banner p {
  margin: 0;
  font-size: 14px;
  color: var(--tx-semi);
  text-align: center;
}

.result_card {
  padding: 20px;
  border-radius: 10px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
}

.result_title {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--tx-normal);
  font-weight: 500;
}

.result_hint {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--tx-semi);
  line-height: 1.45;
}

.result_url_row {
  padding: 12px;
  border-radius: 8px;
  background: var(--bg);
  border: 1px solid var(--bg-lightest);
  overflow: hidden;
}

.result_url {
  display: block;
  font-size: 12px;
  word-break: break-all;
  color: var(--tx-normal);
  margin: 0;
}

.result_actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

@media (max-width: 960px) {
  .page {
    padding: 0 var(--page-gutter) 40px;
  }

  .toolbar {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .tabs {
    width: 100%;
  }

  .tab {
    flex: 1;
    padding: 0 16px;
  }

  .form {
    width: 100%;
    max-width: 520px;
  }
}

@media (max-width: 600px) {
  .form {
    max-width: 100%;
  }

  .result_actions {
    flex-direction: column;
  }

  .btn_secondary {
    width: 100%;
  }
}
</style>
