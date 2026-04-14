<script setup lang="ts">
import CloseIcon from '@/components/icons/CloseIcon.vue';
import StorageImage from '@/components/StorageImage.vue';
import type { Transaction, Token } from 'beam-ts';
import { TransactionType } from 'beam-ts';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { Hex } from 'viem';
import { formatUnits } from 'viem';
import Converter from '@/scripts/converter';
import { MultiSigContract } from '@/scripts/contract';
import { useWalletStore } from '@/stores/wallet';
import { Connection } from '@/types/app';

const emit = defineEmits(['close']);

const props = defineProps<{
  wallet: Hex;
  tokens: Token[];
  requests: Transaction[];
  minSigners: number;
}>();

const walletStore = useWalletStore();
const actingId = ref<string | null>(null);

const tokenByAddress = computed(() => {
  const m = new Map<string, Token>();
  for (const t of props.tokens) m.set(t.address.toLowerCase(), t);
  return m;
});

function requestIdFromTransactionId(txId: Hex): bigint | null {
  // For withdraws, the subgraph uses `merchant.concatI32(requestId)`.
  // Parse the last 4 bytes as an unsigned integer.
  const hex = txId.toString();
  if (!hex.startsWith('0x') || hex.length < 10) return null;
  const last8 = hex.slice(-8);
  const n = Number.parseInt(last8, 16);
  if (!Number.isFinite(n) || n < 0) return null;
  return BigInt(n);
}

const rows = computed(() =>
  (props.requests ?? [])
    .filter((t) => t.type === TransactionType.Send)
    .map((t) => {
      const token = tokenByAddress.value.get(t.token.toLowerCase());
      const symbol = token?.symbol ?? 'TOKEN';
      const decimals = token?.decimals ?? 18;
      const image = token?.image ?? '/images/token.png';
      const approvals = t.fulfilleds?.length ?? 0;
      const executed = (t.confirmations ?? []).some((c) => c.type === 2);
      const canExecute = !executed && approvals >= props.minSigners;
      const id = requestIdFromTransactionId(t.transactionId);

      return { t, id, symbol, decimals, image, approvals, executed, canExecute };
    }),
);

const canAct = computed(() => walletStore.connection === Connection.Wallet);

async function approve(row: (typeof rows.value)[number]) {
  if (!canAct.value) return;
  if (!row.id) return;
  actingId.value = row.t.id;
  try {
    await MultiSigContract.approveWithdraw(props.wallet, row.id);
  } finally {
    actingId.value = null;
  }
}

async function execute(row: (typeof rows.value)[number]) {
  if (!canAct.value) return;
  if (!row.id) return;
  actingId.value = row.t.id;
  try {
    await MultiSigContract.executeWithdraw(props.wallet, row.id);
  } finally {
    actingId.value = null;
  }
}

onMounted(() => {
  document.body.style.overflowY = 'hidden';
});

onUnmounted(() => {
  document.body.style.overflowY = 'auto';
});
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="panel">
      <div class="head">
        <div>
          <p class="title">Withdraw Requests</p>
          <p class="subtitle">Sign and execute pending withdrawals.</p>
        </div>

        <div class="close" @click="emit('close')">
          <CloseIcon />
        </div>
      </div>

      <div class="content">
        <div class="hint" v-if="walletStore.connection !== Connection.Wallet">
          Connect your wallet to sign and execute withdraws.
        </div>

        <div class="empty" v-if="rows.length === 0">
          <StorageImage src="/images/empty.png" alt="" />
          <p>No withdraw requests.</p>
        </div>

        <div class="list" v-else>
          <div class="row" v-for="r in rows" :key="r.t.id">
            <div class="left">
              <StorageImage :src="r.image" alt="" />
              <div class="meta">
                <p class="amount">
                  {{
                    Converter.toMoney(Number(formatUnits(r.t.amount, r.decimals)))
                  }}
                  <span>{{ r.symbol }}</span>
                </p>
                <p class="small">
                  Approvals: {{ r.approvals }} / {{ props.minSigners }}
                  <span v-if="r.executed">• Executed</span>
                </p>
              </div>
            </div>

            <div class="actions">
              <button
                class="secondary"
                :disabled="!canAct || r.executed || !r.id || actingId === r.t.id"
                @click="approve(r)"
              >
                <p>{{ actingId === r.t.id ? 'Signing...' : 'Sign' }}</p>
              </button>
              <button
                class="primary"
                :disabled="!canAct || !r.canExecute || !r.id || actingId === r.t.id"
                @click="execute(r)"
              >
                <p>{{ actingId === r.t.id ? 'Executing...' : 'Execute' }}</p>
              </button>
            </div>
          </div>
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
  z-index: 120;
}

.panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 480px;
  background: var(--bg);
  border-left: 1px solid var(--bg-lightest);
  display: flex;
  flex-direction: column;
}

.head {
  padding: 22px 22px 16px 22px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--bg-lightest);
}

.title {
  font-size: 16px;
  color: var(--tx-normal);
}

.subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--tx-semi);
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

.content {
  padding: 18px 22px 22px 22px;
  overflow: auto;
  flex: 1;
}

.hint {
  font-size: 12px;
  color: var(--tx-dimmed);
  padding: 10px 12px;
  border: 1px solid var(--bg-lightest);
  border-radius: 10px;
  background: var(--bg-light);
  margin-bottom: 14px;
}

.empty {
  margin-top: 40px;
  display: grid;
  place-items: center;
  gap: 12px;
}

.empty p {
  color: var(--tx-semi);
  font-size: 14px;
}

.list {
  display: grid;
  gap: 12px;
}

.row {
  border: 1px solid var(--bg-lightest);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.left :deep(img) {
  width: 34px;
  height: 34px;
  border-radius: 12px;
}

.amount {
  color: var(--tx-normal);
  font-size: 14px;
}

.amount span {
  color: var(--tx-semi);
}

.small {
  margin-top: 4px;
  color: var(--tx-semi);
  font-size: 12px;
}

.small span {
  color: var(--tx-dimmed);
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

button {
  height: 38px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--bg-lightest);
  background: none;
  padding: 0 12px;
}

button p {
  font-size: 13px;
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

