<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    immersive?: boolean;
    topInset?: boolean;
    sideInsets?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    immersive: false,
    topInset: true,
    sideInsets: true,
    fullWidth: false,
  }
);

const frameClass = computed(() => ({
  "app-frame--immersive": props.immersive,
  "app-frame--no-top": !props.topInset,
  "app-frame--no-sides": !props.sideInsets,
  "app-frame--full-width": props.fullWidth,
}));
</script>

<template>
  <div class="app-frame" :class="frameClass">
    <div class="app-frame__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-frame {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(var(--app-column-max, 430px), 100%);
  min-height: 0;
  margin: 0 auto;
  box-sizing: border-box;
  container-type: inline-size;
  container-name: app-frame;
  padding-top: env(safe-area-inset-top, 0px);
  padding-left: max(12px, env(safe-area-inset-left, 0px));
  padding-right: max(12px, env(safe-area-inset-right, 0px));
  overflow-x: clip;
  color: var(--tx-normal);
}

.app-frame--full-width {
  max-width: none;
}

.app-frame--no-top {
  padding-top: 0;
}

.app-frame--no-sides {
  padding-left: 0;
  padding-right: 0;
}

.app-frame--immersive {
  max-width: none;
  min-height: 100dvh;
  height: 100dvh;
  max-height: 100dvh;
  padding-top: 0;
  padding-left: 0;
  padding-right: 0;
  padding-bottom: 0;
  background: #000;
  overflow: hidden;
}

.app-frame__body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-frame--immersive .app-frame__body {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
</style>
