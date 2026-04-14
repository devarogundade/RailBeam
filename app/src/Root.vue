<script setup lang="ts">
import NotifyPop from '@/components/NotifyPop.vue';
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { createWeb3Modal } from "@web3modal/wagmi/vue";
import { reconnect } from "@wagmi/core";
import { config, chains } from "@/scripts/config";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FS_API_KEY,
    authDomain: import.meta.env.VITE_FS_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FS_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FS_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FS_MSG_SENDER_ID,
    appId: import.meta.env.VITE_FS_APP_ID,
    measurementId: import.meta.env.VITE_FS_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

void isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
        getAnalytics(app);
    }
});

// Attempt to restore a previous wallet connection (wagmi v2).
void reconnect(config);

createWeb3Modal({
    wagmiConfig: config,
    projectId: import.meta.env.VITE_PROJECT_ID,
    // @ts-ignore
    chains: chains,
    enableAnalytics: true,
    themeMode: "dark",
});
</script>

<template>
    <RouterView />
    <NotifyPop />
</template>