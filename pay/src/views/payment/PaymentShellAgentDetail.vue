<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import BottomSheet from "@/components/mobile/BottomSheet.vue";
import AppFrame from "@/components/layout/AppFrame.vue";
import { AGENT_AVATAR_DEFAULT } from "@/constants/ui";
import { agentCardFromUri, agentDisplayDescription, agentDisplayName } from "@/scripts/agentCard";
import { useBeamAgentByAgentId } from "@/composables/useBeamAgentQueries";
import { useMutation } from "@tanstack/vue-query";
import { getClientApi, type AgentChatResponse } from "@/scripts/clientApi";
import { useWalletStore } from "@/stores/wallet";
import { appendChatBubble, loadChatBubbles } from "@/scripts/chatHistoryDb";

type ChatBubble = {
  id: string;
  direction: "in" | "out";
  text: string;
  computeVerified?: boolean;
  chatId?: string;
};

const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();

const agentIdParam = computed(() => String(route.params.agentId ?? ""));
const agentQuery = useBeamAgentByAgentId(agentIdParam);
const agent = computed(() => agentQuery.data.value);
const card = computed(() => agentCardFromUri(agent.value?.uri ?? null));

const trustList = computed(() => card.value?.supportedTrust?.filter(Boolean) ?? []);
const services = computed(() => card.value?.services?.filter((s) => s?.name || s?.endpoint || s?.version) ?? []);

const infoOpen = ref(false);
const draft = ref("");
const endEl = ref<HTMLElement | null>(null);
const bubbles = ref<ChatBubble[]>([]);

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const threadKey = computed(() => {
  const agentId = agentIdParam.value.trim();
  const userAddress = (walletStore.address ?? "anon").toLowerCase();
  return `${agentId}::${userAddress}`;
});

async function restoreThread() {
  const agentId = agentIdParam.value.trim();
  if (!agentId) return;
  const userAddress = (walletStore.address ?? "anon").toLowerCase();
  const persisted = await loadChatBubbles({ agentId, userAddress, limit: 200 });
  bubbles.value = persisted.map((b) => ({
    id: b.id,
    direction: b.direction,
    text: b.text,
    computeVerified: b.computeVerified,
    chatId: b.chatId,
  }));
}

const chatMutation = useMutation({
  mutationFn: async (message: string): Promise<AgentChatResponse> => {
    const agentId = Number(agentIdParam.value);
    return getClientApi().chatWithAgent({
      agentId,
      message,
      userAddress: walletStore.address ?? undefined,
    });
  },
});

async function scrollToBottom() {
  await nextTick();
  endEl.value?.scrollIntoView({ behavior: "smooth", block: "end" });
}

watch(
  () => bubbles.value.length,
  async () => {
    await scrollToBottom();
  }
);

async function send() {
  const text = draft.value.trim();
  if (!text || chatMutation.isPending.value) return;
  draft.value = "";

  const outBubble: ChatBubble = { id: uid("out"), direction: "out", text };
  bubbles.value = [...bubbles.value, outBubble];
  await appendChatBubble({
    agentId: agentIdParam.value.trim(),
    userAddress: (walletStore.address ?? "anon").toLowerCase(),
    bubble: outBubble,
  });
  await scrollToBottom();

  const res: AgentChatResponse = await chatMutation.mutateAsync(text).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    return { type: "text", content: msg, error: msg } as AgentChatResponse;
  });

  const inBubble: ChatBubble = {
    id: uid("in"),
    direction: "in",
    text: res.content || "—",
    computeVerified: typeof res.compute?.verified === "boolean" ? res.compute.verified : undefined,
    chatId: res.compute?.chatId || undefined,
  };

  bubbles.value = [...bubbles.value, inBubble];
  await appendChatBubble({
    agentId: agentIdParam.value.trim(),
    userAddress: (walletStore.address ?? "anon").toLowerCase(),
    bubble: inBubble,
  });
}

const invalidId = computed(() => {
  const n = Number(agentIdParam.value);
  return !!agentIdParam.value && !Number.isFinite(n);
});

onMounted(async () => {
  await restoreThread();
});

watch(
  () => threadKey.value,
  async () => {
    await restoreThread();
  }
);
</script>

