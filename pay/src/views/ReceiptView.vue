<script setup lang="ts">
import CheckIcon from '@/components/icons/CheckIcon.vue';
import CloseIcon from '@/components/icons/CloseIcon.vue';
import CompletedIcon from '@/components/icons/CompletedIcon.vue';
import EraserIcon from '@/components/icons/EraserIcon.vue';
import PendingIcon from '@/components/icons/PendingIcon.vue';
import ProgressBox from '@/components/ProgressBox.vue';
import { notify } from '@/reactives/notify';
import { OneTimeTransactionContract, RecurrentTransactionContract } from '@/scripts/contract';
import Converter from '@/scripts/converter';
import Storage from '@/scripts/storage';
import { Network, TransactionType } from '@/scripts/types';
import { useWalletStore } from '@/stores/wallet';
import BeamSDK from '@railbeam/beam-ts';
import { Transaction } from 'beam-ts/src/types';
import { getToken } from 'beam-ts/src/utils/constants';
import html2canvas from "html2canvas";
import { formatUnits, Hex } from 'viem';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CheckoutAppShell from '@/components/mobile/CheckoutAppShell.vue';
import { useWeb3Modal } from '@web3modal/wagmi/vue';
import AppFrame from "@/components/layout/AppFrame.vue";

const router = useRouter();
const progress = ref<boolean>(true);
const walletStore = useWalletStore();
const web3Modal = useWeb3Modal();
/** Used as part of the mint upload filename */
const receiptUploadKey = ref<Hex | null>(null);
const transaction = ref<Transaction | null>(null);
const minting = ref<boolean>(false);
const captureDiv = ref<HTMLDivElement | null>(null);

const beamSdk = new BeamSDK({
    network: Network.Testnet
});

function closeReceipt() {
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push({ path: '/p/home' });
    }
}

const connectWallet = () => {
    web3Modal.open();
};

const receiptToken = computed(() =>
    transaction.value ? getToken(transaction.value.adjustedToken) : undefined
);

const receiptAmountNumeric = computed(() => {
    const t = transaction.value;
    const tok = receiptToken.value;
    if (!t || !tok) return 0;
    return Number(formatUnits(t.adjustedAmount, tok.decimals ?? 18));
});

const receiptAmountLabel = computed(() => Converter.toMoney(receiptAmountNumeric.value));

const receiptStatus = computed(() => {
    const t = transaction.value;
    if (!t) return { completed: false, label: 'Pending' as const };
    if (t.type === TransactionType.OneTime) {
        const completed = t.fulfilleds.length === t.payers.length;
        return { completed, label: completed ? ('Completed' as const) : ('Pending' as const) };
    }
    return { completed: true, label: 'Completed' as const };
});

const formattedReceiptTime = computed(() => {
    const t = transaction.value;
    if (!t) return { date: '', time: '' };
    const d = new Date(t.blockTimestamp * 1000);
    return {
        date: Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(d),
        time: Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(d),
    };
});

