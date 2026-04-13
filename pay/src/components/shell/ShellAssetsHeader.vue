<script setup lang="ts">
import AppFrame from "@/components/layout/AppFrame.vue";
</script>

<template>
  <header class="shell-head sticky-top">
    <AppFrame :topInset="false">
      <div class="shell-head__inner">
        <h1 class="shell-head__title">Assets</h1>
        <p class="shell-head__copy">Tokens available for payments (demo balances).</p>
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

.shell-head__title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin: 0 0 8px;
  color: var(--tx-normal);
}

.shell-head__copy {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--tx-dimmed);
}
</style>
