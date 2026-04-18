<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useBeamAgents } from "@/composables/useBeamAgentQueries";
import { AGENT_AVATAR_DEFAULT } from "@/constants/ui";
import { agentCardFromUri, agentDisplayDescription, agentDisplayName } from "@/scripts/agentCard";

const router = useRouter();
const query = ref("");

const agentsQuery = useBeamAgents({ page: 1, limit: 100 });

const agents = computed(() => agentsQuery.data.value ?? []);
const loading = computed(() => agentsQuery.isFetching.value);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return agents.value;
  return agents.value.filter((a) => {
    const name = agentDisplayName(a).toLowerCase();
    const desc = agentDisplayDescription(a).toLowerCase();
    const wallet = (a.agentWallet ?? "").toLowerCase();
    return name.includes(q) || desc.includes(q) || wallet.includes(q) || a.owner.toLowerCase().includes(q);
  });
});

function openAgent(agentId: bigint) {
  router.push({ name: "payment-agent-detail", params: { agentId: agentId.toString() } });
}
</script>

<template>
  <section class="panel">
    <div class="controls">
      <label class="search" aria-label="Search agents">
        <input v-model="query" class="search-input" type="text" placeholder="Search by name, wallet, owner…" />
      </label>
    </div>

    <p v-if="loading && !filtered.length" class="hint">Loading agents…</p>
    <p v-else-if="!filtered.length" class="hint muted">No agents found.</p>

    <ul v-else class="grid" aria-label="Agents list">
      <li
        v-for="a in filtered"
        :key="a.id"
        class="row"
        role="button"
        tabindex="0"
        @click="openAgent(a.agentId)"
        @keydown.enter.prevent="openAgent(a.agentId)"
      >
        <img class="avatar" :src="agentCardFromUri(a.uri)?.image || AGENT_AVATAR_DEFAULT" width="44" height="44" alt="" />
        <div class="main">
          <p class="name">{{ agentDisplayName(a) }}</p>
          <p v-if="agentDisplayDescription(a)" class="desc">{{ agentDisplayDescription(a) }}</p>
          <p class="meta">
            #{{ a.agentId.toString() }} · {{ a.agentWallet ? a.agentWallet.slice(0, 6) + "…" + a.agentWallet.slice(-4) : "no wallet" }}
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  padding: 12px 0 max(28px, env(safe-area-inset-bottom, 0px));
  color: var(--tx-normal);
}
.controls {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}
.search-input {
  width: 100%;
  height: 46px;
  border-radius: var(--radius-12);
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.16);
  color: var(--tx-normal);
  padding: 0 14px;
  font-size: 14px;
  outline: none;
}
.grid {
  list-style: none;
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}

/* Follows the AppFrame column width (not the viewport), so grids adapt on tablet/desktop. */
@container app-frame (min-width: 520px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container app-frame (min-width: 600px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 14px;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: var(--bg-light);
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
  cursor: pointer;
  min-width: 0;
}
.row:active {
  opacity: 0.96;
  transform: scale(0.997);
}
.avatar {
  border-radius: var(--radius-12);
  border: 1px solid var(--bg-lightest);
  object-fit: cover;
  flex-shrink: 0;
}
.main {
  flex: 1;
  min-width: 0;
}
.name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--tx-semi);
  line-height: 1.45;
}
.meta {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--tx-dimmed);
  font-weight: 700;
  text-align: left;
}
.hint {
  font-size: 14px;
  padding: 12px 0 16px;
  color: var(--tx-semi);
}
.hint.muted {
  color: var(--tx-dimmed);
}
</style>
