<script setup lang="ts">
import BeamLogo from '@/components/icons/BeamLogo.vue';
import CopyIcon from '@/components/icons/CopyIcon.vue';
import OverviewIcon from '@/components/icons/OverviewIcon.vue';
import PaymentsIcon from '@/components/icons/PaymentsIcon.vue';
import SettingsIcon from '@/components/icons/SettingsIcon.vue';
import TreasuryIcon from '@/components/icons/TreasuryIcon.vue';

import { useRoute } from 'vue-router';
import ChevronRightIcon from './icons/ChevronRightIcon.vue';
import { useWalletStore } from '@/stores/wallet';
import { Connection } from '@/types/app';
import Converter from '@/scripts/converter';
import AIIcon from './icons/AIIcon.vue';
import { computed } from 'vue';
import StorageImage from '@/components/StorageImage.vue';
import CloseIcon from './icons/CloseIcon.vue';

const props = withDefaults(defineProps<{ open?: boolean }>(), {
    open: false,
});
const emit = defineEmits<{
    (e: 'close'): void;
}>();

const route = useRoute();
const walletStore = useWalletStore();

const merchantMeta = computed(() => {
    if (!walletStore.merchant?.metadata_value) return null;
    const o = Converter.parseMerchantMetadata(walletStore.merchant.metadata_value);
    const imageURL = typeof o.imageURL === "string" ? o.imageURL : undefined;
    const name = typeof o.name === "string" ? o.name : undefined;
    return { imageURL, name };
});

const copyAddress = async () => {
    if (!walletStore.address) return;
    try {
        await navigator.clipboard.writeText(walletStore.address);
    } catch {
        /* ignore */
    }
};
</script>

<template>
    <div class="sidebar_wrap" v-if="walletStore.address" :data-open="props.open">
        <button class="backdrop" type="button" aria-label="Close menu" @click="emit('close')" />

        <div class="sidebar">
        <RouterLink to="/">
            <header>
                <BeamLogo />
                <button class="close_btn" type="button" aria-label="Close menu" @click.prevent="emit('close')">
                    <CloseIcon />
                </button>
            </header>
        </RouterLink>

        <main>
            <p class="main_title">MAIN</p>

            <div class="options">
                <RouterLink to="/">
                    <div :class="route.name?.toString().startsWith('treasury') ? 'option option_selected' : 'option'">
                        <div class="selector"></div>

                        <button>
                            <TreasuryIcon />
                            <p>Treasury</p>
                        </button>
                    </div>
                </RouterLink>

                <RouterLink to="/accept-payment">
                    <div
                        :class="route.name?.toString().startsWith('accept-payment') ? 'option option_selected' : 'option'">
                        <div class="selector"></div>

                        <button>
                            <OverviewIcon />
                            <p>Accept Payment</p>
                        </button>
                    </div>
                </RouterLink>

                <div class="option_children" v-if="walletStore.connection == Connection.Wallet">
                    <RouterLink to="/accept-payment">
                        <button
                            :class="route.name === 'accept-payment' ? 'option_child option_child_selected' : 'option_child'">
                            Customer
                        </button>
                    </RouterLink>

                    <RouterLink to="/accept-payment/x402">
                        <button
                            :class="route.name === 'accept-payment-x402-create' ? 'option_child option_child_selected' : 'option_child'">
                            x402
                        </button>
                    </RouterLink>
                </div>

                <RouterLink to="/subscriptions" v-if="walletStore.connection == Connection.Wallet">
                    <div
                        :class="route.name?.toString().startsWith('subscriptions') ? 'option option_selected' : 'option'">
                        <div class="selector"></div>

                        <button>
                            <PaymentsIcon />
                            <p>Subscriptions</p>
                        </button>
                    </div>
                </RouterLink>

                <div class="option_children" v-if="walletStore.connection == Connection.Wallet">
                    <RouterLink to="/subscriptions">
                        <button
                            :class="route.name?.toString().startsWith('subscriptions') ? 'option_child option_child_selected' : 'option_child'">
                            Plans
                        </button>
                    </RouterLink>
                </div>

                <RouterLink to="/agents" v-if="walletStore.connection == Connection.Wallet">
                    <div :class="route.name?.toString().startsWith('agents') ? 'option option_selected' : 'option'">
                        <div class="selector"></div>

                        <button>
                            <AIIcon />
                            <p>Agents</p>
                        </button>
                    </div>
                </RouterLink>

                <div class="option_children">
                    <RouterLink to="/agents">
                        <button
                            :class="route.name === 'agents' ? 'option_child option_child_selected' : 'option_child'">
                            My Agents
                        </button>
                    </RouterLink>
                    <RouterLink to="/agents/new">
                        <button
                            :class="route.name?.toString().startsWith('agents-new') ? 'option_child option_child_selected' : 'option_child'">
                            Create
                        </button>
                    </RouterLink>
                </div>
            </div>
        </main>

        <footer>
            <RouterLink to="/settings" v-if="walletStore.connection == Connection.Wallet">
                <div :class="route.name?.toString().startsWith('settings') ? 'option option_selected' : 'option'">
                    <div class="selector"></div>

                    <button>
                        <SettingsIcon />
                        <p>Settings</p>
                    </button>
                </div>
            </RouterLink>
            <div v-else style="height: 45px;"></div>

            <div class="account">
                <div class="account_info">
                    <StorageImage :src="merchantMeta?.imageURL || '/images/colors.png'" alt="account" />
                    <div class="account_name">
                        <p>{{ merchantMeta?.name ?? 'Wallet' }}</p>
                        <div class="address_row" role="button" tabindex="0" @click="copyAddress"
                            @keydown.enter.prevent="copyAddress">
                            <p>{{ Converter.fineAddress(walletStore.address, 5) }}</p>
                            <CopyIcon />
                        </div>
                    </div>
                </div>

                <RouterLink to="/settings">
                    <div class="account_arrow">
                        <ChevronRightIcon />
                    </div>
                </RouterLink>
            </div>
        </footer>
        </div>
    </div>
