<script setup lang="ts">
import { useRouter } from "vue-router";
import AppFrame from "@/components/layout/AppFrame.vue";

const router = useRouter();

function goNew() {
  router.push({ name: "payment-agent-new" });
}
</script>

<template>
  <header class="shell-head sticky-top">
    <AppFrame :topInset="false">
      <div class="shell-head__inner">
        <div class="shell-head__row">
          <div>
            <h1 class="shell-head__title">Agents</h1>
            <p class="shell-head__copy">Marketplace to discover and pay agents (ERC-8004 / x402).</p>
          </div>
          <button type="button" class="shell-head__cta" @click="goNew">New</button>
        </div>
      </div>
    </AppFrame>
  </header>
</template>

<style scoped>
.shell-head {
  width: 100%;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 0 12px;
  background: var(--frost-bg, rgba(22, 22, 24, 0.78));
  backdrop-filter: blur(24px) saturate(1.65);
  -webkit-backdrop-filter: blur(24px) saturate(1.65);
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.shell-head__inner {
  width: 100%;
}

.shell-head__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.shell-head__title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--tx-normal);
}

.shell-head__copy {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--tx-dimmed);
}

.shell-head__cta {
  height: 40px;
  padding: 0 14px;
  border-radius: var(--radius-10);
  border: 1px solid var(--bg-lightest);
  background: var(--primary);
  color: var(--tx-normal);
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}
</style>
