<script setup lang="ts">
import { BeamContract } from '@/scripts/contract';
import { useDataStore } from '@/stores/data';
import { useWalletStore } from '@/stores/wallet';
import { formatUnits, parseUnits, zeroAddress, type Hex } from 'viem';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BeamSDK from '@railbeam/beam-ts';
import { Network, TransactionType } from '@/scripts/types';
import type { Token, Transaction, TransactionCallback } from '@railbeam/beam-ts';
import { getToken, SCHEMA_JSON, sleep } from '@railbeam/beam-ts';
import { TokenContract } from '@/scripts/erc20';
import Converter from '@/scripts/converter';
import { notify } from '@/reactives/notify';
import ProgressBox from '@/components/ProgressBox.vue';
import PayerShareList from '@/components/PayerShareList.vue';
import SplitPayments from '@/components/SplitPayments.vue';
import { PAYMENT_MAX_OTHER_PAYERS, PAYMENT_MAX_PAYER_COUNT } from '@/constants/paymentLimits';
import { buildPayerShareRows } from '@/utils/payerShares';
import CheckoutAppShell from '@/components/mobile/CheckoutAppShell.vue';
import BottomSheet from '@/components/mobile/BottomSheet.vue';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/constants/ui';
import { useWeb3Modal } from '@web3modal/wagmi/vue';
import AppFrame from "@/components/layout/AppFrame.vue";
import { mapSubscriptionPlanToPlan, type Plan } from "@railbeam/beam-ts";
import StorageImage from "@/components/StorageImage.vue";

const web3Modal = useWeb3Modal();
const router = useRouter();

const dataStore = useDataStore();
const walletStore = useWalletStore();

const beamSdk = new BeamSDK({
    network: Network.Mainnet
});

const splitPayments = ref<boolean>(false);
const approving = ref<boolean>(false);
const paying = ref<boolean>(false);
/** Set when the user must connect or use a different wallet to see their share (multi-payer). */
const amountBlockedReason = ref<string | null>(null);
const amount = ref<number>(0);
const balance = ref<number>(0);
const allowance = ref<number>(0);
const token = ref<Token | undefined>(getToken(dataStore.data?.token));
const tokenDecimals = computed(() => token.value?.decimals ?? 18);

const subscriptionPlan = ref<Plan | null>(null);
const subscriptionLoading = ref(false);
const subscriptionCatalogMetadataValue = ref<string | null>(null);
const subscriptionIntervalSec = ref<number | null>(null);
const subscriptionGracePeriodSec = ref<number | null>(null);

