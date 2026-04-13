<script setup lang="ts">
import CloseIcon from './icons/CloseIcon.vue';
import SuccessIcon from './icons/SuccessIcon.vue';
import FailedIcon from './icons/FailedIcon.vue';
import OutIcon from './icons/OutIcon.vue';

import { notify } from '../reactives/notify';

const removeIndex = (index: number) => {
    notify.remove(index);
};
</script>

<template>
  <div class="notify-root" aria-live="polite" aria-relevant="additions">
    <div class="snackbars">
      <div
        v-for="(notification, index) in notify.notifications"
        :key="index"
        :class="['snackbar', notification.category]"
      >
        <div class="indicator" aria-hidden="true" />
        <SuccessIcon v-if="notification.category == 'success'" class="icon" />
        <FailedIcon v-if="notification.category == 'error'" class="icon" />
        <div class="texts">
          <h3>{{ notification.title }}</h3>
          <p>{{ notification.description }}</p>
        </div>
        <button type="button" class="close" aria-label="Dismiss" @click="removeIndex(index)">
          <CloseIcon />
        </button>

        <a
          v-if="notification.linkUrl && notification.linkUrl != '' && notification.linkUrl.startsWith('http')"
          class="link-wrap"
          target="_blank"
          rel="noopener noreferrer"
          :href="notification.linkUrl"
          @click="removeIndex(index)"
        >
          <span class="link">
            <span class="link-text">{{ notification.linkTitle }}</span>
            <OutIcon />
          </span>
        </a>

        <RouterLink
          v-else-if="notification.linkUrl && notification.linkUrl != ''"
          class="link-wrap"
          :to="notification.linkUrl"
          @click="removeIndex(index)"
        >
          <span class="link">
            <span class="link-text">{{ notification.linkTitle }}</span>
            <OutIcon />
          </span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notify-root {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
}

.snackbars {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 max(12px, env(safe-area-inset-left, 0px)) max(12px, env(safe-area-inset-bottom, 0px))
    max(12px, env(safe-area-inset-right, 0px));
  box-sizing: border-box;
  gap: 10px;
}

.snackbar {
  pointer-events: auto;
  width: 100%;
  max-width: 580px;
  box-sizing: border-box;
  background: var(--bg-lightest);
  box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.8);
  border-radius: var(--radius-4);
  padding: 16px 44px 16px 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  min-width: 0;
  animation: slide_in_up 0.2s ease-in-out;
}

.snackbar:has(.link-wrap) {
  padding-bottom: 52px;
}

.indicator {
  flex-shrink: 0;
  width: 6px;
  height: 56px;
  border-radius: var(--radius-2);
}

.success .indicator {
  background: #b5ebaf;
}

.error .indicator {
  background: #e698a6;
}

.icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-4);
  padding: 4px;
}

.success .icon {
  background: #78ff69;
}

.error .icon {
  background: var(--sm-red);
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-4);
  background: var(--bg-light);
  cursor: pointer;
  padding: 4px;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
}

.texts {
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}

.texts h3 {
  margin: 0;
  font-size: clamp(15px, 3.8vw, 16px);
  font-weight: 500;
  color: var(--tx-normal);
  line-height: 1.3;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}

.texts p {
  margin: 8px 0 0;
  font-size: clamp(13px, 3.4vw, 14px);
  line-height: 1.45;
  color: var(--tx-semi);
  word-wrap: break-word;
  overflow-wrap: anywhere;
}

.link-wrap {
  position: absolute;
  bottom: 12px;
  right: 12px;
  left: 12px;
  display: flex;
  justify-content: flex-end;
  text-decoration: none;
  max-width: calc(100% - 24px);
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  background: #fff;
  border-radius: var(--radius-4);
  padding: 0 10px;
  min-height: 30px;
  box-sizing: border-box;
}

.link-text {
  font-size: 12px;
  color: var(--primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link :deep(svg) {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

@media (min-width: 480px) {
  .snackbar {
    padding: 20px 52px 20px 16px;
    gap: 20px;
    align-items: center;
  }

  .snackbar:has(.link-wrap) {
    padding-bottom: 56px;
  }

  .close {
    top: 12px;
    right: 14px;
  }

  .texts p {
    margin-top: 10px;
  }

  .link-wrap {
    bottom: 16px;
    right: 18px;
    left: auto;
    max-width: none;
  }

  .link {
    padding: 0 12px;
  }
}

@keyframes slide_in_up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>