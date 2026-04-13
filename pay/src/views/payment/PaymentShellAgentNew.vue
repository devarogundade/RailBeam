<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import type { Hex } from "viem";
import { isAddress } from "viem";
import { useAgentsStore } from "@/stores/agents";
import { notify } from "@/reactives/notify";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import { useWalletStore } from "@/stores/wallet";
import AppFrame from "@/components/layout/AppFrame.vue";

const router = useRouter();
const agentsStore = useAgentsStore();
const walletStore = useWalletStore();

const name = ref("");
const description = ref("");
const topicsRaw = ref("money, articles, x402");
const image = ref("");
const x402Endpoint = ref("");
const agentWallet = ref<string>("");

function create() {
  const n = name.value.trim();
  const d = description.value.trim();
  if (!n || !d) {
    notify.push({
      title: "Missing info",
      description: "Name and description are required.",
      category: "error",
    });
    return;
  }

  const topics = topicsRaw.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  let wallet: Hex | undefined = undefined;
  if (agentWallet.value.trim()) {
    if (!isAddress(agentWallet.value.trim())) {
      notify.push({
        title: "Agent wallet",
        description: "Enter a valid 0x address (or leave blank).",
        category: "error",
      });
      return;
    }
    wallet = agentWallet.value.trim() as Hex;
  }

  const created = agentsStore.createAgent({
    name: n,
    description: d,
    topics,
    image: image.value.trim() || undefined,
    x402: x402Endpoint.value.trim() ? { endpoint: x402Endpoint.value.trim() } : undefined,
    agentWallet: wallet,
    creatorWallet: walletStore.address ?? undefined,
  });

  notify.push({
    title: "Agent created",
    description: "Your agent is now listed (local demo).",
    category: "success",
  });

  router.replace({ name: "payment-agent-detail", params: { id: created.id } });
}
</script>

<template>
  <div class="page">
    <header class="head sticky-top">
      <AppFrame :topInset="false">
        <div class="head__inner">
          <button type="button" class="icon-btn" aria-label="Back" @click="router.back()">
            <ChevronLeftIcon />
          </button>
          <h1 class="title">Create agent</h1>
          <span class="sp" />
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <section class="panel">
        <p class="copy muted">
          Create a new agent profile. (Onchain mint/register via IdentityRegistry is not wired yet in this app build.)
        </p>

        <div class="form">
          <label class="lbl">
            <span>Name</span>
            <input v-model="name" class="inp" type="text" placeholder="Bitcoin Study Buddy" />
          </label>

      <label class="lbl">
        <span>Description</span>
        <textarea v-model="description" class="ta" rows="4"
          placeholder="What does this agent do? When should people pay it?" />
      </label>

      <label class="lbl">
        <span>Topics (comma-separated)</span>
        <input v-model="topicsRaw" class="inp" type="text" placeholder="money, articles, videos" />
      </label>

      <label class="lbl">
        <span>x402 endpoint (optional)</span>
        <input v-model="x402Endpoint" class="inp" type="text" placeholder="https://agent.example/x402/..." />
      </label>

      <label class="lbl">
        <span>Agent wallet (optional)</span>
        <input v-model="agentWallet" class="inp" type="text" placeholder="0x…" />
      </label>

      <label class="lbl">
        <span>Image URL (optional)</span>
        <input v-model="image" class="inp" type="text" placeholder="https://..." />
      </label>

          <button type="button" class="cta" @click="create">Create</button>
        </div>
      </section>
    </AppFrame>
  </div>
</template>

<style scoped>
.panel {
  padding: 12px 0 max(28px, env(safe-area-inset-bottom, 0px));
  color: var(--tx-normal);
}

.head {
  margin-bottom: 10px;
  position: sticky;
  top: 0;
  z-index: 30;
  margin-top: 0;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 0 12px;
  background: var(--frost-bg, rgba(22, 22, 24, 0.78));
  backdrop-filter: blur(24px) saturate(1.65);
  -webkit-backdrop-filter: blur(24px) saturate(1.65);
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.head__inner {
  display: grid;
  grid-template-columns: 72px 1fr 72px;
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
  margin: 0;
  text-align: center;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.copy.muted {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--tx-dimmed);
}

.form {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.lbl {
  display: grid;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.inp,
.ta {
  width: 100%;
  border-radius: var(--radius-12);
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.16);
  color: var(--tx-normal);
  padding: 12px 14px;
  font-size: 14px;
  outline: none;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
}

.ta {
  resize: vertical;
  min-height: 96px;
}

.cta {
  margin-top: 8px;
  width: 100%;
  height: 50px;
  border: none;
  border-radius: var(--radius-14);
  background: var(--primary);
  color: var(--tx-normal);
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(245, 95, 20, 0.35);
}
</style>
