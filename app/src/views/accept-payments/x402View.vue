<script setup lang="ts">
import { useWalletStore } from '@/stores/wallet';
import { computed, onMounted, ref, watch } from 'vue';
import { getTokens } from 'beam-ts';
import type { Token } from "beam-ts";
import { notify } from '@/reactives/notify';

type SourceKind = 'link' | 'file';

const walletStore = useWalletStore();
const sourceKind = ref<SourceKind>('link');
const resourceUrl = ref('');
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const token = ref<Token | null>(null);
const tokens = ref<Token[]>([]);
const amount = ref('' as string | number);

const syncTokens = () => {
    tokens.value = getTokens.filter((t) => walletStore.merchant?.tokens.includes(t.address));
    if (tokens.value.length === 0) {
        token.value = null;
        return;
    }
    if (!token.value || !tokens.value.some((t) => t.address === token.value?.address)) {
        token.value = tokens.value[0];
    }
};

const isValidHttpUrl = (value: string): boolean => {
    const t = value.trim();
    if (!t) return false;
    try {
        const u = new URL(t);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
};

const canContinue = computed(() => {
    if (!walletStore.merchant || !token.value) return false;
    const n = Number(amount.value);
    if (!Number.isFinite(n) || n <= 0) return false;
    if (sourceKind.value === 'link') {
        return isValidHttpUrl(resourceUrl.value);
    }
    return selectedFile.value !== null;
});

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
    if (fileInputRef.value) fileInputRef.value.value = '';
};

const onContinue = () => {
    if (!canContinue.value) return;
    const source =
        sourceKind.value === 'link'
            ? resourceUrl.value.trim()
            : selectedFile.value?.name ?? 'file';
    notify.push({
        title: 'x402 configuration saved',
        description: `${sourceKind.value === 'link' ? 'URL' : 'File'}: ${source} · ${token.value?.symbol} ${amount.value}`,
        category: 'success',
    });
};

watch(() => walletStore.merchant, syncTokens, { deep: true });

watch(sourceKind, (k) => {
    if (k === 'link') {
        clearFile();
    } else {
        resourceUrl.value = '';
    }
});

onMounted(() => {
    syncTokens();
});
</script>

<template>
    <div class="page">
        <div class="toolbar">
            <p class="options_label">x402 source</p>
            <div class="tabs" role="tablist" aria-label="Resource source">
                <button type="button" role="tab" :aria-selected="sourceKind === 'link'"
                    :class="sourceKind === 'link' ? 'tab tab_active' : 'tab'" @click="sourceKind = 'link'">
                    Link
                </button>
                <button type="button" role="tab" :aria-selected="sourceKind === 'file'"
                    :class="sourceKind === 'file' ? 'tab tab_active' : 'tab'" @click="sourceKind = 'file'">
                    File
                </button>
            </div>
        </div>

        <div class="form">
            <div v-if="sourceKind === 'link'" class="inputs">
                <div class="field_label">
                    <p>Resource URL</p>
                </div>
                <input v-model="resourceUrl" type="url" class="text_input" inputmode="url" autocomplete="url"
                    placeholder="https://api.example.com/resource">
            </div>

            <div v-else class="inputs">
                <div class="field_label">
                    <p>OpenAPI / x402 descriptor</p>
                </div>
                <input ref="fileInputRef" type="file" class="sr_only" accept=".json,.yaml,.yml,.txt,application/json"
                    @change="onFileChange">
                <div class="file_row">
                    <button type="button" class="btn_file" @click="triggerFilePick">
                        Choose file
                    </button>
                    <span class="file_name" :class="{ file_name_empty: !selectedFile }">
                        {{ selectedFile?.name ?? 'No file selected' }}
                    </span>
                    <button v-if="selectedFile" type="button" class="btn_clear" @click="clearFile">
                        Clear
                    </button>
                </div>
            </div>

            <div class="asset">
                <div class="field_label">
                    <p>Asset</p>
                </div>
                <div v-if="tokens.length === 0" class="empty_tokens">
                    <p>No tokens available for this merchant.</p>
                </div>
                <div v-else class="tokens">
                    <div v-for="t in tokens" :key="t.address"
                        :class="t.address === token?.address ? 'token token_selected' : 'token'" @click="token = t">
                        <div class="token_info">
                            <img :src="t.image" alt="">
                            <p>{{ t.symbol }}</p>
                        </div>
                        <div class="radio">
                            <div>
                                <span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="inputs">
                <div class="field_label">
                    <p>Amount</p>
                </div>
                <div class="input_grid">
                    <p>{{ token?.symbol ?? '—' }}</p>
                    <input v-model="amount" type="number" min="0" step="any" placeholder="0" :disabled="!token">
                </div>
            </div>

            <div class="actions">
                <button type="button" class="btn_primary" :disabled="!canContinue" @click="onContinue">
                    Continue
                </button>
            </div>
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
    max-width: min(520px, calc(100vw - 100px));
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

.inputs+.asset {
    margin-top: 28px;
}

.asset+.inputs {
    margin-top: 28px;
}

.inputs+.inputs {
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

.empty_tokens {
    padding: 16px;
    border-radius: 8px;
    border: 1px dashed var(--bg-lightest);
}

.empty_tokens p {
    margin: 0;
    font-size: 14px;
    color: var(--tx-semi);
}

.tokens {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
}

.token {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    border-radius: 8px 10px 10px 8px;
    border: 1px solid var(--bg-lighter);
    cursor: pointer;
    user-select: none;
    background: var(--bg);
}

.token_info {
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.token_info img {
    width: 20px;
    height: 20px;
    border-radius: 10px;
}

.token_info p {
    color: var(--tx-normal);
    font-size: 14px;
    margin: 0;
}

.token .radio {
    width: 44px;
    height: 100%;
    border: 1px solid var(--bg-lightest);
    border-radius: 0 8px 8px 0;
    background: var(--bg-light);
    display: flex;
    align-items: center;
    justify-content: center;
}

.token .radio div {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
}

.token .radio div span {
    width: 10px;
    height: 10px;
    border-radius: 10px;
}

.token_selected .radio div {
    border: 1px solid var(--primary-light);
}

.token_selected .radio div span {
    background: var(--primary);
}

.input_grid {
    overflow: hidden;
    display: grid;
    grid-template-columns: 72px 1fr;
    border: 1px solid var(--bg-lightest);
    border-radius: 8px;
    background: var(--bg);
}

.input_grid>p {
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

.input_grid input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
</style>
