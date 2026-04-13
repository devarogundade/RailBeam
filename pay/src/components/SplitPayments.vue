<script setup lang="ts">
import PlusIcon from '@/components/icons/PlusIcon.vue';
import TrashIcon from '@/components/icons/TrashIcon.vue';
import { useDataStore } from '@/stores/data';
import { useWalletStore } from '@/stores/wallet';
import { useAgentsStore } from '@/stores/agents';
import { formatEther, parseEther, type Hex } from 'viem';
import { computed, onMounted, ref, watch } from 'vue';
import CloseIcon from './icons/CloseIcon.vue';
import CheckIcon from './icons/CheckIcon.vue';
import EraserIcon from './icons/EraserIcon.vue';
import { Token } from 'beam-ts/src/types';
import { getToken } from 'beam-ts/src/utils/constants';
import Converter from '@/scripts/converter';
import { PAYMENT_MAX_OTHER_PAYERS, PAYMENT_MAX_PAYER_COUNT } from '@/constants/paymentLimits';
import { notify } from '@/reactives/notify';

const emit = defineEmits(['close']);

interface Payer {
    name: string;
    address: Hex | null;
    amount: number;
    disabled: boolean;
}

const isValid = ref<boolean>(false);
const dataStore = useDataStore();
const walletStore = useWalletStore();
const agentsStore = useAgentsStore();
const unsavedPayers = ref<Payer[]>([]);
const totalAmount = ref<number>(0);
const token = ref<Token | undefined>(undefined);

const starredAgents = computed(() => agentsStore.starredAgents);
const agentPickerOpen = ref(false);
const agentPickerRowIdx = ref<number | null>(null);

const allocatedPercent = computed(() => {
    if (totalAmount.value <= 0) return 0;
    const sum = unsavedPayers.value.reduce((a, p) => a + p.amount, 0);
    return (sum / totalAmount.value) * 100;
});

function sharePercent(amt: number): string {
    if (totalAmount.value <= 0 || amt < 0) return '0.0';
    const pct = (amt / totalAmount.value) * 100;
    return pct.toFixed(1);
}

const confirm = () => {
    if (!walletStore.address) return;
    if (!dataStore.data) return;
    if (!isValid.value) return;

    const amounts = unsavedPayers.value.map(payer => parseEther(payer.amount.toString()));
    const payers = unsavedPayers.value.filter(payer => payer.address != null).map(payer => payer.address!);

    if (payers.length > PAYMENT_MAX_PAYER_COUNT) {
        notify.push({
            title: 'Too many payers',
            description: `You can add at most ${PAYMENT_MAX_OTHER_PAYERS} other payers (${PAYMENT_MAX_PAYER_COUNT} people total).`,
            category: 'error',
        });
        return;
    }

    dataStore.setData({ ...dataStore.data, amounts: amounts, payers: payers });

    notify.push({
        title: "Changes saved!",
        description: "Payment split among " + payers.length + " payers.",
        category: "success"
    });

    emit('close');
};

const addPayer = () => {
    if (unsavedPayers.value.length >= PAYMENT_MAX_PAYER_COUNT) return;
    unsavedPayers.value.push({
        name: `Other ${unsavedPayers.value.length}`,
        address: null,
        amount: 0,
        disabled: false
    });
};

function openAgentPicker(rowIdx: number) {
    agentPickerRowIdx.value = rowIdx;
    agentPickerOpen.value = true;
}

function applyAgentToRow(agentWallet: Hex) {
    if (agentPickerRowIdx.value == null) return;
    const idx = agentPickerRowIdx.value;
    if (!unsavedPayers.value[idx]) return;
    unsavedPayers.value[idx] = {
        ...unsavedPayers.value[idx],
        address: agentWallet,
    };
    agentPickerOpen.value = false;
    agentPickerRowIdx.value = null;
}

const removePayer = (index: number) => {
    unsavedPayers.value.splice(index, 1);
};

watch(unsavedPayers, () => {
    isValid.value =
        unsavedPayers.value.every(signer => signer.name.length >= 1 && signer.address?.length === 42 && signer.amount > 0)
        && unsavedPayers.value.reduce((a, b) => a + b.amount, 0) == totalAmount.value;
}, { deep: true });

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

    totalAmount.value = Number(
        formatEther(amounts.reduce((a, b) => a + b, BigInt(0)))
    );

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
            amount: Number(formatEther(amount)),
            disabled: isYou,
            name: isYou ? 'You' : `Other ${otherIdx}`
        };
    });

    isValid.value =
        unsavedPayers.value.every(signer => signer.name.length >= 1 && signer.address?.length === 42 && signer.amount > 0)
        && unsavedPayers.value.reduce((a, b) => a + b.amount, 0) == totalAmount.value;
});
</script>