const mint = async () => {
    if (minting.value) return;
    if (!walletStore.address) {
        web3Modal.open();
        return;
    }
    if (!captureDiv.value) return;
    if (!transaction.value) return;

    const canvas = await html2canvas(captureDiv.value);

    canvas.toBlob(async (blob) => {
        if (!walletStore.address) {
            web3Modal.open();
            return;
        }
        if (!transaction.value) return;

        minting.value = true;

        if (!blob) {
            minting.value = false;
            notify.push({
                title: 'Failed to mint NFT!',
                description: 'Try again',
                category: "error"
            });
            return;
        }

        const imageURL = await Storage.awaitUpload(blob, `${receiptUploadKey.value ?? 'receipt'}-${Date.now()}`);

        const metadata = {
            name: 'Payment receipt.',
            description: transaction.value.description ? transaction.value.description : 'No description.',
            image: imageURL
        };

        let transactionHash: Hex | null = null;
        if (transaction.value.type == TransactionType.OneTime) {
            transactionHash = await OneTimeTransactionContract.mintReceipt({
                to: walletStore.address,
                transactionId: transaction.value.transactionId,
                URI: JSON.stringify(metadata)
            });
        } else if (transaction.value.type == TransactionType.Recurrent) {
            transactionHash = await RecurrentTransactionContract.mintReceipt({
                to: walletStore.address,
                transactionId: transaction.value.transactionId,
                URI: JSON.stringify(metadata)
            });
        } else {
            notify.push({
                title: 'No receipt for this transaction type',
                description: 'Try again',
                category: "error"
            });
            return;
        }

        if (transactionHash) {
            notify.push({
                title: 'Transaction was sent!',
                description: 'NFT was minted',
                category: "success",
                linkTitle: 'View Trx',
                linkUrl: `${import.meta.env.VITE_EXPLORER_URL}/tx/${transactionHash}`
            });
        } else {
            notify.push({
                title: 'Failed to mint receipt!',
                description: 'Try again',
                category: "error"
            });
        }

        minting.value = false;
    }, "image/png");
};
const getTransaction = async (transactionId: Hex) => {
    transaction.value = await beamSdk.oneTimeTransaction.getTransaction({
        transactionId
    });

    if (!transaction.value) {
        notify.push({
            title: 'Transaction not found!',
            description: 'Try again',
            category: "error"
        });
        return;
    }

    receiptUploadKey.value = transactionId;
    progress.value = false;
};
onMounted(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        notify.push({
            title: 'Invalid receipt link!',
            description: 'Try again',
            category: "error"
        });
        return;
    }

    getTransaction(id as Hex);
});
</script>

<template>
    <div class="receipt-view">
        <header class="receipt-flat__top sticky-top">
            <AppFrame :topInset="false">
                <div class="receipt-flat__top-inner">
                    <span class="bar-spacer" aria-hidden="true" />
                    <h1 class="receipt-flat__title">Receipt</h1>
                    <button type="button" class="icon-btn" aria-label="Close" @click="closeReceipt">
                        <CloseIcon />
                    </button>
                </div>
            </AppFrame>
        </header>

        <AppFrame :topInset="false">
            <CheckoutAppShell>
                <ProgressBox v-if="progress" />
                <div v-else-if="transaction" class="receipt-flat">
                    <div ref="captureDiv" class="receipt-flat__capture">
                        <section class="receipt-flat__hero">
                            <p class="receipt-flat__kicker">Amount</p>
                            <p class="receipt-flat__amount">{{ receiptAmountLabel }}</p>
                            <p class="receipt-flat__sym">{{ receiptToken?.symbol }}</p>
                        </section>

                        <section class="receipt-flat__section receipt-flat__meta">
                            <p class="receipt-flat__desc">
                                {{ transaction.description || 'No description' }}
                            </p>
                            <p class="receipt-flat__signers">
                                <span class="receipt-flat__signers-label">Signers</span>
                                {{ transaction.confirmations.length }}
                            </p>
                        </section>

                        <section class="receipt-flat__section">
                            <p class="receipt-flat__kicker">Details</p>
                            <div class="receipt-flat__row">
                                <span class="receipt-flat__row-label">Asset</span>
                                <span v-if="receiptToken"
                                    class="receipt-flat__row-value receipt-flat__row-value--token">
                                    <img :src="receiptToken.image" alt="" width="22" height="22" />
                                    {{ receiptAmountLabel }} {{ receiptToken.symbol }}
                                </span>
                            </div>
                            <div class="receipt-flat__row">
                                <span class="receipt-flat__row-label">Status</span>
                                <span class="receipt-flat__row-value receipt-flat__status">
                                    <CompletedIcon v-if="receiptStatus.completed" />
                                    <PendingIcon v-else />
                                    {{ receiptStatus.label }}
                                </span>
                            </div>
                            <div class="receipt-flat__row receipt-flat__row--last">
                                <span class="receipt-flat__row-label">Date</span>
                                <span class="receipt-flat__row-value">
                                    {{ formattedReceiptTime.date }}
                                    <span class="receipt-flat__time">{{ formattedReceiptTime.time }}</span>
                                </span>
                            </div>
                        </section>
                    </div>

                    <footer class="receipt-flat__footer">
                        <button type="button" class="receipt-flat__btn receipt-flat__btn--secondary"
                            @click="closeReceipt">
                            <EraserIcon />
                            Done
                        </button>
                        <button v-if="!walletStore.address" type="button"
                            class="receipt-flat__btn receipt-flat__btn--primary" @click="connectWallet">
                            <CheckIcon />
                            Connect wallet
                        </button>
                        <button v-else type="button" class="receipt-flat__btn receipt-flat__btn--primary"
                            :disabled="minting" @click="mint">
                            <CheckIcon />
                            {{ minting ? 'Minting…' : 'Mint NFT' }}
                        </button>
                    </footer>
                </div>
            </CheckoutAppShell>
        </AppFrame>
    </div>
