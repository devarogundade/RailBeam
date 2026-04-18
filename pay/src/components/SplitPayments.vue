<script setup lang="ts">
import PlusIcon from '@/components/icons/PlusIcon.vue';
import TrashIcon from '@/components/icons/TrashIcon.vue';
import { useDataStore } from '@/stores/data';
import { useWalletStore } from '@/stores/wallet';
import { formatUnits, parseUnits, type Hex } from 'viem';
import { computed, onMounted, ref, watch } from 'vue';
import CloseIcon from './icons/CloseIcon.vue';
import CheckIcon from './icons/CheckIcon.vue';
import EraserIcon from './icons/EraserIcon.vue';
import { Token } from '@railbeam/beam-ts';
import { getToken } from '@railbeam/beam-ts';
import Converter from '@/scripts/converter';
import { PAYMENT_MAX_OTHER_PAYERS, PAYMENT_MAX_PAYER_COUNT } from '@/constants/paymentLimits';
import { notify } from '@/reactives/notify';
import { resolveBeamAddress } from '@/utils/resolveBeamUser';

const props = withDefaults(
    defineProps<{
        variant?: 'modal' | 'sheet';
    }>(),
    {
        variant: 'modal',
    }
);

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'confirmed', payload: { payers: Hex[]; amounts: bigint[] }): void;
}>();

interface Payer {
    name: string;
    address: string;
    percent: number; // 0-100, 1 decimal
    amount: number; // display-only (derived from percent)
    disabled: boolean;
}

const isValid = ref<boolean>(false);
const resolving = ref<boolean>(false);
const dataStore = useDataStore();
const walletStore = useWalletStore();
const unsavedPayers = ref<Payer[]>([]);
const totalAmount = ref<number>(0);
const totalAmountUnits = ref<bigint>(0n);
const token = ref<Token | undefined>(undefined);

const allocatedPercent = computed(() => {
    if (totalAmount.value <= 0) return 0;
    const sum = unsavedPayers.value.reduce((a, p) => a + (Number.isFinite(p.percent) ? p.percent : 0), 0);
    return sum;
});

function clamp(n: number, lo: number, hi: number) {
    if (!Number.isFinite(n)) return lo;
    return Math.min(hi, Math.max(lo, n));
}

function snapToStep(n: number, step: number) {
    if (!Number.isFinite(n) || step <= 0) return 0;
    return Math.round(n / step) * step;
}

function toPermille(pct: number): number {
    // percent with one decimal -> permille integer (0..1000)
    return Math.round(clamp(pct, 0, 100) * 10);
}

function fromPermille(pm: number): number {
    return clamp(pm / 10, 0, 100);
}

function recalcDerivedAmounts() {
    const decimals = token.value?.decimals ?? 18;
    const total = totalAmountUnits.value;
    if (total <= 0n || unsavedPayers.value.length === 0) {
        unsavedPayers.value.forEach((p) => (p.amount = 0));
        return;
    }

    // Convert % to amounts using integer math, put rounding remainder onto "You" (index 0).
    const pm = unsavedPayers.value.map((p) => toPermille(p.percent));
    const denom = 1000n;
    const hundred = 100n;
    const totalPm = 1000;

    let sumOthers = 0n;
    for (let i = 1; i < unsavedPayers.value.length; i++) {
        const amt = (total * BigInt(pm[i])) / denom;
        sumOthers += amt;
        unsavedPayers.value[i].amount = Number(formatUnits(amt, decimals));
    }

    const youAmt = total - sumOthers;
    if (unsavedPayers.value[0]) {
        unsavedPayers.value[0].amount = Number(formatUnits(youAmt, decimals));
    }

    // Keep "You" percent consistent with remainder.
    const othersPm = pm.slice(1).reduce((a, b) => a + b, 0);
    const youPm = clamp(totalPm - othersPm, 0, totalPm);
    if (unsavedPayers.value[0]) {
        unsavedPayers.value[0].percent = fromPermille(youPm);
    }
}

