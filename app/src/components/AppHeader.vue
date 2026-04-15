<script setup lang="ts">
import { useRoute } from 'vue-router';
import BellIcon from './icons/BellIcon.vue';
import MetamaskIcon from './icons/MetamaskIcon.vue';
import { ref, watch, type Component } from 'vue';

import TreasuryIcon from './icons/TreasuryIcon.vue';
import PaymentsIcon from './icons/PaymentsIcon.vue';
import { useWalletStore } from '@/stores/wallet';
import { Connection } from '@/types/app';
import Converter from '@/scripts/converter';
import EyeIcon from './icons/EyeIcon.vue';
import WalletIcon from './icons/WalletIcon.vue';
import AIIcon from './icons/AIIcon.vue';
import SettingsIcon from './icons/SettingsIcon.vue';
import OverviewIcon from './icons/OverviewIcon.vue';

interface Props {
    parent?: string;
    title: string;
    icon: Component;
}

const emit = defineEmits<{
    (e: 'open-menu'): void;
}>();

const route = useRoute();
const walletStore = useWalletStore();

const props = ref<Props>({
    title: 'Treasury',
    icon: TreasuryIcon
});

watch(route, (newValue) => {
    if (newValue.name?.toString() === 'treasury') {
        props.value = {
            title: 'Treasury',
            icon: TreasuryIcon
        };
    } else if (newValue.name?.toString().startsWith('accept-payment')) {
        props.value = {
            title: newValue.name === 'accept-payment-x402' ? 'x402' : 'Accept Payment',
            icon: OverviewIcon
        };
    } else if (newValue.name?.toString().startsWith('subscriptions')) {
        props.value = {
            parent: 'Subscriptions',
            title: 'Plans',
            icon: PaymentsIcon
        };
    }
    else if (newValue.name === 'agents') {
        props.value = {
            title: 'My Agents',
            parent: 'Agents',
            icon: AIIcon
        };
    }
    else if (newValue.name?.toString().startsWith('agents-new')) {
        props.value = {
            title: 'New Agent',
            parent: 'Agents',
            icon: AIIcon
        };
    }
    else if (newValue.name?.toString().startsWith('settings')) {
        props.value = {
            title: 'Settings',
            icon: SettingsIcon
        };
    }
});
</script>

<template>
    <header>
        <div class="header_info">
            <button class="menu_btn" type="button" aria-label="Open menu" @click="emit('open-menu')">
                ☰
            </button>
            <div class="icon_wrapper">
                <component :is="props.icon" />
            </div>

            <p>
                <span v-if="props.parent">{{ props.parent }} /</span>
                {{ props.title }}
            </p>
        </div>

        <div class="actions">
            <div class="bell_wrapper">
                <BellIcon />
            </div>

            <RouterLink to="/onboarding" v-if="!walletStore.address">
                <button>
                    <WalletIcon />
                    <p>{{ walletStore.address ? Converter.fineAddress(walletStore.address, 5) : 'Connect Wallet' }}</p>
                </button>
            </RouterLink>

            <button v-else>
                <MetamaskIcon v-if="walletStore.connection == Connection.Wallet" />
                <EyeIcon v-else="walletStore.connection == Connection.Guest" />
                <p>{{ walletStore.address ? Converter.fineAddress(walletStore.address, 5) : 'Connect Wallet' }}</p>
            </button>
        </div>
    </header>
</template>

<style scoped>
header {
    top: 0;
    position: sticky;
    left: 0;
    right: 0;
    width: 100%;
    align-self: stretch;
    z-index: 99;
    background: var(--bg);
    height: calc(90px + env(safe-area-inset-top));
    display: flex;
    align-items: center;
    padding: env(safe-area-inset-top) var(--page-gutter) 0;
    justify-content: space-between;
    border-bottom: 1px solid var(--bg-lightest);
    box-sizing: border-box;
    gap: 16px;
}

.header_info {
    display: flex;
    align-items: center;
    gap: 20px;
    min-width: 0;
    flex: 1;
}

.menu_btn {
    display: none;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg);
    color: var(--tx-normal);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
}

.header_info p {
    font-size: 20px;
    line-height: 25px;
    letter-spacing: 2%;
    color: var(--tx-normal);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.header_info p span {
    color: var(--tx-dimmed);
}

.icon_wrapper {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid var(--bg-lightest);
    display: flex;
    align-items: center;
    justify-content: center;
}

.bell_wrapper {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    background: var(--bg);
    border: 1px solid var(--bg-lightest);
    display: flex;
    align-items: center;
    justify-content: center;
}

.actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
}

.actions button {
    gap: 12px;
    height: 40px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    border-radius: 6px;
    background: var(--bg);
    border: 1px solid var(--bg-lightest);
    cursor: pointer;
}

.actions button p {
    font-size: 14px;
    line-height: 16.8px;
    letter-spacing: 2%;
    color: var(--tx-normal);
}

@media (max-width: 960px) {
    .menu_btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .actions button p {
        display: none;
    }
}

@media (max-width: 420px) {
    header {
        gap: 12px;
    }

    .header_info {
        gap: 12px;
    }

    .header_info p {
        font-size: 16px;
        line-height: 20px;
    }

    .actions {
        gap: 12px;
    }

    .actions button {
        padding: 0 12px;
    }
}
</style>