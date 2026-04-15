<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { getTokens } from '@railbeam/beam-ts';
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants/ui";
import { useWalletStore } from "@/stores/wallet";
import { TokenContract } from "@/scripts/erc20";
import { formatUnits, type Hex } from "viem";
import Converter from "@/scripts/converter";

type AssetRow = { sym: string; name: string; bal: string; fiat: string; image: string; };

const walletStore = useWalletStore();
const balances = ref<Record<string, number>>({});
const loading = ref<boolean>(false);

async function refreshBalances() {
  const addr = walletStore.address as Hex | null;
  if (!addr) {
    balances.value = {};
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const entries = await Promise.all(
      getTokens.map(async (t) => {
        const raw = await TokenContract.getTokenBalance(t.address as Hex, addr);
        const n = Number(formatUnits(raw, t.decimals));
        return [t.address, Number.isFinite(n) ? n : 0] as const;
      }),
    );
    balances.value = Object.fromEntries(entries);
  } finally {
    loading.value = false;
  }
}

watch(
  () => walletStore.address,
  () => refreshBalances(),
  { immediate: true },
);

onMounted(() => {
  refreshBalances();
});

const assets = computed((): AssetRow[] => {
  return getTokens.map((t) => ({
    sym: t.symbol,
    name: t.name,
    bal:
      !walletStore.address ? "—" : loading.value ? "…" : Converter.toMoney(balances.value[t.address] ?? 0),
    fiat:
      !walletStore.address
        ? "—"
        : loading.value
          ? "—"
          : `≈ $${Converter.toMoney((t.price ?? 0) * (balances.value[t.address] ?? 0))}`,
    image: t.image || DEFAULT_PLACEHOLDER_IMAGE,
  }));
});

function onTokenImgError(e: Event) {
  const el = e.target as HTMLImageElement;
  el.src = DEFAULT_PLACEHOLDER_IMAGE;
}
</script>

<template>
  <p class="muted">Tokens available for payments.</p>
  <ul class="asset-list">
    <li v-for="a in assets" :key="a.sym" class="asset">
      <img class="asset-ico" :src="a.image" width="42" height="42" alt="" @error="onTokenImgError" />
      <div class="asset-main">
        <p class="asset-name">{{ a.name }}</p>
        <p class="asset-bal">{{ a.bal }} {{ a.sym }}</p>
      </div>
      <p class="asset-fiat">{{ a.fiat }}</p>
    </li>
  </ul>
</template>

<style scoped>
.muted {
  font-size: 14px;
  line-height: 1.5;
  color: var(--tx-dimmed);
  margin-bottom: 14px;
}

.asset-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.asset {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 14px 16px;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: var(--bg);
}

.asset:active {
  transform: scale(0.995);
  opacity: 0.96;
}

.asset-ico {
  border-radius: var(--radius-12);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  flex-shrink: 0;
}

.asset-main {
  min-width: 0;
}

.asset-name {
  font-size: 14px;
  font-weight: 500;
}

.asset-bal {
  font-size: 12px;
  color: var(--tx-dimmed);
  margin-top: 2px;
}

.asset-fiat {
  margin-left: auto;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
</style>
