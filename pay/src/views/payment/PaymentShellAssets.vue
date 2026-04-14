<script setup lang="ts">
import { computed } from "vue";
import { getTokens } from "beam-ts/src/utils/constants";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants/ui";

/** Trust Wallet CDN — works without local copies for common ERC-20s */
const USDC_ICON =
  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png";

type AssetRow = { sym: string; name: string; bal: string; fiat: string; image: string };

const assets = computed((): AssetRow[] => {
  const fromChain: AssetRow[] = getTokens.map((t) => ({
    sym: t.symbol,
    name: t.name,
    bal: "—",
    fiat: "—",
    image: t.image || DEFAULT_PLACEHOLDER_IMAGE,
  }));
  // Include a USDC icon if it exists in `getTokens` (no synthetic extras).
  return fromChain.map((a) =>
    a.sym === "USDC" && (!a.image || a.image === DEFAULT_PLACEHOLDER_IMAGE)
      ? { ...a, image: USDC_ICON }
      : a
  );
});
</script>

<template>
  <section class="panel">
    <ul class="asset-list">
      <li v-for="a in assets" :key="a.sym" class="asset">
        <img class="asset-ico" :src="a.image" width="42" height="42" alt="" />
        <div>
          <p class="asset-name">{{ a.name }}</p>
          <p class="asset-bal">{{ a.bal }} {{ a.sym }}</p>
        </div>
        <p class="asset-fiat">{{ a.fiat }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  padding: 12px 0 max(28px, env(safe-area-inset-bottom, 0px));
  color: var(--tx-normal);
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
  background: var(--bg-light);
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
}

.asset:active {
  transform: scale(0.995);
  opacity: 0.96;
}
.asset-ico {
  border-radius: var(--radius-12);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
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
}
</style>
