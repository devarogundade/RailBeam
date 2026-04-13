<script setup lang="ts"></script>

<template>
  <div class="checkout-shell">
    <div class="checkout-shell__inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Column width & safe areas come from the view-level `AppFrame`. */
.checkout-shell {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

.checkout-shell__inner {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  padding-top: 8px;
  padding-bottom: 24px;
}
</style>
