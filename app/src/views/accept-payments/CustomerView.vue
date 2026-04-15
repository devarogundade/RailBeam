<script setup lang="ts">
import { useWalletStore } from '@/stores/wallet';
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { getTokens } from '@railbeam/beam-ts';
import type { Token } from "@railbeam/beam-ts";
import type { Plan } from "@railbeam/beam-ts";
import type { Hex } from 'viem';
import { formatUnits } from 'viem';
import { notify } from '@/reactives/notify';
import QrcodeVue from 'qrcode.vue';
import Converter from '@/scripts/converter';
import { getToken } from '@railbeam/beam-ts';
import CopyIcon from '@/components/icons/CopyIcon.vue';
import { useBeamPlansQuery } from '@/query/beam';
import StorageImage from '@/components/StorageImage.vue';
import { Client } from '@/scripts/client';
import type { CreateTransactionPayload } from '@/types/app';

type PaymentKind = 'one-time' | 'recurrent';

const PAYMENT_APP_URL =
    import.meta.env.VITE_BEAM_TRANSACTION_URL!;

const walletStore = useWalletStore();
const paymentKind = ref<PaymentKind>('one-time');
const token = ref<Token | null>(null);
const tokens = ref<Token[]>([]);

const form = ref({
    amount: '' as string | number,
    description: '',
    splitPayment: false,
});

const plans = ref<Plan[]>([]);
const plansLoading = ref(false);
const selectedPlan = ref<Plan | null>(null);
const plansDropdownOpen = ref(false);

const getPlanImage = (plan: Plan | null | undefined) => {
    if (!plan) return undefined;
    return plan.images?.[0];
};

const paymentLink = ref('');
const generating = ref(false);

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

function buildPaymentUrl(transactionId: string): string {
    const session = crypto.randomUUID();
    const url = new URL(PAYMENT_APP_URL);
    url.searchParams.set('txn', transactionId);
    url.searchParams.set('initiator', window.location.origin);
    url.searchParams.set('session', session);
    return url.toString();
}

const canGenerateOneTime = computed(() => {
    if (!walletStore.merchant || !token.value) return false;
    const n = Number(form.value.amount);
    return Number.isFinite(n) && n > 0;
});

const canGenerateRecurrent = computed(() => {
    return !!walletStore.merchant && !!selectedPlan.value;
});

const address = computed(() => walletStore.address);
const plansQuery = useBeamPlansQuery(address);

watchEffect(() => {
    plansLoading.value = plansQuery.isLoading.value;
    if (!walletStore.address) {
        plans.value = [];
        selectedPlan.value = null;
        return;
    }
    if (plansQuery.data.value) {
        plans.value = plansQuery.data.value;
        if (selectedPlan.value && !plans.value.some((p) => p._id === selectedPlan.value!._id)) {
            selectedPlan.value = null;
        }
    }
});

const generatePaymentLink = async () => {
    if (!walletStore.merchant) {
        notify.push({
            title: 'Merchant not loaded',
            description: 'Connect your wallet and open your merchant account.',
            category: 'error',
        });
        return;
    }

    generating.value = true;
    try {
        if (paymentKind.value === 'one-time') {
            if (!canGenerateOneTime.value || !token.value) {
                notify.push({
                    title: 'Check amount and asset',
                    description: 'Enter a positive amount and pick a token.',
                    category: 'error',
                });
                return;
            }
            const payload: CreateTransactionPayload = {
                kind: 'onetime',
                merchant: walletStore.merchant.merchant,
                token: token.value.address,
                amount: String(form.value.amount).trim(),
                description: form.value.description.trim() || undefined,
                splitPayment: form.value.splitPayment || undefined,
            };
            const created = await Client.createTransaction(payload);
            paymentLink.value = buildPaymentUrl(created.id);
        } else {
            if (!canGenerateRecurrent.value || !selectedPlan.value) {
                notify.push({
                    title: 'Choose a plan',
                    description: 'Pick an active subscription plan to bill against.',
                    category: 'error',
                });
                return;
            }
            const payload: CreateTransactionPayload = {
                kind: 'recurrent',
                merchant: walletStore.merchant.merchant,
                subscriptionId: selectedPlan.value._id as Hex,
                description: form.value.description.trim() || undefined,
            };
            const created = await Client.createTransaction(payload);
            paymentLink.value = buildPaymentUrl(created.id);
        }

        notify.push({
            title: 'Payment link ready',
            description: 'Customer can scan the QR or use the button to pay.',
            category: 'success',
        });
    } finally {
        generating.value = false;
    }
};