const confirm = () => {
    if (!walletStore.address) return;
    const baseData = dataStore.data;
    if (!baseData) return;
    if (!isValid.value) return;
    if (resolving.value) return;

    resolving.value = true;
    const decimals = token.value?.decimals ?? 18;
    const total = totalAmountUnits.value;
    const pm = unsavedPayers.value.map((p) => toPermille(p.percent));
    const denom = 1000n;
    let sumOthers = 0n;
    const amounts = unsavedPayers.value.map((payer, idx) => {
        if (idx === 0) return 0n; // fill later as remainder
        const amt = (total * BigInt(pm[idx])) / denom;
        sumOthers += amt;
        return amt;
    });
    amounts[0] = total - sumOthers;
    Promise.resolve()
        .then(async () => {
            // Resolve each payer identifier (0x… or @username) to an address.
            const resolved: Hex[] = [];
            for (const p of unsavedPayers.value) {
                const res = await resolveBeamAddress(p.address);
                if (!res.ok) {
                    notify.push({
                        title: 'Payer',
                        description: `${p.name}: ${res.error}`,
                        category: 'error',
                    });
                    return;
                }
                resolved.push(res.address);
            }

            // Prevent splitting "between yourself" and avoid duplicates.
            const you = walletStore.address?.toLowerCase();
            if (!you) return;
            for (let i = 1; i < resolved.length; i++) {
                if (resolved[i].toLowerCase() === you) {
                    notify.push({
                        title: 'Payer',
                        description: 'You can’t add your own address as an “Other” payer.',
                        category: 'error',
                    });
                    return;
                }
            }
            const seen = new Set<string>();
            for (const a of resolved) {
                const k = a.toLowerCase();
                if (seen.has(k)) {
                    notify.push({
                        title: 'Payer',
                        description: 'Each payer must be unique (no duplicates).',
                        category: 'error',
                    });
                    return;
                }
                seen.add(k);
            }

            const payers = resolved;

            if (payers.length > PAYMENT_MAX_PAYER_COUNT) {
                notify.push({
                    title: 'Too many payers',
                    description: `You can add at most ${PAYMENT_MAX_OTHER_PAYERS} other payers (${PAYMENT_MAX_PAYER_COUNT} people total).`,
                    category: 'error',
                });
                return;
            }

            dataStore.setData({ ...baseData, amounts: amounts, payers: payers });

            notify.push({
                title: "Changes saved!",
                description: "Payment split among " + payers.length + " payers.",
                category: "success"
            });

            emit('confirmed', { payers, amounts });
            emit('close');
        })
        .finally(() => {
            resolving.value = false;
        });
};

const addPayer = () => {
    if (unsavedPayers.value.length >= PAYMENT_MAX_PAYER_COUNT) return;
    unsavedPayers.value.push({
        name: `Other ${unsavedPayers.value.length}`,
        address: "",
        percent: 0,
        amount: 0,
        disabled: false
    });
    recalcDerivedAmounts();
};

const removePayer = (index: number) => {
    unsavedPayers.value.splice(index, 1);
    recalcDerivedAmounts();
};

watch(unsavedPayers, () => {
    const pctSum = unsavedPayers.value.reduce((a, b) => a + (Number.isFinite(b.percent) ? b.percent : 0), 0);
    const allOk =
        unsavedPayers.value.every((signer, idx) => signer.name.length >= 1 && signer.address.trim().length >= 2 && (idx === 0 ? signer.percent >= 0 : signer.percent > 0))
        && Math.abs(pctSum - 100) < 0.0001;
    isValid.value = allOk;
}, { deep: true });

function maxPercentForIndex(index: number): number {
    if (index === 0) return 100;
    const sumOtherOthers = unsavedPayers.value.reduce((acc, p, i) => {
        if (i === 0) return acc;
        if (i === index) return acc;
        return acc + (Number.isFinite(p.percent) ? p.percent : 0);
    }, 0);
    const max = clamp(100 - sumOtherOthers, 0, 100);
    // Keep slider snapping clean: max should be a multiple of 5.
    return Math.floor(max / 5) * 5;
}