<template>
  <div class="page">
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
            :disabled="!agent"
            @click="infoOpen = true"
          >
            <img class="avatar" :src="agentCardFromUri(agent?.uri ?? null)?.image || AGENT_AVATAR_DEFAULT" width="34" height="34" alt="" />
            <div class="title-txt">
              <p class="name">{{ agent ? agentDisplayName(agent) : "Agent" }}</p>
              <p class="sub">Chat</p>
            </div>
          </button>
          <span class="sp" />
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <div class="wrap">
        <p v-if="invalidId" class="warn">Invalid agent id.</p>
        <p v-else-if="agentQuery.isFetching.value && !agent" class="muted">Loading…</p>
        <p v-else-if="!agent" class="warn">Agent not found.</p>

        <div v-else class="msgs" aria-label="Chat messages">
          <div class="intro">
            <p class="intro-title">Chat</p>
            <p class="intro-copy">Ask the agent anything.</p>
          </div>

          <div v-for="m in bubbles" :key="m.id" class="bubble" :class="m.direction === 'out' ? 'out' : 'in'">
            <p class="txt">{{ m.text }}</p>
            <div v-if="m.direction === 'in' && (typeof m.computeVerified === 'boolean' || m.chatId)" class="meta">
              <span v-if="typeof m.computeVerified === 'boolean'" class="meta-pill" :class="m.computeVerified ? 'ok' : 'bad'">
                {{ m.computeVerified ? "Compute verified" : "Compute unverified" }}
              </span>
              <span v-if="m.chatId" class="meta-kv">
                <span class="meta-k">chatId</span>
                <span class="meta-v v-mono">{{ m.chatId }}</span>
              </span>
            </div>
          </div>
          <div ref="endEl" aria-hidden="true" />
        </div>

        <form class="composer" @submit.prevent="send">
          <input v-model="draft" class="input" type="text" placeholder="Message…" :disabled="!agent" />
          <button type="submit" class="send" :disabled="!agent || !draft.trim() || chatMutation.isPending.value">
            {{ chatMutation.isPending.value ? "…" : "Send" }}
          </button>
        </form>
      </div>
    </AppFrame>

    <BottomSheet v-model="infoOpen" title="Agent details">
      <div v-if="agent" class="info">
        <div class="info-top">
          <img class="info-avatar" :src="agentCardFromUri(agent.uri)?.image || AGENT_AVATAR_DEFAULT" width="56" height="56" alt="" />
          <div class="info-main">
            <p class="info-name">{{ agentDisplayName(agent) }}</p>
            <p class="info-desc">{{ agentDisplayDescription(agent) }}</p>
          </div>
        </div>

        <section class="kv" aria-label="Agent status">
          <div class="kv-row">
            <span class="k">Agent id</span>
            <span class="v v-mono">#{{ agent.agentId.toString() }}</span>
          </div>
          <div class="kv-row">
            <span class="k">Owner</span>
            <span class="v v-mono">{{ agent.owner }}</span>
          </div>
          <div class="kv-row">
            <span class="k">Agent wallet</span>
            <span class="v v-mono">{{ agent.agentWallet ?? "—" }}</span>
          </div>
          <div class="kv-row">
            <span class="k">Card active</span>
            <span class="v">{{ typeof card?.active === "boolean" ? (card.active ? "Yes" : "No") : "—" }}</span>
          </div>
          <div class="kv-row">
            <span class="k">x402</span>
            <span class="v">{{ typeof card?.x402Support === "boolean" ? (card.x402Support ? "Supported" : "Not supported") : "—" }}</span>
          </div>
        </section>

        <section v-if="trustList.length" class="kv" aria-label="Supported trust">
          <div class="kv-row">
            <span class="k">Trust</span>
            <span class="v">{{ trustList.join(", ") }}</span>
          </div>
        </section>

        <section v-if="services.length" class="kv" aria-label="Services">
          <div class="kv-row">
            <span class="k">Services</span>
            <span class="v"> </span>
          </div>
          <div v-for="(s, idx) in services" :key="idx" class="svc">
            <p class="svc-name">{{ s.name || "Service" }}</p>
            <p v-if="s.endpoint" class="svc-sub v-mono">{{ s.endpoint }}</p>
            <p v-if="s.version" class="svc-sub">v{{ s.version }}</p>
          </div>
        </section>

        <section class="kv" aria-label="Raw card">
          <div class="kv-row">
            <span class="k">URI</span>
            <span class="v v-mono v-pre">{{ agent.uri || "—" }}</span>
          </div>
        </section>
      </div>
    </BottomSheet>
  </div>
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
  grid-template-columns: 40px 1fr 40px;
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
.title:disabled {
  cursor: default;
  opacity: 0.8;
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
.meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.meta-pill {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--bg-lightest);
  background: rgba(255, 255, 255, 0.06);
  color: var(--tx-semi);
}
.meta-pill.ok {
  border-color: rgba(76, 217, 100, 0.35);
  background: rgba(76, 217, 100, 0.12);
  color: rgba(190, 255, 205, 0.95);
}
.meta-pill.bad {
  border-color: rgba(255, 59, 48, 0.35);
  background: rgba(255, 59, 48, 0.12);
  color: rgba(255, 200, 197, 0.95);
}
.meta-kv {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  font-size: 12px;
  color: var(--tx-dimmed);
}
.meta-k {
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 10px;
  color: var(--tx-dimmed);
}
.meta-v {
  color: var(--tx-semi);
  word-break: break-all;
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
.muted {
  font-size: 14px;
  color: var(--tx-dimmed);
}
.warn {
  font-size: 14px;
  color: var(--tx-semi);
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
.v-pre {
  white-space: pre-wrap;
  word-break: break-word;
}
.svc {
  padding-top: 8px;
  border-top: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}
.svc-name {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--tx-normal);
}
.svc-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--tx-semi);
}
</style>

