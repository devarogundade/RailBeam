<script setup lang="ts">
import { formatUnits } from "viem";
import { USER_AVATAR_OTHER, USER_AVATAR_SELF } from "@/constants/ui";
import type { PayerShareRow } from "@/utils/payerShares";

const props = withDefaults(
  defineProps<{
    rows: PayerShareRow[];
    symbol?: string;
    decimals?: number;
  }>(),
  { symbol: "", decimals: 18 }
);

function rowAvatar(row: PayerShareRow) {
  return row.isYou ? USER_AVATAR_SELF : USER_AVATAR_OTHER;
}

function trimZeros(v: string): string {
  if (!v.includes(".")) return v;
  return v.replace(/\.?0+$/, "");
}
</script>

<template>
  <ul v-if="rows.length > 0" class="payer-split" aria-label="Payer shares">
    <li
      v-for="row in rows"
      :key="row.key"
      :class="{ 'payer-split-you': row.isYou }"
    >
      <img class="payer-av" :src="rowAvatar(row)" alt="" width="36" height="36" />
      <div class="payer-split-main">
        <div class="payer-topline">
          <span class="payer-label">{{ row.label }}</span>
          <span
            v-if="row.status"
            class="payer-status"
            :class="row.status"
          >
            {{ row.status === "paid" ? "Paid" : "Pending" }}
          </span>
        </div>
        <span class="payer-addr">{{ row.shortAddr }}</span>
      </div>
      <div class="payer-split-meta">
        <span class="payer-amt">
          {{ trimZeros(formatUnits(row.wei, props.decimals)) }}{{ symbol ? ` ${symbol}` : "" }}
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

.payer-topline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.payer-status {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid var(--bg-lightest);
  color: var(--tx-semi);
  background: var(--bg);
  white-space: nowrap;
}

.payer-status.paid {
  border-color: rgba(80, 255, 170, 0.35);
  color: rgba(80, 255, 170, 0.85);
}

.payer-status.pending {
  border-color: rgba(255, 255, 255, 0.16);
  color: var(--tx-semi);
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