function onOtherPercentInput(index: number) {
    if (index === 0) return;
    const max = maxPercentForIndex(index);
    const p = unsavedPayers.value[index];
    const snapped = snapToStep(Number(p.percent), 5);
    p.percent = clamp(snapped, 0, max);
    // Keep "You" as the remainder.
    recalcDerivedAmounts();
}

onMounted(() => {
    if (!dataStore.data) return;
    if (!walletStore.address) return;
    if (!dataStore.data.amounts) return;

    token.value = getToken(dataStore.data.token);
    const amounts: bigint[] = dataStore.data.amounts;
    const payers: Hex[] = (dataStore.data.payers && dataStore.data.payers.length > 0) ? dataStore.data.payers : [walletStore.address];

    if (amounts.length != payers.length) {
        notify.push({
            title: "Unable to split payment",
            description: "Try again.",
            category: "error"
        });
        return;
    }

    if (payers.length > PAYMENT_MAX_PAYER_COUNT) {
        notify.push({
            title: "Too many payers",
            description: `This session has ${payers.length} payers. At most ${PAYMENT_MAX_PAYER_COUNT} are allowed (you plus up to ${PAYMENT_MAX_OTHER_PAYERS} others).`,
            category: "error",
        });
        emit('close');
        return;
    }

    const decimals = token.value?.decimals ?? 18;
    totalAmountUnits.value = amounts.reduce((a, b) => a + b, 0n);
    totalAmount.value = Number(formatUnits(totalAmountUnits.value, decimals));

    let otherIdx = 0;
    unsavedPayers.value = amounts.map((amount, index) => {
        const addr = payers[index];
        const isYou =
            !!addr &&
            !!walletStore.address &&
            addr.toLowerCase() === walletStore.address.toLowerCase();
        if (!isYou) otherIdx += 1;
        return {
            address: addr,
            percent: 0,
            amount: Number(formatUnits(amount, decimals)),
            disabled: isYou,
            name: isYou ? 'You' : `Other ${otherIdx}`
        };
    });

    // Initialize percents from existing amounts, keep "You" as remainder so we always sum to 100.
    if (totalAmountUnits.value > 0n && unsavedPayers.value.length > 0) {
        const denom = totalAmountUnits.value;
        let othersPm = 0;
        for (let i = 1; i < unsavedPayers.value.length; i++) {
            const a = amounts[i] ?? 0n;
            const pm = Number((a * 1000n) / denom); // trunc
            unsavedPayers.value[i].percent = fromPermille(pm);
            othersPm += pm;
        }
        const youPm = clamp(1000 - othersPm, 0, 1000);
        unsavedPayers.value[0].percent = fromPermille(youPm);
        recalcDerivedAmounts();
    }
});
</script>

