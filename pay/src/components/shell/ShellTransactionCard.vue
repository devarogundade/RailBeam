<script setup lang="ts">
import type { ShellTxRow } from "@/scripts/shellActivity";

defineProps<{
  tx: ShellTxRow;
}>();

const emit = defineEmits<{
  open: [];
}>();

function openDetail() {
  emit("open");
}
</script>

<template>
  <li
    class="tx-card"
    role="button"
    tabindex="0"
    @click="openDetail"
    @keydown.enter.prevent="openDetail"
  >
    <img class="tx-av" :src="tx.img" alt="" width="40" height="40" />
    <div class="tx-meta">
      <p class="tx-title">{{ tx.title }}</p>
      <p class="tx-sub">
        {{ tx.sub }}
        <span v-if="(tx.payers?.length ?? 0) > 1" class="tx-payers-pill">{{ tx.payers!.length }} payers</span>
        <span v-if="tx.pendingYou" class="tx-pending-pill">Pending</span>
      </p>
    </div>
    <p class="tx-amt" :class="tx.tone">{{ tx.amount }}</p>
  </li>
</template>

<style scoped>
.tx-card {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--bg-lightest);
  cursor: pointer;
}
.tx-card:active {
  background: rgba(255, 255, 255, 0.03);
}
.tx-card:focus-visible {
  outline: 2px solid var(--primary-light);
  outline-offset: -2px;
}
.tx-card:last-child {
  border-bottom: none;
}
.tx-av {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-12);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  flex-shrink: 0;
}
.tx-meta {
  flex: 1;
  min-width: 0;
}
.tx-title {
  font-size: 14px;
  font-weight: 500;
}
.tx-sub {
  font-size: 12px;
  color: var(--tx-dimmed);
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.tx-payers-pill {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid var(--bg-lightest);
  color: var(--tx-semi);
  background: var(--bg);
}

.tx-pending-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: var(--tx-semi);
  background: var(--bg);
}
.tx-amt {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.tx-amt.green {
  color: var(--accent-green);
}
.tx-amt.red {
  color: var(--accent-red);
}
</style>
