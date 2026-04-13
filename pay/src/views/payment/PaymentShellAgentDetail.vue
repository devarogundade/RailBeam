<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAgentsStore } from "@/stores/agents";
import { AGENT_AVATAR_DEFAULT } from "@/constants/ui";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import BottomSheet from "@/components/mobile/BottomSheet.vue";
import Converter from "@/scripts/converter";
import AppFrame from "@/components/layout/AppFrame.vue";

const route = useRoute();
const router = useRouter();
const agentsStore = useAgentsStore();

const agentId = computed(() => String(route.params.id ?? ""));
const agent = computed(() => agentsStore.getAgent(agentId.value));

const draft = ref("");
const endEl = ref<HTMLElement | null>(null);
const infoOpen = ref(false);

const messages = computed(() => agentsStore.getChat(agentId.value));

function send() {
  const text = draft.value.trim();
  if (!text) return;
  agentsStore.sendMessage(agentId.value, text);
  draft.value = "";
}

async function scrollToBottom() {
  await nextTick();
  endEl.value?.scrollIntoView({ behavior: "smooth", block: "end" });
}

watch(
  () => messages.value.length,
  async () => {
    await scrollToBottom();
  }
);
</script>

<template>
  <div v-if="agent" class="page">
    <header class="top sticky-top">
      <AppFrame :topInset="false">
        <div class="top__inner">
          <button type="button" class="icon-btn" aria-label="Back" @click="router.back()">
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            class="title"
            aria-label="Open agent details"
            @click="infoOpen = true"
          >
            <img class="avatar" :src="agent.image || AGENT_AVATAR_DEFAULT" width="34" height="34" alt="" />
            <div class="title-txt">
              <p class="name">{{ agent.name }}</p>
              <p class="sub">Chat</p>
            </div>
          </button>
          <button
            type="button"
            class="star"
            :class="{ on: agentsStore.isStarred(agent.id) }"
            @click="agentsStore.toggleStar(agent.id)"
          >
            <span class="star-ico" />
          </button>
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <div class="wrap">
        <div class="msgs" aria-label="Chat messages">
          <div class="intro">
            <p class="intro-title">Chat</p>
            <p class="intro-copy">
              Ask this agent to discover others, negotiate x402 payments, or propose a split for a specific
              article/video.
            </p>
          </div>

          <div v-for="m in messages" :key="m.id" class="bubble" :class="m.direction === 'out' ? 'out' : 'in'">
            <p class="txt">{{ m.text }}</p>
          </div>
          <div ref="endEl" aria-hidden="true" />
        </div>

        <form class="composer" @submit.prevent="send">
          <input v-model="draft" class="input" type="text" placeholder="Message…" />
          <button type="submit" class="send" :disabled="!draft.trim()">Send</button>
        </form>
      </div>
    </AppFrame>

    <BottomSheet v-model="infoOpen" title="Agent details">
      <div class="info">
        <div class="info-top">
          <img class="info-avatar" :src="agent.image || AGENT_AVATAR_DEFAULT" width="56" height="56" alt="" />
          <div class="info-main">
            <p class="info-name">{{ agent.name }}</p>
            <p class="info-desc">{{ agent.description }}</p>
          </div>
        </div>

        <section class="kv" aria-label="Agent status">
          <div class="kv-row">
            <span class="k">Active</span>
            <span class="v">Yes</span>
          </div>
          <div class="kv-row">
            <span class="k">Supported trust</span>
            <span class="v">Reputation</span>
          </div>
          <div class="kv-row">
            <span class="k">Description</span>
            <span class="v">{{ agent.description }}</span>
          </div>
        </section>

        <section class="feedback" aria-label="Feedback">
          <p class="feedback-k">Feedback</p>
          <p class="feedback-copy">All user feedback for this agent will appear here.</p>
        </section>
      </div>
    </BottomSheet>
  </div>

  <section v-else class="missing">
    <p>Agent not found.</p>
    <button type="button" class="back" @click="router.push({ name: 'payment-agents' })">Back to Agents</button>
  </section>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 120px);
  padding: 12px 0 max(16px, env(safe-area-inset-bottom, 0px));
  color: var(--tx-normal);
}

.top {
  padding-bottom: 10px;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  position: sticky;
  top: 0;
  z-index: 30;
  margin-top: 0;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 0 10px;
  background: var(--frost-bg, rgba(22, 22, 24, 0.78));
  backdrop-filter: blur(24px) saturate(1.65);
  -webkit-backdrop-filter: blur(24px) saturate(1.65);
}