<template>
    <div class="root" :class="{ 'root--sheet': props.variant === 'sheet' }">
        <div class="form" :class="{ 'form--sheet': props.variant === 'sheet' }">
            <div class="title">
                <div class="title-text">
                    <p>Split <span>{{ Converter.toMoney(totalAmount) }} {{ token?.symbol }}</span></p>
                    <p class="title-hint">Up to {{ PAYMENT_MAX_PAYER_COUNT }} people total — you plus at most {{
                        PAYMENT_MAX_OTHER_PAYERS }} other payers. Amounts set each row’s % of the total.</p>
                </div>

                <div class="close" @click="emit('close')">
                    <CloseIcon />
                </div>
            </div>

            <div class="scroll">
                <div v-for="(signer, index) in unsavedPayers" :key="index" class="signer_card">
                    <div class="input">
                        <div class="name">
                            <p>{{ signer.name }}</p>

                            <button v-if="index === 0 && unsavedPayers.length < PAYMENT_MAX_PAYER_COUNT"
                                @click="addPayer" class="add_signer_btn">
                                <PlusIcon />
                                <p>Add other</p>
                            </button>

                            <button v-if="index > 0" @click="removePayer(index)" class="remove_btn">
                                <TrashIcon />
                            </button>
                        </div>
                        <div class="amount-row">
                            <div class="input_field">
                                <p>%</p>
                                <input v-model.number="signer.percent" type="number" placeholder="0.0" min="0"
                                    :max="maxPercentForIndex(index)" step="5" :disabled="index === 0"
                                    @input="onOtherPercentInput(index)" />
                            </div>
                            <div class="amt-readout" aria-label="Derived amount">
                                <span class="amt-val">{{ Converter.toMoney(signer.amount) }}</span>
                                <span class="amt-lbl">{{ token?.symbol ?? '—' }}</span>
                            </div>
                        </div>
                        <div class="slider-row">
                            <input class="pct-slider" type="range" min="0" :max="maxPercentForIndex(index)" step="5"
                                v-model.number="signer.percent" :disabled="index === 0"
                                @input="onOtherPercentInput(index)" aria-label="Percentage slider" />
                            <div class="slider-meta">
                                <span>{{ signer.percent.toFixed(1) }}%</span>
                                <span v-if="index === 0" class="slider-hint">Remainder</span>
                            </div>
                        </div>
                    </div>

                    <div class="address">
                        <div class="addr-head">
                            <p>Username or address</p>
                        </div>
                        <input v-model="signer.address" type="text" :disabled="signer.disabled"
                            placeholder="0x… or @username" />
                    </div>
                </div>
            </div>

            <div v-if="totalAmount > 0" class="split-pct-bar">
                <p>
                    Allocated: <strong>{{ allocatedPercent.toFixed(1) }}%</strong> of the payment total
                    <span v-if="!isValid && allocatedPercent > 100.0001" class="split-pct-warn"> — over 100%</span>
                    <span v-else-if="!isValid && allocatedPercent < 99.999" class="split-pct-warn"> — under 100%</span>
                </p>
            </div>

            <div class="actions">
                <div class="buttons">
                    <button @click="emit('close')">
                        <EraserIcon />
                        <p>Cancel</p>
                    </button>

                    <button @click="confirm" :disabled="!isValid || resolving">
                        <CheckIcon />
                        <p>{{ resolving ? 'Resolving…' : 'Confirm' }}</p>
                    </button>
                </div>
            </div>
        </div>
    </div>

</template>

<style scoped>
.root {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    position: fixed;
    background: rgba(51, 51, 51, 0.35);
    backdrop-filter: blur(5px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px))
        max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
}

.root--sheet {
    position: static;
    inset: unset;
    background: transparent;
    backdrop-filter: none;
    z-index: auto;
    display: block;
}

.form {
    width: 100%;
    max-width: min(450px, calc(100vw - 48px));
    border-radius: var(--radius-16);
    background: var(--bg);
    overflow: hidden;
}

.form--sheet {
    width: 100%;
    border-radius: 0;
    background: transparent;
}

.title {
    padding: 24px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.title-text {
    min-width: 0;
    flex: 1;
}

.title p {
    font-size: 16px;
    color: var(--tx-normal);
}

.title p span {
    margin-left: 16px;
    color: var(--tx-semi);
}

.title-hint {
    margin-top: 8px;
    font-size: 12px !important;
    line-height: 1.45;
    color: var(--tx-dimmed) !important;
}

.split-pct-bar {
    padding: 12px 24px;
    border-top: 1px solid var(--bg-lightest);
    background: var(--bg-light);
}

.split-pct-bar p {
    margin: 0;
    font-size: 13px;
    color: var(--tx-semi);
}

.split-pct-warn {
    color: var(--primary-light, #f59e0b);
}

.amount-row {
    display: flex;
    align-items: stretch;
    gap: 12px;
}

.amount-row .input_field {
    flex: 1;
    min-width: 0;
}

.pct-readout {
    flex-shrink: 0;
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--bg-lightest);
    border-radius: var(--radius-8);
    background: var(--bg-light);
}

.amt-readout {
    flex-shrink: 0;
    width: 110px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--bg-lightest);
    border-radius: var(--radius-8);
    background: var(--bg-light);
}

