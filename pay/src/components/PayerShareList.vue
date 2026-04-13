<script setup lang="ts">
import { formatEther } from "viem";
import { USER_AVATAR_OTHER, USER_AVATAR_SELF } from "@/constants/ui";
import type { PayerShareRow } from "@/utils/payerShares";

const props = withDefaults(
  defineProps<{
    rows: PayerShareRow[];
    symbol?: string;
  }>(),
  { symbol: "" }
);

function rowAvatar(row: PayerShareRow) {
  return row.isYou ? USER_AVATAR_SELF : USER_AVATAR_OTHER;
}
</script>

<template>
  <ul v-if="rows.length > 1" class="payer-split" aria-label="Payer shares">
    <li
      v-for="row in rows"
      :key="row.key"
      :class="{ 'payer-split-you': row.isYou }"
    >
      <img class="payer-av" :src="rowAvatar(row)" alt="" width="36" height="36" />
      <div class="payer-split-main">
        <span class="payer-label">{{ row.label }}</span>
        <span class="payer-addr">{{ row.shortAddr }}</span>
      </div>
      <div class="payer-split-meta">
        <span class="payer-amt">
          {{ Number(formatEther(row.wei)) }}{{ symbol ? ` ${symbol}` : "" }}
        </span>
        <span class="payer-pct">{{ row.pct.toFixed(1) }}%</span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.payer-split {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
}

.payer-split li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: var(--tx-normal);
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.payer-av {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-10);
  object-fit: cover;
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  flex-shrink: 0;
}

.payer-split li:last-child {
  border-bottom: none;
}

.payer-split-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.payer-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tx-semi);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.payer-split-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.payer-addr {
  font-family: ui-monospace, monospace;
  color: var(--tx-semi);
  font-size: 12px;
}

.payer-amt {
  color: var(--tx-dimmed);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.payer-pct {
  font-size: 12px;
  color: var(--tx-dimmed);
  font-variant-numeric: tabular-nums;
}

.payer-split-you {
  font-weight: 600;
}
</style>