function toNumberSafe(v: unknown): number | null {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'bigint') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    if (typeof v === 'string') {
        const s = v.trim();
        if (!s) return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function daysFromSeconds(sec: number): number | null {
    if (!Number.isFinite(sec) || sec <= 0) return null;
    return Math.round(sec / 86400);
}

const intervalDays = computed(() => {
    const d = subscriptionIntervalSec.value == null ? null : daysFromSeconds(subscriptionIntervalSec.value);
    return d && d > 0 ? d : null;
});

const gracePeriodDays = computed(() => {
    const d = subscriptionGracePeriodSec.value == null ? null : daysFromSeconds(subscriptionGracePeriodSec.value);
    return d && d > 0 ? d : null;
});

const cadenceLine = computed(() => {
    const parts: string[] = [];
    if (intervalDays.value != null) parts.push(`Every ${intervalDays.value} day${intervalDays.value === 1 ? '' : 's'}`);
    if (gracePeriodDays.value != null) parts.push(`Grace ${gracePeriodDays.value} day${gracePeriodDays.value === 1 ? '' : 's'}`);
    return parts.length ? parts.join(' · ') : null;
});

type CatalogMetadata = {
    name?: string;
    description?: string;
    images?: string[];
};

function parseCatalogMetadataValue(rawValue: unknown): CatalogMetadata | null {
    if (typeof rawValue !== 'string' || rawValue.trim().length === 0) return null;
    try {
        const obj = JSON.parse(rawValue) as unknown;
        if (!obj || typeof obj !== 'object') return null;

        const rec = obj as Record<string, unknown>;
        const name = typeof rec.name === 'string' ? rec.name.trim() : '';
        const description = typeof rec.description === 'string' ? rec.description.trim() : '';
        const imagesRaw = rec.images;
        const images =
            Array.isArray(imagesRaw)
                ? imagesRaw
                    .filter((x): x is string => typeof x === 'string')
                    .map(s => s.trim())
                    .filter(Boolean)
                : [];

        return {
            name: name || undefined,
            description: description || undefined,
            images: images.length > 0 ? images : undefined,
        };
    } catch {
        return null;
    }
}

const subscriptionCatalog = computed(() =>
    parseCatalogMetadataValue(subscriptionCatalogMetadataValue.value)
);

async function loadSubscriptionPlan() {
    subscriptionPlan.value = null;
    subscriptionCatalogMetadataValue.value = null;
    subscriptionIntervalSec.value = null;
    subscriptionGracePeriodSec.value = null;
    if (!dataStore.data?.subscriptionId) return;
    subscriptionLoading.value = true;
    try {
        const row = await beamSdk.recurrentTransaction.getSubscription({
            subscriptionId: dataStore.data.subscriptionId,
        });
        subscriptionCatalogMetadataValue.value =
            row && typeof (row as any).catalog_metadata_value === 'string'
                ? ((row as any).catalog_metadata_value as string)
                : null;
        subscriptionIntervalSec.value = row ? toNumberSafe((row as any).interval) : null;
        subscriptionGracePeriodSec.value = row ? toNumberSafe((row as any).gracePeriod) : null;
        subscriptionPlan.value = row ? mapSubscriptionPlanToPlan(row as any) : null;
    } catch {
        subscriptionPlan.value = null;
        subscriptionCatalogMetadataValue.value = null;
        subscriptionIntervalSec.value = null;
        subscriptionGracePeriodSec.value = null;
    } finally {
        subscriptionLoading.value = false;
    }
}

const payerSplitRows = computed(() => {
    const d = dataStore.data;
    if (!d) return [];
    const amounts = d.amounts ?? [];
    const payers =
        d.payers && d.payers.length > 0
            ? d.payers
            : walletStore.address
                ? ([walletStore.address] as Hex[])
                : [];
    if (!payers.length) return [];

    // When payers weren't provided (single payer flow), show a sensible split list:
    // connected wallet pays the full amount (sum of amounts).
    const amountsForRows =
        d.payers && d.payers.length > 0
            ? amounts
            : [amounts.reduce((a, b) => a + b, 0n)];

    return buildPayerShareRows(payers, amountsForRows, walletStore.address);
});

const splitPaymentEnabled = computed(() => (dataStore.data?.splitPayment ?? true));

function ensureDefaultPayer() {
    if (!dataStore.data) return;
    if (!walletStore.address) return;
    const payers = dataStore.data.payers ?? [];
    if (payers.length === 0) {
        dataStore.setData({ ...dataStore.data, payers: [walletStore.address] });
    }
}

const getAmount = () => {
    amountBlockedReason.value = null;
    if (!dataStore.data) return;
    const amounts: bigint[] = dataStore.data.amounts || [];
    const payers: Hex[] = dataStore.data.payers || [];

    if (payers.length > PAYMENT_MAX_PAYER_COUNT) {
        amount.value = 0;
        amountBlockedReason.value =
            `This payment lists ${payers.length} payers. At most ${PAYMENT_MAX_PAYER_COUNT} are allowed (you plus up to ${PAYMENT_MAX_OTHER_PAYERS} others). Ask the merchant to use separate checkouts.`;
        return;
    }

    if (payers.length > 1 && !walletStore.address) {
        amount.value = 0;
        amountBlockedReason.value =
            'Connect your wallet to view your share of this payment.';
        return;
    }

    const index = payers.length <= 1 ? 0 : payers.findIndex(p =>
        p.toLowerCase() == walletStore.address?.toLowerCase()
    );

    if (index < 0) {
        amount.value = 0;
        amountBlockedReason.value =
            'This wallet is not listed as a payer for this transaction.';
        return;
    }

    const decimals = tokenDecimals.value;
    const values = amounts.map((a) => formatUnits(a, decimals));
    amount.value = Number(values[index]);
};

const getBalance = async () => {
    if (!dataStore.data) return;
    if (!dataStore.data.token) return;
    if (!walletStore.address) return;

    balance.value = 0;

    const result = await TokenContract.getTokenBalance(
        dataStore.data.token,
        walletStore.address
    );

    balance.value = Number(formatUnits(result, tokenDecimals.value));
};

const getAllowance = async () => {
    if (!dataStore.data) return;
    if (!dataStore.data.token) return;

    if (dataStore.data.token == zeroAddress) {
        allowance.value = Number.MAX_VALUE;
        return;
    }

    if (!walletStore.address) return;

    const result = await TokenContract.getAllowance(
        dataStore.data.token,
        walletStore.address,
        BeamContract.address
    );

    allowance.value = Number(formatUnits(result, tokenDecimals.value));
};

const connectWallet = () => {
    web3Modal.open();
};

const approve = async () => {
    if (!walletStore.address) {
        web3Modal.open();
        return;
    }
    if (approving.value) return;
    if (!dataStore.data) return;
    if (!dataStore.data.token) return;

    if (amount.value == 0) return;

    const payers: Hex[] = dataStore.data.payers || [];

    if (payers.length > PAYMENT_MAX_PAYER_COUNT) {
        notify.push({
            title: 'Too many payers',
            description: `At most ${PAYMENT_MAX_PAYER_COUNT} payers are allowed (you plus up to ${PAYMENT_MAX_OTHER_PAYERS} others).`,
            category: 'error',
        });
        return;
    }

    const index = payers.length <= 1 ? 0 : payers.findIndex(p =>
        p.toLowerCase() == walletStore.address?.toLowerCase()
    );

    if (index < 0) {
        notify.push({
            title: 'Wrong wallet',
            description: 'Connect a wallet that is listed as a payer for this payment.',
            category: 'error',
        });
        return;
    }

    approving.value = true;

    const txHash = await TokenContract.approve(
        dataStore.data.token,
        BeamContract.address,
        parseUnits(amount.value.toString(), tokenDecimals.value)
    );

    if (txHash) {
        getAllowance();
    } else {
        notify.push({
            title: 'Transaction failed!',
            description: 'Try again.',
            category: 'error'
        });
    }

    approving.value = false;
};

const makePayment = async () => {
    if (!walletStore.address) {
        web3Modal.open();
        return;
    }
    if (paying.value) return;
    if (!dataStore.initiator) return;
    if (!dataStore.data) return;
    if (!token.value) return;

    const params = new URLSearchParams(window.location.search);
    const session = params.get("session") ?? "";

    paying.value = true;

    let transactionHash: Hex | null = null;

    const amounts: bigint[] = dataStore.data.amounts || [];
    const payers: Hex[] = dataStore.data.payers || [];

    if (dataStore.data.type == TransactionType.OneTime) {
        // `amounts` are already base units for `token` (including native token with 18 decimals).
        const values = amounts;

        const index = payers.length <= 1 ? 0 : payers.findIndex(p =>
            p.toLowerCase() == walletStore.address?.toLowerCase()
        );

        if (index < 0) {
            notify.push({
                title: 'Wrong wallet',
                description: 'Connect a wallet that is listed as a payer for this payment.',
                category: 'error',
            });
            paying.value = false;
            return;
        }

        const contractPayers: Hex[] =
            payers.length > 0 ? payers : [walletStore.address];

        if (contractPayers.length > PAYMENT_MAX_PAYER_COUNT) {
            notify.push({
                title: 'Too many payers',
                description: `At most ${PAYMENT_MAX_PAYER_COUNT} payers are allowed (you plus up to ${PAYMENT_MAX_OTHER_PAYERS} others).`,
                category: 'error',
            });
            paying.value = false;
            return;
        }

        transactionHash = await BeamContract.oneTimeTransaction(
            {
                payers: contractPayers,
                merchant: dataStore.data.merchant,
                amounts: values,
                token: token.value.address,
                description: dataStore.data.description ? dataStore.data.description : '',
                metadata: dataStore.data.metadata || {
                    schemaVersion: SCHEMA_JSON,
                    value: "{}"
                },
            },
            token.value.address == zeroAddress ? amounts[index]! : BigInt(0)
        );
    } else if (dataStore.data.subscriptionId) {
        const subscription = await beamSdk.recurrentTransaction.getSubscription({
            subscriptionId: dataStore.data.subscriptionId
        });

        if (!subscription || subscription.trashed) return;

        transactionHash = await BeamContract.recurrentTransaction(
            {
                merchant: dataStore.data.merchant,
                subscriptionId: dataStore.data.subscriptionId,
                description: dataStore.data.description ? dataStore.data.description : '',
                metadata: dataStore.data.metadata || {
                    schemaVersion: SCHEMA_JSON,
                    value: "{}"
                },
            },
            token.value.address == zeroAddress ? subscription.amount : BigInt(0)
        );
    } else {
        notify.push({
            title: 'Invalid transaction type!',
            description: 'Try again.',
            category: 'error'
        });
    }

    if (transactionHash) {
        notify.push({
            title: 'Transaction sent!',
            description: 'Payment successful.',
            category: 'success',
            linkTitle: 'View Trx',
            linkUrl: `${import.meta.env.VITE_EXPLORER_URL}/tx/${transactionHash}`
        });

        let tries: number = 0;
        let trxs: Transaction[] = [];

        while (trxs.length == 0 && tries < 5) {
            trxs = await beamSdk.oneTimeTransaction.getTransactionsFromHash({
                transactionHash
            });

            tries += 1;

            await sleep(2_000);
        }

        const result: TransactionCallback = {
            session,
            ...trxs[0]
        };

        if (window.opener && session) {
            window.opener.postMessage(result, dataStore.initiator.url);
        }

        // Move checkout flow to in-app success screen with CTA to detail.
        if (result.transactionId) {
            router.push({ name: 'payment-tx-success', params: { id: result.transactionId } });
        }
    } else {
        notify.push({
            title: 'Transaction failed!',
            description: 'Try again.',
            category: 'error'
        });
    };

    paying.value = false;
};

watch(dataStore, () => {
    getAmount();
    getBalance();
    getAllowance();
    token.value = getToken(dataStore.data?.token);
}, { deep: true });

watch(
    () => dataStore.data?.subscriptionId,
    () => {
        void loadSubscriptionPlan();
    }
);

watch(
    [() => walletStore.address, () => (dataStore.data?.payers?.length ?? 0)],
    () => {
        ensureDefaultPayer();
        getAmount();
        getBalance();
        getAllowance();
    }
);

onMounted(() => {
    ensureDefaultPayer();
    getAmount();
    getBalance();
    getAllowance();
    token.value = getToken(dataStore.data?.token);
    void loadSubscriptionPlan();
});
</script>

<template>
    <div class="default-view">
        <header class="flat-header sticky-top">
            <AppFrame :topInset="false">
                <h1 class="flat-header__title">Pay</h1>
            </AppFrame>
        </header>

        <AppFrame :topInset="false">
            <CheckoutAppShell>
                <ProgressBox v-if="!token || (!amount && !amountBlockedReason)" />
                <div v-else-if="amountBlockedReason" class="flat-blocked">
                    <p>{{ amountBlockedReason }}</p>
                    <button v-if="!walletStore.address && amountBlockedReason.startsWith('Connect your wallet')"
                        type="button" class="flat-cta flat-blocked__cta" @click="connectWallet">
                        Connect wallet
                    </button>
                </div>
                <div v-else-if="dataStore.data" class="flat">
                    <section v-if="dataStore.initiator" class="flat-section">
                        <p class="flat-kicker">From</p>
                        <a class="flat-from" :href="dataStore.initiator.url" target="_blank" rel="noopener noreferrer">
                            <img class="flat-from__logo" :src="dataStore.initiator.favicon || DEFAULT_PLACEHOLDER_IMAGE"
                                alt="" width="40" height="40" />
                            <span class="flat-from__name">{{ dataStore.initiator.title || 'Merchant' }}</span>
                        </a>
                    </section>

                    <section v-if="dataStore.data.subscriptionId" class="flat-section">
                        <p class="flat-kicker">Subscription</p>
                        <div v-if="subscriptionLoading" class="flat-sub">Loading…</div>
                        <div v-else-if="subscriptionPlan" class="flat-sub">
                            <StorageImage class="flat-sub__img"
                                :src="subscriptionPlan.images?.[0] || DEFAULT_PLACEHOLDER_IMAGE" alt="" width="44"
                                height="44" />
                            <div class="flat-sub__meta">
                                <span class="flat-sub__name">{{ subscriptionPlan.name }}</span>
                                <span class="flat-sub__desc">{{ subscriptionPlan.description }}</span>
                                <span v-if="cadenceLine" class="flat-sub__desc">{{ cadenceLine }}</span>
                            </div>
                        </div>
                        <div v-else-if="subscriptionCatalog" class="flat-sub">
                            <StorageImage class="flat-sub__img"
                                :src="subscriptionCatalog.images?.[0] || DEFAULT_PLACEHOLDER_IMAGE" alt="" width="44"
                                height="44" />
                            <div class="flat-sub__meta">
                                <span class="flat-sub__name">{{ subscriptionCatalog.name || 'Subscription' }}</span>
                                <span class="flat-sub__desc">{{ subscriptionCatalog.description || '' }}</span>
                                <span v-if="cadenceLine" class="flat-sub__desc">{{ cadenceLine }}</span>
                            </div>
                        </div>
                    </section>

                    <section class="flat-section flat-amount">
                        <p class="flat-kicker">{{ (dataStore.data.payers?.length ?? 0) > 1 ? 'Your share' : 'Amount' }}
                        </p>
                        <p class="flat-amount__value">{{ amount }}</p>
                        <p class="flat-amount__sym">{{ token?.symbol }}</p>
                    </section>

                    <section v-if="splitPaymentEnabled" class="flat-section flat-split">
                        <div class="flat-split__head">
                            <p class="flat-kicker">Split</p>
                            <button v-if="walletStore.address" type="button" class="flat-text-btn"
                                @click="splitPayments = true">
                                Edit
                            </button>
                        </div>
                        <PayerShareList :rows="payerSplitRows" :symbol="token?.symbol ?? ''"
                            :decimals="tokenDecimals" />
                    </section>

                    <section class="flat-section">
                        <p class="flat-kicker">Asset</p>
                        <div v-if="token" class="flat-asset">
                            <img class="flat-asset__icon" :src="token.image || DEFAULT_PLACEHOLDER_IMAGE" alt=""
                                width="36" height="36" />
                            <div class="flat-asset__meta">
                                <span class="flat-asset__sym">{{ token.symbol }}</span>
                                <span class="flat-asset__bal">Balance {{ Converter.toMoney(balance) }} {{ token.symbol
                                }}</span>
                            </div>
                        </div>
                    </section>

                    <footer class="flat-footer">
                        <button type="button" v-if="!walletStore.address" class="flat-cta" @click="connectWallet">
                            Connect wallet
                        </button>
                        <button type="button" disabled v-else-if="balance < amount" class="flat-cta flat-cta--muted">
                            Insufficient balance
                        </button>
                        <button type="button" v-else-if="allowance < amount" class="flat-cta" @click="approve">
                            {{ approving ? 'Approving…' : `Approve ${token?.symbol}` }}
                        </button>
                        <button type="button" v-else class="flat-cta" @click="makePayment">
                            {{
                                paying
                                    ? (dataStore.data?.subscriptionId ? 'Subscribing…' : 'Paying…')
                                    : (dataStore.data?.subscriptionId ? 'Subscribe' : 'Pay now')
                            }}
                        </button>
                    </footer>
                </div>

                <BottomSheet v-model="splitPayments" title="Split payment">
                    <SplitPayments variant="sheet" @close="splitPayments = false" />
                </BottomSheet>
            </CheckoutAppShell>
        </AppFrame>
    </div>
</template>

<style scoped>
.flat-blocked {
    padding: 32px 0;
    text-align: center;
    color: var(--tx-semi);
    font-size: 15px;
    line-height: 1.5;
}

.flat-blocked__cta {
    margin-top: 24px;
    max-width: 100%;
}

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

.flat-from {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: var(--native-tap, 44px);
    text-decoration: none;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
}

.flat-from:active {
    opacity: 0.85;
}

.flat-from__logo {
    border-radius: var(--radius-10);
    object-fit: cover;
    border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
    flex-shrink: 0;
}

.flat-from__name {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--tx-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.flat-amount {
    padding-top: 24px;
    padding-bottom: 24px;
}

.flat-amount__value {
    margin: 0;
    font-size: clamp(40px, 11vw, 52px);
    font-weight: 700;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    line-height: 1.05;
    color: var(--tx-normal);
}

.flat-amount__sym {
    margin: 8px 0 0;
    font-size: 17px;
    font-weight: 600;
    color: var(--tx-dimmed);
    letter-spacing: -0.01em;
}

.flat-split__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.flat-text-btn {
    padding: 8px 4px;
    border: none;
    background: none;
    color: var(--primary-light);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.flat-text-btn:active {
    opacity: 0.8;
}

.flat-asset {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: var(--native-tap, 44px);
}

.flat-asset__icon {
    border-radius: var(--radius-10);
    object-fit: cover;
    border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
    flex-shrink: 0;
}

.flat-asset__meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.flat-asset__sym {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--tx-normal);
}

.flat-asset__bal {
    font-size: 14px;
    color: var(--tx-semi);
}

.flat-sub {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: var(--native-tap, 44px);
    color: var(--tx-normal);
}

.flat-sub__img {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-10);
    object-fit: cover;
    border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
    flex-shrink: 0;
    background: var(--bg);
}

.flat-sub__meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.flat-sub__name {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--tx-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.flat-sub__desc {
    font-size: 13px;
    color: var(--tx-semi);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

.flat-cta:active:not(:disabled) {
    transform: scale(0.98);
    opacity: 0.94;
}

.flat-cta--muted {
    background: var(--bg-lighter);
    color: var(--tx-dimmed);
    box-shadow: none;
    cursor: not-allowed;
}

.flat-cta:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
}
</style>