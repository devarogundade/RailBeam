<script setup lang="ts">
import { computed } from "vue";
import { getTokens } from "beam-ts/src/utils/constants";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants/ui";

type AssetRow = { sym: string; name: string; bal: string; fiat: string; image: string };

const assets = computed((): AssetRow[] => {
  return getTokens.map((t) => ({
    sym: t.symbol,
    name: t.name,
    bal: "0.42",
    fiat: "$1,204.00",
    image: t.image || DEFAULT_PLACEHOLDER_IMAGE,
  }));
});

function onTokenImgError(e: Event) {
  const el = e.target as HTMLImageElement;
  el.src = DEFAULT_PLACEHOLDER_IMAGE;
}
</script>

<template>
  <p class="muted">Tokens available for payments (demo balances).</p>
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

