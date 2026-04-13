<script setup lang="ts">
import OnboardingHeader from './components/OnboardingHeader.vue';
import { useRoute, useRouter } from 'vue-router';
import { useWalletStore } from './stores/wallet';
import type { Merchant } from 'beam-ts/src/types';
import { onMounted, ref, watch } from 'vue';
import { beamSdk } from '@/scripts/beamSdk';

const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();
const merchant = ref<Merchant | null>(null);

const getMerchant = async () => {
    if (!walletStore.address) return;

    merchant.value = await beamSdk.merchant.getMerchant({
        merchant: walletStore.address
    });

    if (route.name?.toString().startsWith('onboarding')) {
        if (merchant.value) {
            router.push('/');
        } else if (route.name === 'onboarding-wallet' && walletStore.address) {
            router.push('/');
        }
    } else {
        walletStore.setMerchant(merchant.value);
    }
};

onMounted(() => {
    getMerchant();
});

watch(
    () => walletStore.address,
    () => {
        getMerchant();
    }
);
</script>

<template>
    <main>
        <OnboardingHeader />
        <RouterView />
    </main>
</template>