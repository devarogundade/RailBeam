<script setup lang="ts">
import ProgressBox from "@/components/ProgressBox.vue";
import PlusIcon from "@/components/icons/PlusIcon.vue";
import { useWalletStore } from "@/stores/wallet";
import { useRouter } from "vue-router";
import { computed } from "vue";
import { useBeamAgentsQuery } from "@/query/agents";
import type { Agent as BeamAgent } from "beam-ts";

type AgentCardRegistrationV1 = {
  type?: string;
  name?: string;
  description?: string;
  image?: string;
  services?: Array<{ name?: string; endpoint?: string; version?: string }>;
  x402Support?: boolean;
  active?: boolean;
};

function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const walletStore = useWalletStore();
const router = useRouter();

const merchantWallet = computed(() => walletStore.address);

const agentsQuery = useBeamAgentsQuery(merchantWallet);

type UiAgent = {
  id: string;
  agentId: string;
  name: string;
  description: string;
  image?: string;
  x402?: boolean;
  active?: boolean;
};

function toUiAgent(a: BeamAgent): UiAgent {
  const card = safeJsonParse<AgentCardRegistrationV1>(a.uri ?? null);
  const services = card && Array.isArray(card.services) ? card.services : [];
  const x402 = Boolean(card?.x402Support) || services.some((s) => String(s?.name).toLowerCase() === "a2a");
  return {
    id: a.id,
    agentId: a.agentId?.toString?.() ? a.agentId.toString() : String(a.agentId),
    name: (card?.name ?? "").trim() || `Agent #${a.agentId?.toString?.() ? a.agentId.toString() : String(a.agentId)}`,
    description: (card?.description ?? "").trim() || "No description",
    image: card?.image,
    x402,
    active: card?.active,
  };
}

const myAgents = computed(() => (agentsQuery.data.value ?? []).map(toUiAgent));

function openCreate() {
  router.push({ name: "agents-new" });
}
</script>

<template>
    <ProgressBox v-if="agentsQuery.isLoading.value" />

    <div class="container" v-else>
        <div class="head">
            <div class="title">
                <h3>My Agents</h3>
                <p>Agents are loaded from the Beam subgraph via the Beam SDK.</p>
            </div>

            <button class="primary" type="button" @click="openCreate">
                <PlusIcon />
                <span>New Agent</span>
            </button>
        </div>

        <div v-if="!merchantWallet" class="empty">
            <h4>Connect a wallet to continue</h4>
            <p>My Agents is tied to your merchant wallet address.</p>
        </div>

        <div v-else class="panel">
            <div v-if="agentsQuery.isError.value" class="empty">
                <h4>Could not load agents</h4>
                <p>Check your graph URL / network config and try again.</p>
            </div>
            <div v-else-if="myAgents.length === 0" class="empty">
                <h4>No agents yet</h4>
                <p>Once you mint/register an agent on-chain, it will appear here.</p>
            </div>

            <div v-else class="list">
                <div v-for="a in myAgents" :key="a.id" class="row">
          <img class="avatar" :src="a.image || '/images/colors.png'" alt="" />
                    <div class="main">
                        <div class="row_top">
                            <p class="name">{{ a.name }}</p>
                            <div class="badges">
                                <span v-if="a.active !== undefined" class="badge" :class="a.active ? 'on' : 'off'">
                                    {{ a.active ? "Active" : "Inactive" }}
                                </span>
                <span v-if="a.x402" class="badge x402">x402</span>
                            </div>
                        </div>
                        <p class="desc">{{ a.description }}</p>
            <p class="meta">Agent ID: {{ a.agentId }}</p>
                    </div>

                    <div class="actions">
                        <button class="secondary" type="button" disabled>On-chain</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.container {
    min-height: calc(100dvh - 90px);
    padding: 24px 50px;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--bg-lightest);
    padding-bottom: 16px;
}

.title h3 {
    margin: 0;
    font-size: 24px;
    color: var(--tx-normal);
}

.title p {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--tx-dimmed);
}

.panel {
    flex: 1 1 auto;
    min-height: 0;
}

.list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.row {
    display: grid;
  grid-template-columns: 44px 1fr auto;
    gap: 18px;
    padding: 18px 18px;
    border-radius: 12px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg-light);
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
}

.row_top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.name {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--tx-normal);
}

.desc {
    margin: 10px 0 0;
    font-size: 14px;
    line-height: 22px;
    color: var(--tx-semi);
}

.topics {
    margin: 12px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.topic {
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    border: 1px solid var(--bg-lightest);
    color: var(--tx-dimmed);
    background: rgba(0, 0, 0, 0.08);
}

.actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.badges {
    display: flex;
    align-items: center;
    gap: 10px;
}

.badge {
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid var(--bg-lightest);
}

.badge.on {
    border-color: rgba(20, 245, 120, 0.35);
    background: rgba(20, 245, 120, 0.08);
    color: rgba(160, 255, 210, 0.95);
}

.badge.off {
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(0, 0, 0, 0.08);
    color: var(--tx-dimmed);
}

.badge.x402 {
  border-color: rgba(245, 95, 20, 0.35);
  background: rgba(245, 95, 20, 0.08);
  color: rgba(255, 210, 190, 0.95);
}

.meta {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--tx-dimmed);
  word-break: break-word;
}

.primary,
.secondary {
    height: 40px;
    padding: 0 14px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 1px solid var(--bg-lightest);
    color: var(--tx-normal);
}

.primary {
    background: var(--bg-lightest);
}

.secondary {
    background: var(--bg);
}

.primary.full {
    width: 100%;
    height: 46px;
}

.empty {
    padding: 24px 0;
    text-align: center;
}

.empty h4 {
    margin: 0;
    font-size: 18px;
    color: var(--tx-normal);
}

.empty p {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--tx-dimmed);
}
</style>