</template>

<style scoped>
.sidebar_wrap {
    position: relative;
    z-index: 20;
}

.backdrop {
    display: none;
    position: fixed;
    inset: 0;
    border: none;
    background: rgba(0, 0, 0, 0.55);
    z-index: 19;
}

.sidebar {
    top: 0;
    position: sticky;
    height: 100vh;
    width: 250px;
    z-index: 20;
    position: fixed;
    border-right: 1px solid var(--bg-lightest);
    background: var(--bg);
}

header {
    height: 90px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--bg-lightest);
    margin: 0 24px;
    justify-content: space-between;
}

.close_btn {
    display: none;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid var(--bg-lightest);
    background: var(--bg);
    cursor: pointer;
    align-items: center;
    justify-content: center;
}

main {
    padding-top: 24px;
    height: calc(100vh - 250px);
    overflow: auto;
}

.main_title {
    font-size: 14px;
    letter-spacing: 1%;
    line-height: 17.5px;
    margin: 0 24px;
    color: var(--tx-dimmed);
}

.options {
    margin-top: 22px;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.option {
    display: flex;
    align-items: center;
    gap: 15px;
}



.option_selected .selector {
    background: var(--primary-light);
}

.selector {
    width: 5px;
    height: 32px;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
}

.option_selected button {
    background: var(--bg-lighter) !important;
}



.option button {
    width: 210px;
    height: 44px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 12px;
}

.option_selected .option button p {
    color: var(--tx-normal);
}

.option button p {
    font-size: 16px;
    line-height: 20px;
    letter-spacing: 2%;
    color: var(--tx-dimmed);
}

.option_children {
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--bg-lightest);
    margin-left: 44px;
}

.option_child {
    width: 186px;
    height: 44px;
    padding: 0 30px;
    background: none;
    border: none;
    font-size: 16px;
    line-height: 20px;
    letter-spacing: 2%;
    color: var(--tx-dimmed);
    text-align: left;
    cursor: pointer;
}

.option_child_selected {
    color: var(--tx-normal);
}

.option_disabled button {
    cursor: not-allowed !important;
}

footer {
    width: 100%;
    height: 200px;
    position: sticky;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

footer a {
    display: block;
    width: 100%;
}

.settings {
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    padding: 0 40px;
    gap: 12px;
    background: none;
    border: none;
    cursor: pointer;
}

.settings p {
    font-size: 16px;
    line-height: 20px;
    letter-spacing: 2%;
    color: var(--tx-dimmed);
}

.account {
    width: calc(100% - 40px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 90px;
    margin: 0 20px;
    margin-top: 20px;
    cursor: pointer;
    border-top: 1px solid var(--bg-lightest);
}

.account a {
    display: block;
    margin-left: 20px;
}

.account_info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.account_info img {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    object-fit: cover;
}

.account_name>p {
    font-size: 14px;
    line-height: 17.5px;
    letter-spacing: 2%;
    color: var(--tx-normal);
}

.account_name>div,
.address_row {
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.address_row {
    cursor: pointer;
}

.account_name>div p {
    font-size: 12px;
    line-height: 15px;
    letter-spacing: 2%;
    color: var(--tx-dimmed);
}

.account_arrow {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 1px solid var(--bg-lightest);
    display: flex;
    align-items: center;
    justify-content: center;
}

@media (max-width: 960px) {
    .sidebar_wrap {
        position: fixed;
        inset: 0;
        pointer-events: none;
    }

    .sidebar_wrap[data-open="true"] {
        pointer-events: auto;
    }

    .backdrop {
        display: block;
        opacity: 0;
        transition: opacity 160ms ease;
    }

    .sidebar_wrap[data-open="true"] .backdrop {
        opacity: 1;
    }

    .sidebar {
        height: 100vh;
        width: min(320px, 85vw);
        transform: translateX(-110%);
        transition: transform 200ms ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    }

    .sidebar_wrap[data-open="true"] .sidebar {
        transform: translateX(0);
    }

    .close_btn {
        display: inline-flex;
    }

    footer {
        height: 220px;
    }
}
</style>