const copyLink = async () => {
    if (!paymentLink.value) return;
    try {
        await navigator.clipboard.writeText(paymentLink.value);
        notify.push({
            title: 'Link copied',
            description: 'Share it with your customer.',
            category: 'success',
        });
    } catch {
        notify.push({
            title: 'Copy failed',
            description: paymentLink.value,
            category: 'error',
        });
    }
};

const openPaymentApp = () => {
    if (!paymentLink.value) return;
    window.open(paymentLink.value, '_blank', 'noopener,noreferrer');
};

const resetCheckout = () => {
    paymentLink.value = '';
};

const sdkSnippet = computed(() => {
    if (!paymentLink.value || !walletStore.merchant) return '';
    const descLiteral = JSON.stringify(form.value.description.trim() || '');
    if (paymentKind.value === 'one-time') {
        if (!token.value) return '';
        const m = walletStore.merchant.merchant;
        const t = token.value.address;
        const a = String(form.value.amount).trim();
        const splitPayment = form.value.splitPayment ? 'true' : 'false';
        return `import { parseUnits } from 'viem';
import { beamSdk } from '@/scripts/beamSdk';
import { SCHEMA_JSON } from '@railbeam/beam-ts';

// Replace with the customer's wallet address (or multiple for split pay).
const payer = '0x…' as \`0x\${string}\`;

const result = await beamSdk.oneTimeTransaction.create({
  payers: [payer],
  merchant: '${m}',
  amounts: [parseUnits('${a}', ${token.value.decimals})],
  token: '${t}',
  description: ${descLiteral},
  metadata: { schemaVersion: SCHEMA_JSON, value: '{}' },
  splitPayment: ${splitPayment},
});`;
    }
    if (!selectedPlan.value) return '';
    const m = walletStore.merchant.merchant;
    const sid = selectedPlan.value._id;
    return `import { beamSdk } from '@/scripts/beamSdk';
import { SCHEMA_JSON } from '@railbeam/beam-ts';

const result = await beamSdk.recurrentTransaction.create({
  merchant: '${m}',
  subscriptionId: '${sid}',
  description: ${descLiteral},
  metadata: { schemaVersion: SCHEMA_JSON, value: '{}' },
});`;
});

const copySnippet = async () => {
    const text = sdkSnippet.value;
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        notify.push({
            title: 'Code copied',
            description: 'Paste into your app where you collect payment.',
            category: 'success',
        });
    } catch {
        notify.push({
            title: 'Copy failed',
            description: 'Select the code and copy manually.',
            category: 'error',
        });
    }
};

watch(() => walletStore.merchant, syncTokens, { deep: true });

watch(paymentKind, () => {
    paymentLink.value = '';
});

watch([() => form.value.amount, () => form.value.description, () => form.value.splitPayment, token, selectedPlan], () => {
    paymentLink.value = '';
});

watch(
    () => walletStore.address,
    () => {
        // handled by query + watchEffect
    }
);

const onDocClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest?.('[data-plans-dropdown]')) return;
    plansDropdownOpen.value = false;
};

onMounted(() => {
    syncTokens();
    document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick);
});
</script>