<template>
    <div class="overlay">
        <div class="form">
            <div class="title">
                <div class="title-text">
                    <p>Split payment <span>{{ Converter.toMoney(totalAmount) }} {{ token?.symbol }}</span></p>
                    <p class="title-hint">Up to {{ PAYMENT_MAX_PAYER_COUNT }} people total — you plus at most {{ PAYMENT_MAX_OTHER_PAYERS }} other payers. Amounts set each row’s % of the total.</p>
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

                            <button v-if="index === 0 && unsavedPayers.length < PAYMENT_MAX_PAYER_COUNT" @click="addPayer"
                                class="add_signer_btn">
                                <PlusIcon />
                                <p>Add other</p>
                            </button>

                            <button v-if="index > 0" @click="removePayer(index)" class="remove_btn">
                                <TrashIcon />
                            </button>
                        </div>
                        <div class="amount-row">
                            <div class="input_field">
                                <p>Amount</p>
                                <input v-model.number="signer.amount" type="number" placeholder="0.00" min="0"
                                    step="any" />
                            </div>
                            <div class="pct-readout" aria-label="Share of total">
                                <span class="pct-val">{{ sharePercent(signer.amount) }}%</span>
                                <span class="pct-lbl">of total</span>
                            </div>
                        </div>
                    </div>

                    <div class="address">
                        <div class="addr-head">
                            <p>Address</p>
                            <button
                                v-if="index > 0 && starredAgents.length"
                                type="button"
                                class="pick-agent"
                                @click="openAgentPicker(index)"
                            >
                                Pick agent
                            </button>
                        </div>
                        <input v-model="signer.address" type="text" :disabled="signer.disabled"
                            placeholder="Wallet Address" />
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

                    <button @click="confirm" :disabled="!isValid">
                        <CheckIcon />
                        <p>Confirm</p>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="agentPickerOpen" class="picker" role="dialog" aria-modal="true" aria-label="Pick agent">
        <div class="picker-card">
            <div class="picker-head">
                <p class="picker-title">Starred agents</p>
                <button type="button" class="picker-close" @click="agentPickerOpen = false">Close</button>
            </div>
            <p v-if="!starredAgents.length" class="picker-muted">Star agents in the Agents tab to pick them here.</p>
            <div v-else class="picker-list">
                <button
                    v-for="a in starredAgents"
                    :key="a.id"
                    type="button"
                    class="picker-row"
                    :disabled="!a.agentWallet"
                    @click="a.agentWallet && applyAgentToRow(a.agentWallet)"
                >
                    <div class="picker-main">
                        <p class="picker-name">{{ a.name }}</p>
                        <p class="picker-sub">
                            <span v-if="a.agentWallet">{{ a.agentWallet }}</span>
                            <span v-else>Missing agent wallet</span>
                        </p>
                    </div>
                    <span class="picker-cta">Use</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.overlay {
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
}

.form {
    width: 450px;
    border-radius: var(--radius-16);
    background: var(--bg);
    overflow: hidden;
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

.pct-val {
    font-size: 14px;
    font-weight: 600;
    color: var(--tx-normal);
    font-variant-numeric: tabular-nums;
}

.pct-lbl {
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

.pick-agent {
    height: 28px;
    padding: 0 10px;
    border-radius: var(--radius-6);
    background: rgba(245, 95, 20, 0.12);
    border: 1px solid rgba(245, 95, 20, 0.35);
    color: var(--primary-light);
    font-size: 12px;
    cursor: pointer;
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

.picker {
    position: fixed;
    inset: 0;
    z-index: 120;
    background: rgba(51, 51, 51, 0.35);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
}

.picker-card {
    width: min(520px, 100%);
    border-radius: var(--radius-16);
    background: var(--bg);
    border: 1px solid var(--bg-lightest);
    overflow: hidden;
}

.picker-head {
    padding: 16px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--bg-lightest);
    background: var(--bg-light);
}

.picker-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--tx-normal);
}

.picker-close {
    height: 32px;
    padding: 0 12px;
    border-radius: var(--radius-8);
    border: 1px solid var(--bg-lightest);
    background: transparent;
    color: var(--tx-semi);
    cursor: pointer;
}

.picker-muted {
    margin: 0;
    padding: 16px 18px;
    font-size: 13px;
    color: var(--tx-dimmed);
}

.picker-list {
    padding: 10px 12px 14px;
    display: grid;
    gap: 10px;
}

.picker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    border-radius: var(--radius-12);
    border: 1px solid var(--bg-lightest);
    background: rgba(0, 0, 0, 0.12);
    color: var(--tx-normal);
    padding: 12px 12px;
    cursor: pointer;
    text-align: left;
}

.picker-row:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.picker-main {
    min-width: 0;
    flex: 1;
}

.picker-name {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
}

.picker-sub {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--tx-dimmed);
    word-break: break-all;
}

.picker-cta {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    color: var(--primary-light);
}
</style>