<script setup lang="ts">
defineProps<{
  title: string;
}>();

const open = defineModel<boolean>({ default: false });

function onBackdrop() {
  open.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="open" class="root">
        <button type="button" class="backdrop" aria-label="Close" @click="onBackdrop" />
        <div class="panel" role="dialog" :aria-label="title" @click.stop>
          <div class="handle-wrap">
            <span class="handle" />
          </div>
          <h2 class="title">{{ title }}</h2>
          <div class="body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.root {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.backdrop {
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(0, 0, 0, 0.55);
  cursor: pointer;
}

.panel {
  position: relative;
  width: 100%;
  max-width: 430px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-16) var(--radius-16) 0 0;
  border: 1px solid var(--bg-lightest);
  border-bottom: none;
  background: var(--bg-light);
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0));
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45);
}

.handle-wrap {
  display: flex;
  justify-content: center;
  padding: 10px 0 6px;
}

.handle {
  width: 40px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--bg-lightest);
}

.title {
  font-size: 17px;
  font-weight: 600;
  padding: 4px 20px 14px;
  color: var(--tx-normal);
}

.body {
  padding: 0 20px 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.2s ease;
}

.sheet-fade-enter-active .panel,
.sheet-fade-leave-active .panel {
  transition: transform 0.22s ease;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

.sheet-fade-enter-from .panel,
.sheet-fade-leave-to .panel {
  transform: translateY(100%);
}
</style>