</template>

<style scoped>
.receipt-flat {
    width: 100%;
    padding-bottom: 12px;
}

.receipt-flat__top {
    width: 100%;
    padding: calc(4px + env(safe-area-inset-top, 0px)) 0 16px;
    border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.receipt-flat__top-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.receipt-flat__title {
    flex: 1;
    text-align: center;
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--tx-normal);
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
    color: inherit;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

.icon-btn:active {
    transform: scale(0.96);
    opacity: 0.9;
}

.bar-spacer {
    width: var(--native-tap, 44px);
    flex-shrink: 0;
}

.receipt-flat__capture {
    margin-top: 8px;
    border-radius: var(--radius-12);
    border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
    overflow: hidden;
    background: rgba(36, 36, 38, 0.35);
}

.receipt-flat__hero {
    padding: 24px 20px 28px;
    text-align: center;
    border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.receipt-flat__kicker {
    margin: 0 0 10px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tx-dimmed);
}

.receipt-flat__amount {
    margin: 0;
    font-size: clamp(36px, 10vw, 48px);
    font-weight: 700;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    line-height: 1.05;
    color: var(--tx-normal);
}

.receipt-flat__sym {
    margin: 8px 0 0;
    font-size: 17px;
    font-weight: 600;
    color: var(--tx-dimmed);
    letter-spacing: -0.01em;
}

.receipt-flat__section {
    padding: 16px 20px;
    border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.receipt-flat__section:last-child {
    border-bottom: none;
}

.receipt-flat__meta {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.receipt-flat__desc {
    margin: 0;
    font-size: 15px;
    line-height: 1.45;
    color: var(--tx-normal);
}

.receipt-flat__signers {
    margin: 0;
    font-size: 14px;
    color: var(--tx-semi);
}

.receipt-flat__signers-label {
    color: var(--tx-dimmed);
    font-weight: 600;
    margin-right: 8px;
}

.receipt-flat__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-height: 48px;
    border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.06));
}

.receipt-flat__row--last {
    border-bottom: none;
    min-height: 44px;
}

.receipt-flat__row-label {
    font-size: 14px;
    color: var(--tx-dimmed);
    flex-shrink: 0;
}

.receipt-flat__row-value {
    font-size: 15px;
    font-weight: 600;
    color: var(--tx-normal);
    text-align: right;
    letter-spacing: -0.02em;
}

.receipt-flat__row-value--token {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
}

.receipt-flat__row-value--token img {
    border-radius: var(--radius-8);
    flex-shrink: 0;
}

.receipt-flat__status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.receipt-flat__time {
    color: var(--tx-dimmed);
    font-weight: 600;
    margin-left: 6px;
}

.receipt-flat__footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 20px;
}

@media (max-width: 360px) {
    .receipt-flat__footer {
        grid-template-columns: 1fr;
    }
}

.receipt-flat__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: var(--native-tap, 44px);
    height: 52px;
    padding: 0 16px;
    border-radius: var(--radius-12);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.02em;
    cursor: pointer;
    border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
    background: rgba(36, 36, 38, 0.55);
    color: var(--tx-normal);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

.receipt-flat__btn :deep(svg) {
    flex-shrink: 0;
}

.receipt-flat__btn--secondary {
    color: var(--tx-semi);
}

.receipt-flat__btn--primary {
    background: var(--primary);
    border-color: transparent;
    color: var(--tx-normal);
    box-shadow: 0 4px 16px rgba(245, 95, 20, 0.35);
}

.receipt-flat__btn--primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

.receipt-flat__btn:active:not(:disabled) {
    transform: scale(0.98);
    opacity: 0.94;
}
</style>