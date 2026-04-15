<script setup lang="ts">
import SideBar from '@/components/SideBar.vue';
import AppHeader from './components/AppHeader.vue';
import { computed, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { useWalletStore } from './stores/wallet';
import ProgressBox from './components/ProgressBox.vue';
import { notify } from './reactives/notify';
import { useBeamMerchantQuery } from '@/query/beam';

const router = useRouter();
const walletStore = useWalletStore();
const address = computed(() => walletStore.address);
const sidebarOpen = ref(false);

const merchantQuery = useBeamMerchantQuery(address);

const loading = computed(
  () => merchantQuery.isLoading.value,
);

watchEffect(() => {
  if (!walletStore.address) {
    router.push('/onboarding');
  }
});

watchEffect(() => {
  if (merchantQuery.isError.value) {
    walletStore.setMerchant(null);
    notify.push({
      title: 'Could not load account',
      description: 'Check your connection and try again.',
      category: 'error',
    });
    return;
  }
  if (merchantQuery.data.value !== undefined) {
    walletStore.setMerchant(merchantQuery.data.value ?? null);
  }
});

watchEffect(() => {
  // If wallet exists but merchant is missing, send user to onboarding.
  if (!walletStore.address) return;
  if (merchantQuery.isLoading.value) return;
  if (merchantQuery.isError.value) return;

  if (merchantQuery.data.value === null) {
    router.push('/onboarding/profile');
  }
});

watchEffect(() => {
  // Close mobile nav when the app transitions to onboarding.
  if (!walletStore.address) sidebarOpen.value = false;
});
</script>

<template>
  <section>
    <ProgressBox v-if="loading" />
    <main v-else-if="walletStore.address">
      <SideBar :open="sidebarOpen" @close="sidebarOpen = false" />
      <div class="app-shell">
        <AppHeader @open-menu="sidebarOpen = true" />
        <RouterView />
      </div>
    </main>
  </section>
</template>

<style scoped>
section {
  display: flex;
  justify-content: center;
}

main {
  display: flex;
  width: 100%;
  max-width: 1440px;
  min-height: 100vh;
}

.app-shell {
  flex: 1;
  min-width: 0;
  margin-left: 250px;
  display: flex;
  flex-direction: column;
}

@media (max-width: 960px) {
  .app-shell {
    margin-left: 0;
  }
}
</style>