<template>
    <div class="page">
        <template v-if="!paymentLink">
            <div class="toolbar">
                <p class="options_label">Accept options</p>
                <div class="tabs" role="tablist" aria-label="Payment type">
                    <button type="button" role="tab" :aria-selected="paymentKind === 'one-time'"
                        :class="paymentKind === 'one-time' ? 'tab tab_active' : 'tab'"
                        @click="paymentKind = 'one-time'">
                        One Time
                    </button>
                    <button type="button" role="tab" :aria-selected="paymentKind === 'recurrent'"
                        :class="paymentKind === 'recurrent' ? 'tab tab_active' : 'tab'"
                        @click="paymentKind = 'recurrent'">
                        Recurrent
                    </button>
                </div>
            </div>

            <div class="layout">
                <div class="form">
                    <template v-if="paymentKind === 'one-time'">
                        <div class="asset">
                            <div class="field_label">
                                <p>Asset</p>
                            </div>
                            <div v-if="tokens.length === 0" class="empty_tokens">
                                <p>No tokens available for this merchant.</p>
                            </div>
                            <div v-else class="tokens">
                                <div v-for="t in tokens" :key="t.address"
                                    :class="t.address === token?.address ? 'token token_selected' : 'token'"
                                    @click="token = t">
                                    <div class="token_info">
                                        <StorageImage :src="t.image" alt="" />
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
                                <input type="number" v-model="form.amount" min="0" step="any" placeholder="0"
                                    :disabled="!token">
                            </div>
                        </div>
                    </template>

                    <template v-else>
                        <div class="recurrent_fields">
                            <div class="field_label recurrent_label">
                                <p>Subscription plan</p>
                            </div>
                            <div v-if="!walletStore.address" class="empty_tokens">
                                <p>Connect your wallet to load plans.</p>
                            </div>
                            <div v-else-if="plansLoading" class="empty_tokens">
                                <p>Loading plans…</p>
                            </div>
                            <div v-else-if="plans.length === 0" class="empty_tokens">
                                <p>No plans yet. Create one under Subscriptions.</p>
                            </div>
                            <div v-else class="plans_dropdown" data-plans-dropdown>
                                <button type="button" class="plans_trigger"
                                    :aria-expanded="plansDropdownOpen ? 'true' : 'false'"
                                    @click="plansDropdownOpen = !plansDropdownOpen">
                                    <template v-if="selectedPlan">
                                        <div class="plans_trigger_left">
                                            <StorageImage class="plans_token_img" :src="getPlanImage(selectedPlan)"
                                                alt="" />
                                            <div class="plans_trigger_text">
                                                <span class="plans_trigger_name">{{ selectedPlan.name }}</span>
                                                <span class="plans_trigger_amt">{{
                                                    Converter.toMoney(
                                                        formatUnits(selectedPlan.amount,
                                                            getToken(selectedPlan.token)?.decimals ?? 18)
                                                    )
                                                }} {{ getToken(selectedPlan.token)?.symbol }}</span>
                                            </div>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <span class="plans_placeholder">Choose a plan…</span>
                                    </template>
                                    <span class="plans_chev" aria-hidden="true"></span>
                                </button>

                                <div v-if="plansDropdownOpen" class="plans_menu" role="listbox"
                                    aria-label="Subscription plans">
                                    <button v-for="plan in plans" :key="plan._id" type="button" class="plans_option"
                                        :class="{ plans_option_selected: selectedPlan?._id === plan._id }" role="option"
                                        :aria-selected="selectedPlan?._id === plan._id ? 'true' : 'false'"
                                        @click="selectedPlan = plan; plansDropdownOpen = false">
                                        <StorageImage class="plans_token_img" :src="getPlanImage(plan)" alt="" />
                                        <div class="plans_option_text">
                                            <span class="plans_option_name">{{ plan.name }}</span>
                                            <span class="plans_option_amt">{{
                                                Converter.toMoney(
                                                    formatUnits(plan.amount, getToken(plan.token)?.decimals ?? 18)
                                                )
                                            }} {{ getToken(plan.token)?.symbol }}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </template>

                    <div class="inputs">
                        <div class="field_label">
                            <p>Description <span class="optional">optional</span></p>
                        </div>
                        <textarea v-model="form.description" rows="3"
                            placeholder="Shown to the customer at checkout"></textarea>
                    </div>

                    <div v-if="paymentKind === 'one-time'" class="inputs">
                        <div class="field_label">
                            <p>Split payment <span class="optional">optional</span></p>
                        </div>
                        <label class="split_toggle_row" :class="{ split_toggle_row_on: form.splitPayment }">
                            <input v-model="form.splitPayment" class="sr_only" type="checkbox" />
                            <span class="split_toggle_radio" aria-hidden="true">
                                <span class="split_toggle_radio__ring">
                                    <span class="split_toggle_radio__dot" />
                                </span>
                            </span>
                            <span>Enable split payment</span>
                        </label>
                    </div>

                    <div class="actions">
                        <button type="button" class="btn_primary" :disabled="generating || (paymentKind === 'one-time'
                            ? !canGenerateOneTime
                            : !canGenerateRecurrent)" @click="generatePaymentLink">
                            {{ generating ? 'Generating…' : 'Generate payment QR' }}
                        </button>
                    </div>
                </div>
            </div>
        </template>

        <template v-else>
            <div class="layout layout_solo">
                <div class="qr_card">
                    <p class="qr_title">Customer checkout</p>
                    <p class="qr_hint">Scan with a phone or share the link. Opens the Beam payment app.</p>
                    <div class="qr_wrap">
                        <qrcode-vue :value="paymentLink" :size="220" level="M" render-as="svg" />
                    </div>
                    <div class="qr_actions">
                        <button type="button" class="btn_primary" @click="openPaymentApp">Open payment app</button>
                        <button type="button" class="btn_secondary btn_copy_row" @click="copyLink">
                            <CopyIcon />
                            <span>Copy link</span>
                        </button>
                        <button type="button" class="btn_text" @click="resetCheckout">New payment</button>
                    </div>
                </div>
            </div>

            <div v-if="sdkSnippet" class="snippet_section">
                <div class="snippet_toolbar">
                    <p class="snippet_label">Beam SDK · accept payment</p>
                    <button type="button" class="snippet_copy" @click="copySnippet">
                        <CopyIcon />
                        <span>Copy</span>
                    </button>
                </div>
                <pre class="snippet_code"><code>{{ sdkSnippet }}</code></pre>
            </div>
        </template>
    </div>
