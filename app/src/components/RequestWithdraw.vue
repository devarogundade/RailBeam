<script setup lang="ts">
import CloseIcon from './icons/CloseIcon.vue';
import StorageImage from '@/components/StorageImage.vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { Token } from '@railbeam/beam-ts';
import { Connection } from '@/types/app';
import { useWalletStore } from '@/stores/wallet';
import { MultiSigContract } from '@/scripts/contract';
import { notify } from '@/reactives/notify';
import { isAddress, parseUnits, type Hex } from 'viem';
import Converter from '@/scripts/converter';

const emit = defineEmits(['close']);

const props = defineProps<{
  wallet: Hex;
  tokens: Token[];
  balances: Record<string, number>;
  defaultRecipient?: string | null;
}>();

const walletStore = useWalletStore();

const selectedTokenAddress = ref<string>(props.tokens?.[0]?.address ?? '0x0000000000000000000000000000000000000000');
const amount = ref<string>('');
const recipient = ref<string>(props.defaultRecipient ?? '');
const submitting = ref<boolean>(false);

const selectedToken = computed(() => props.tokens.find((t) => t.address === selectedTokenAddress.value) ?? props.tokens[0]);
const availableBalance = computed(() => (selectedToken.value ? props.balances[selectedToken.value.address] ?? 0 : 0));

const canSubmit = computed(() => {
  if (!walletStore.merchant) return false;
  if (walletStore.connection !== Connection.Wallet) return false;
  if (!selectedToken.value) return false;
  if (!recipient.value || !isAddress(recipient.value)) return false;
  const n = Number(amount.value);
  if (!Number.isFinite(n) || n <= 0) return false;
  return true;
});

const submit = async () => {
  if (!canSubmit.value) return;
  if (!selectedToken.value) return;

  submitting.value = true;
  try {
    const amt = parseUnits(amount.value, selectedToken.value.decimals);
    const txHash = await MultiSigContract.requestWithdraw(
      props.wallet,
      selectedToken.value.address as Hex,
      amt,
      recipient.value as Hex,
    );

    if (txHash) {
      notify.push({
        title: 'Withdraw requested!',
        description: 'Transaction was sent.',
        category: 'success',
        linkTitle: 'View Trx',
        linkUrl: `${import.meta.env.VITE_EXPLORER_URL}/tx/${txHash}`,
      });
      emit('close');
    } else {
      notify.push({
        title: 'Failed to request withdraw!',
        description: 'Try again',
        category: 'error',
      });
    }
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  document.body.style.overflowY = 'hidden';
});

onUnmounted(() => {
  document.body.style.overflowY = 'auto';
});
</script>

<template>
  <div class="overlay">
    <div class="box">
      <div class="title">
        <p>Request Withdraw</p>

        <div class="close" @click="emit('close')">
          <CloseIcon />
        </div>
      </div>

      <div class="subtitle">
        <p>Withdraw from your multisig merchant wallet.</p>
      </div>

      <div class="form">
        <div class="field">
          <p class="label">Asset</p>
          <div class="select_row">
            <div class="token_preview" v-if="selectedToken">
              <StorageImage :src="selectedToken.image" alt="" />
              <div class="token_text">
                <p>{{ selectedToken.symbol }}</p>
                <p class="muted">Balance: {{ Converter.toMoney(availableBalance) }}</p>
              </div>
            </div>

            <select v-model="selectedTokenAddress">
              <option v-for="t in props.tokens" :key="t.address" :value="t.address">
                {{ t.symbol }}
              </option>
            </select>
          </div>
        </div>

        <div class="field">
          <p class="label">Amount</p>
          <input v-model="amount" inputmode="decimal" type="text" placeholder="0.0" />
        </div>

        <div class="field">
          <p class="label">Recipient</p>
          <input v-model="recipient" type="text" placeholder="0x..." />
          <p class="hint" v-if="walletStore.connection !== Connection.Wallet">
            Connect your wallet to request a withdraw.
          </p>
        </div>

        <div class="actions">
          <button class="secondary" @click="emit('close')">
            <p>Cancel</p>
          </button>
          <button class="primary" :disabled="!canSubmit || submitting" @click="submit">
            <p>{{ submitting ? 'Requesting...' : 'Request Withdraw' }}</p>
          </button>
        </div>
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

.box {
  height: fit-content;
  width: 550px;
  border-radius: 16px;
  background: var(--bg);
  overflow: hidden;
}

.close {
  width: 36px;
  height: 30px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--bg-lightest);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  padding: 30px 30px 14px 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title p {
  font-size: 16px;
  color: var(--tx-normal);
}

.subtitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-light);
  padding: 14px 24px;
}

.subtitle p {
  font-size: 14px;
  color: var(--tx-semi);
}

.form {
  padding: 24px 30px 30px 30px;
  display: grid;
  gap: 18px;
}

.field .label {
  font-size: 14px;
  color: var(--tx-semi);
  margin-bottom: 10px;
}

input,
select {
  height: 44px;
  width: 100%;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  color: var(--tx-normal);
  outline: none;
}

.select_row {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 12px;
  align-items: center;
}

.token_preview {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  border-radius: 8px;
  height: 44px;
  padding: 0 12px;
}

.token_preview :deep(img) {
  width: 22px;
  height: 22px;
  border-radius: 8px;
}

.token_text p:first-child {
  font-size: 14px;
  color: var(--tx-normal);
}

.muted {
  margin-top: 2px;
  font-size: 12px;
  color: var(--tx-dimmed);
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--tx-dimmed);
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 6px;
}

button {
  height: 44px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--bg-lightest);
  background: none;
}

button p {
  font-size: 14px;
  color: var(--tx-normal);
}

.primary {
  border: none;
  background: var(--primary);
}

.primary p {
  color: white;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
