<script setup lang="ts">
import OnboardingHeader from './components/OnboardingHeader.vue';
import { useRoute, useRouter } from 'vue-router';
import { useWalletStore } from './stores/wallet';
import type { Merchant } from 'beam-ts';
import { computed, ref, watchEffect } from 'vue';
import { useBeamMerchantQuery } from '@/query/beam';

const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();
const merchant = ref<Merchant | null>(null);

const address = computed(() => walletStore.address);
const merchantQuery = useBeamMerchantQuery(address);

watchEffect(() => {
    merchant.value = merchantQuery.data.value ?? null;

    if (!walletStore.address) return;

    if (route.name?.toString().startsWith('onboarding')) {
        if (merchant.value) {
            router.push('/');
            return;
        }

        // Wallet connected but merchant doesn't exist yet: continue onboarding.
        if (route.name === 'onboarding-wallet') {
            router.push('/onboarding/profile');
        }
    } else {
        walletStore.setMerchant(merchant.value);
    }
});
</script>

<template>
    <main>
        <OnboardingHeader />
        <RouterView />
    </main>
</template>