</template>

<style scoped>
.page {
    padding: 0 var(--page-gutter) 50px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    overflow-x: auto;
}

.layout {
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: flex-start;
    gap: 28px;
    width: max-content;
    max-width: 100%;
    margin: 0 auto;
}

.layout_solo {
    justify-content: center;
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
    flex: 0 0 auto;
    width: 520px;
    max-width: min(520px, calc(100vw - (var(--page-gutter) * 2)));
    box-sizing: border-box;
}

.qr_card {
    flex: 0 0 auto;
    width: 800px;
    max-width: min(800px, calc(100vw - (var(--page-gutter) * 2)));
    box-sizing: border-box;
    border-radius: 14px;
    background: var(--bg-light);
    border: 1px solid var(--bg-lightest);
    padding: 24px;
    text-align: center;
}

.qr_title {
    margin: 0 0 8px;
    font-size: 16px;
    color: var(--tx-normal);
}

.qr_hint {
    margin: 0 0 20px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--tx-dimmed);
}

.qr_wrap {
    display: flex;
    justify-content: center;
    padding: 16px;
    background: var(--bg);
    border-radius: 12px;
    border: 1px solid var(--bg-lightest);
}

.qr_actions {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.btn_copy_row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.btn_copy_row :deep(svg) {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.btn_text {
    margin-top: 4px;
    height: 36px;
    width: 100%;
    border: none;
    background: none;
    color: var(--tx-semi);
    font-size: 13px;
    cursor: pointer;
}

.btn_text:hover {
    color: var(--tx-normal);
}

.snippet_section {
    width: 100%;
    margin-top: 32px;
    box-sizing: border-box;
}

.snippet_toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

.snippet_label {
    margin: 0;
    font-size: 14px;
    color: var(--tx-dimmed);
}

.snippet_copy {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg-light);
    color: var(--tx-normal);
    font-size: 14px;
    cursor: pointer;
}

.snippet_copy :deep(svg) {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.snippet_code {
    margin: 0;
    padding: 16px 18px;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--bg-lightest);
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    line-height: 1.55;
    color: var(--tx-normal);
    text-align: left;
}

.snippet_code code {
    font-family: inherit;
    white-space: pre;
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
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--bg-lightest);
    background: none;
    color: var(--tx-normal);
    font-size: 14px;
    cursor: pointer;
}