.amt-val {
    font-size: 14px;
    font-weight: 600;
    color: var(--tx-normal);
    font-variant-numeric: tabular-nums;
}

.amt-lbl {
    font-size: 10px;
    color: var(--tx-dimmed);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.slider-row {
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 12px;
}

.pct-slider {
    width: 100%;
    accent-color: var(--primary);
}

.slider-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    font-size: 12px;
    color: var(--tx-semi);
    font-variant-numeric: tabular-nums;
}

.slider-hint {
    font-size: 10px;
    color: var(--tx-dimmed);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.close {
    width: 36px;
    height: 30px;
    border-radius: var(--radius-6);
    cursor: pointer;
    border: 1px solid var(--bg-lightest);
    display: flex;
    align-items: center;
    justify-content: center;
}

.scroll {
    overflow-y: auto;
    max-height: calc(100vh - 280px);
    padding: 30px;
    border-top: 1px solid var(--bg-lightest);
}

.root--sheet .scroll {
    max-height: none;
    padding: 18px 0;
}

.root--sheet .title {
    padding: 8px 0 12px;
}

.root--sheet .split-pct-bar {
    padding: 12px 0;
}

.root--sheet .actions {
    padding: 18px 0 0;
}

.root--sheet .signer_card {
    margin-bottom: 18px;
    padding-bottom: 18px;
}

.signer_card {
    border-bottom: 1px solid var(--bg-lightest);
    margin-bottom: 30px;
    padding-bottom: 30px;
}

.signer_card .name {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    margin-bottom: 24px;
}

.signer_card .name>p {
    font-size: 14px;
    color: var(--tx-semi);
}

.signer_card:last-child {
    border: none;
    margin-bottom: 0;
}

.input_field {
    display: grid;
    grid-template-columns: 72px 1fr;
    height: 44px;
    border: 1px solid var(--bg-lightest);
    border-radius: var(--radius-8);
    overflow: hidden;
}

.input_field p {
    font-size: 14px;
    color: var(--tx-semi);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-light);
    border-right: 1px solid var(--bg-lightest);
}

.input_field input {
    padding: 10px;
    background: none;
    color: var(--tx-normal);
    border-radius: var(--radius-6);
    height: 100%;
    border: none;
    outline: none;
}

.address {
    margin-top: 24px;
}

.addr-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.address p {
    font-size: 14px;
    color: var(--tx-semi);
}

.address input {
    padding: 0 10px;
    background: var(--bg-light);
    color: var(--tx-normal);
    height: 44px;
    border: 1px solid var(--bg-lightest);
    border-radius: var(--radius-6);
    width: 100%;
    outline: none;
    margin-top: 24px;
}

.add_signer_btn {
    color: var(--tx-normal);
    background: none;
    display: flex;
    align-items: center;
    gap: 8px;
}

.add_signer_btn p {
    font-size: 14px;
    color: var(--tx-normal);
}

.remove_btn {
    background: none;
    border: 1px solid var(--bg-lightest);
    border-radius: var(--radius-6);
    width: 36px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.signer_card button {
    padding: 10px;
    margin-top: 10px;
    border: none;
    cursor: pointer;
    font-size: 16px;
}

.actions {
    padding: 24px;
    background: var(--bg-light);
    border-top: 1px solid var(--bg-lightest);
}

.actions button {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-8);
    background: none;
    gap: 10px;
    width: 100%;
    border: 1px solid var(--bg-lightest);
    height: 40px;
    cursor: pointer;
}

.actions button p {
    font-size: 14px;
    color: var(--tx-semi);
}

.actions button:last-child {
    background: var(--primary);
}

.actions button:last-child p {
    color: var(--tx-normal);
}

.actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.actions .buttons {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, 1fr);
}
</style>