.top__inner {
  display: grid;
  grid-template-columns: 72px 1fr 54px;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.icon-btn {
  width: var(--native-tap, 44px);
  height: var(--native-tap, 44px);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(36, 36, 38, 0.95);
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
  cursor: pointer;
}

.icon-btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}

.title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 4px 6px;
  margin: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-12);
  -webkit-tap-highlight-color: transparent;
}

.title:active {
  opacity: 0.92;
  transform: scale(0.995);
}

.avatar {
  border-radius: 12px;
  border: 1px solid var(--bg-lightest);
  object-fit: cover;
  flex-shrink: 0;
}

.title-txt {
  min-width: 0;
}

.name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--tx-dimmed);
  font-weight: 700;
}

.star {
  width: 44px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.12);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.star-ico {
  width: 16px;
  height: 16px;
  display: block;
  background: currentColor;
  clip-path: polygon(50% 0%,
      61% 35%,
      98% 35%,
      68% 57%,
      79% 91%,
      50% 70%,
      21% 91%,
      32% 57%,
      2% 35%,
      39% 35%);
  color: rgba(255, 255, 255, 0.55);
}

.star.on .star-ico {
  color: rgba(245, 95, 20, 0.95);
}

.msgs {
  flex: 1 1 auto;
  padding: 14px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.intro {
  padding: 12px 14px;
  border-radius: var(--radius-14);
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.14);
  margin-bottom: 4px;
}

.intro-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.intro-copy {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--tx-semi);
}

.bubble {
  max-width: 86%;
  padding: 11px 12px;
  border-radius: 16px;
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.18);
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
}

.bubble.in {
  align-self: flex-start;
  border-top-left-radius: 10px;
}

.bubble.out {
  align-self: flex-end;
  background: rgba(245, 95, 20, 0.12);
  border-color: rgba(245, 95, 20, 0.35);
  border-top-right-radius: 10px;
}

.txt {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--tx-normal);
  white-space: pre-wrap;
  word-break: break-word;
}

.composer {
  display: grid;
  grid-template-columns: 1fr 78px;
  gap: 10px;
  padding-top: 10px;
  border-top: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  position: sticky;
  bottom: 0;
  z-index: 20;
  margin-bottom: calc(-16px - env(safe-area-inset-bottom, 0px));
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
  background: var(--frost-bg, rgba(22, 22, 24, 0.78));
  backdrop-filter: blur(24px) saturate(1.65);
  -webkit-backdrop-filter: blur(24px) saturate(1.65);
}

.input {
  height: 46px;
  border-radius: 14px;
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.16);
  color: var(--tx-normal);
  padding: 0 14px;
  outline: none;
}

.send {
  height: 46px;
  border: none;
  border-radius: 14px;
  background: var(--primary);
  color: var(--tx-normal);
  font-weight: 800;
  cursor: pointer;
}

.send:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.missing {
  padding: 18px max(4px, env(safe-area-inset-left, 0px)) max(28px, env(safe-area-inset-bottom, 0px)) max(4px, env(safe-area-inset-right, 0px));
  color: var(--tx-normal);
}

.info {
  display: grid;
  gap: 14px;
  color: var(--tx-normal);
}

.info-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-avatar {
  border-radius: var(--radius-14);
  border: 1px solid var(--bg-lightest);
  object-fit: cover;
  flex-shrink: 0;
}

.info-main {
  min-width: 0;
}

.info-name {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.info-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--tx-semi);
}

.kv {
  border: 1px solid var(--bg-lightest);
  border-radius: var(--radius-14);
  background: rgba(0, 0, 0, 0.12);
  padding: 12px 12px;
  display: grid;
  gap: 10px;
}

.kv-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  align-items: start;
}

.k {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.v {
  font-size: 13px;
  color: var(--tx-normal);
  word-break: break-word;
}

.v-mono {
  font-variant-numeric: tabular-nums;
}

.link {
  color: var(--primary-light);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.feedback {
  border: 1px solid var(--bg-lightest);
  border-radius: var(--radius-14);
  background: rgba(0, 0, 0, 0.12);
  padding: 12px 12px;
}

.feedback-k {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.feedback-copy {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--tx-semi);
}
</style>