.actions {
    margin-top: 24px;
}

.field_label {
    margin-bottom: 10px;
}

.recurrent_fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.recurrent_fields .recurrent_label {
    margin-bottom: 0;
}

.recurrent_fields .empty_tokens {
    padding: 18px 18px;
}

.field_label p {
    font-size: 14px;
    color: var(--tx-dimmed);
    margin: 0;
}

.optional {
    font-size: 12px;
    color: var(--tx-semi);
}

.asset+.inputs,
.recurrent_fields+.inputs {
    margin-top: 28px;
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

.token_info :deep(img) {
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

.inputs+.inputs {
    margin-top: 24px;
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

.split_toggle_row {
    height: 44px;
    border-radius: 8px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg);
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--tx-normal);
    font-size: 14px;
    cursor: pointer;
    user-select: none;
}

.split_toggle_radio {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.split_toggle_radio__ring {
    width: 10px;
    height: 10px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.split_toggle_radio__dot {
    width: 10px;
    height: 10px;
    border-radius: 10px;
}

.split_toggle_row_on .split_toggle_radio {
    border-color: var(--primary-light);
}

.split_toggle_row_on .split_toggle_radio__dot {
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

.inputs textarea {
    width: 100%;
    border-radius: 8px;
    background: var(--bg);
    border: 1px solid var(--bg-lightest);
    color: var(--tx-normal);
    padding: 12px 16px;
    resize: vertical;
    outline: none;
    font-size: 14px;
    min-height: 88px;
    box-sizing: border-box;
}

.inputs textarea::placeholder {
    color: var(--tx-dimmed);
}

.plans_dropdown {
    position: relative;
}

.plans_trigger {
    width: 100%;
    min-height: 48px;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg);
    cursor: pointer;
    color: var(--tx-normal);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    text-align: left;
}

.plans_trigger_left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.plans_token_img {
    width: 22px;
    height: 22px;
    border-radius: 11px;
    flex-shrink: 0;
}

.plans_trigger_text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.plans_trigger_name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.plans_trigger_amt {
    font-size: 13px;
    color: var(--tx-semi);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.plans_placeholder {
    color: var(--tx-dimmed);
    font-size: 14px;
}

.plans_chev {
    width: 10px;
    height: 10px;
    border-right: 2px solid var(--tx-dimmed);
    border-bottom: 2px solid var(--tx-dimmed);
    transform: rotate(45deg);
    flex-shrink: 0;
    margin-right: 4px;
}

.plans_menu {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 8px);
    z-index: 10;
    border-radius: 10px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg);
    overflow: hidden;
    max-height: 280px;
    overflow-y: auto;
}

.plans_option {
    width: 100%;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    color: var(--tx-normal);
}

.plans_option:hover {
    background: var(--bg-light);
}

.plans_option_selected {
    background: var(--bg-lighter);
}

.plans_option_text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.plans_option_name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.plans_option_amt {
    font-size: 13px;
    color: var(--tx-semi);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

@media (max-width: 960px) {
    .page {
        padding: 0 var(--page-gutter) 40px;
        overflow-x: hidden;
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

    .layout {
        width: 100%;
        max-width: 100%;
        flex-wrap: wrap;
        justify-content: center;
    }

    .form {
        width: 100%;
        max-width: 520px;
    }

    .qr_card {
        width: 100%;
        max-width: 800px;
    }
}

@media (max-width: 600px) {
    .form,
    .qr_card {
        max-width: 100%;
    }

    .tokens {
        grid-template-columns: 1fr;
    }
}
</style>
