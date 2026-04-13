<script setup lang="ts">
import SideBar from '@/components/SideBar.vue';
import AppHeader from './components/AppHeader.vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWalletStore } from './stores/wallet';
import { beamSdk } from '@/scripts/beamSdk';
import ProgressBox from './components/ProgressBox.vue';
import { Client } from './scripts/client';
import { notify } from './reactives/notify';

const router = useRouter();
const walletStore = useWalletStore();
const loading = ref<boolean>(true);

const getMerchant = async () => {
  if (!walletStore.address) return;

  try {
    const chainMerchant = await beamSdk.merchant.getMerchant({
      merchant: walletStore.address
    });
    walletStore.setMerchant(chainMerchant);
  } catch {
    walletStore.setMerchant(null);
    loading.value = false;
    notify.push({
      title: 'Could not load account',
      description: 'Check your connection and try again.',
      category: 'error'
    });
    return;
  }

  try {
    const clientMerchant = await Client.getMerchant(walletStore.address);
    walletStore.setClientMerchant(clientMerchant);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loading.value = true;

  if (!walletStore.address) {
    return router.push('/onboarding');
  }

  getMerchant();
});
</script>

<template>
  <section>
    <ProgressBox v-if="loading" />
    <main v-else-if="walletStore.address">
      <SideBar />
      <div class="app-shell">
        <AppHeader />
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
</style>