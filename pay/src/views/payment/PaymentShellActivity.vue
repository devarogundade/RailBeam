<script setup lang="ts">
import ShellTransactionCard from "@/components/shell/ShellTransactionCard.vue";
import { DEMO_SHELL_SUBSCRIPTIONS } from "@/data/demoShellSubscriptions";
import { DEMO_SHELL_TRANSACTIONS } from "@/data/demoShellTransactions";
import { useRouter } from "vue-router";

const router = useRouter();
const demoTx = DEMO_SHELL_TRANSACTIONS;
const subs = DEMO_SHELL_SUBSCRIPTIONS;
</script>

<template>
  <section class="panel">
    <ul class="tx-list tight">
      <ShellTransactionCard
        v-for="t in demoTx"
        :key="'a-' + t.id"
        :tx="t"
        @open="router.push({ name: 'payment-tx', params: { id: t.id } })"
      />
    </ul>
    <h2 class="subhead">Subscriptions</h2>
    <ul class="sub-list">
      <li
        v-for="s in subs"
        :key="'a-' + s.id"
        class="sub"
        role="button"
        tabindex="0"
        @click="router.push({ name: 'payment-subscription', params: { id: s.id } })"
        @keydown.enter.prevent="router.push({ name: 'payment-subscription', params: { id: s.id } })"
      >
        <img class="sub-av" :src="s.img" alt="" width="40" height="40" />
        <div class="sub-main">
          <p class="sub-name">{{ s.name }}</p>
          <p class="sub-meta">{{ s.cadence }} · Next {{ s.nextSummary }}</p>
        </div>
        <p class="sub-amt">{{ s.amount }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  padding: 12px 0 max(28px, env(safe-area-inset-bottom, 0px));
  color: var(--tx-normal);
}
.tx-list {
  list-style: none;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  overflow: hidden;
  background: var(--bg-light);
  margin-bottom: 20px;
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
}
.subhead {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 20px 0 12px;
}
.sub-list {
  list-style: none;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  overflow: hidden;
  background: var(--bg-light);
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
}
.sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  min-height: 56px;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  cursor: pointer;
}
.sub:active {
  background: rgba(255, 255, 255, 0.06);
  transform: scale(0.995);
}
.sub:focus-visible {
  outline: 2px solid var(--primary-light);
  outline-offset: -2px;
}
.sub:last-child {
  border-bottom: none;
}
.sub-av {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-12);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  flex-shrink: 0;
}
.sub-main {
  flex: 1;
  min-width: 0;
}
.sub-name {
  font-size: 14px;
  font-weight: 500;
}
.sub-meta {
  font-size: 12px;
  color: var(--tx-dimmed);
  margin-top: 2px;
}
.sub-amt {
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
</style>
