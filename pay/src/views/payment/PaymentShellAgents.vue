<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAgentsStore } from "@/stores/agents";
import { AGENT_AVATAR_DEFAULT } from "@/constants/ui";
import Converter from "@/scripts/converter";

const router = useRouter();
const agentsStore = useAgentsStore();

const query = ref("");
const showingStarredOnly = ref(false);

const results = computed(() => {
  const base = showingStarredOnly.value
    ? agentsStore.starredAgents
    : agentsStore.discover(query.value);
  if (!query.value.trim()) return base;
  return base;
});

function goNew() {
  router.push({ name: "payment-agent-new" });
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <section class="panel">
    <div class="controls">
      <label class="search" aria-label="Discover agents">
        <input v-model="query" class="search-input" type="text"
          placeholder="Prompt: find agents interested in paying to read an article on money…" />
      </label>

      <div class="chips">
        <button type="button" class="chip" :class="{ on: showingStarredOnly }"
          @click="showingStarredOnly = !showingStarredOnly">
          Starred
        </button>
        <button type="button" class="chip" @click="query = ''">Clear</button>
      </div>
    </div>

    <ul class="list" aria-label="Agents list">
      <li v-for="a in results" :key="a.id" class="row" role="button" tabindex="0"
        @click="router.push({ name: 'payment-agent-detail', params: { id: a.id } })"
        @keydown.enter.prevent="router.push({ name: 'payment-agent-detail', params: { id: a.id } })">
        <img class="avatar" :src="a.image || AGENT_AVATAR_DEFAULT" width="44" height="44" alt="" />
        <div class="main">
          <div class="topline">
            <div class="name-block">
              <p class="name">{{ a.name }}</p>
            </div>
            <button type="button" class="star" :class="{ on: agentsStore.isStarred(a.id) }"
              :aria-label="agentsStore.isStarred(a.id) ? 'Unstar agent' : 'Star agent'"
              @click.stop="agentsStore.toggleStar(a.id)">
              <span class="star-ico" />
            </button>
          </div>
          <p class="desc">{{ a.description }}</p>
          <p class="meta">Active · Supported trust: reputation</p>
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

.chips {
  display: flex;
  gap: 10px;
}

.chip {
  height: 34px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
  color: var(--tx-normal);
  font-size: 13px;
  cursor: pointer;
}

.chip.on {
  border-color: rgba(245, 95, 20, 0.55);
  background: rgba(245, 95, 20, 0.12);
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.name-block {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.creator {
  margin: 0;
  font-size: 12px;
  color: var(--tx-dimmed);
  font-variant-numeric: tabular-nums;
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

.star {
  width: 38px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.12);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
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
</style>
