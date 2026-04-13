<script setup lang="ts">
import PlanDetails from '@/components/PlanDetails.vue';
import { useWalletStore } from '@/stores/wallet';
import { computed, ref, watchEffect } from 'vue';
import ProgressBox from '@/components/ProgressBox.vue';
import type { Plan } from '@/types/app';
import Converter from '@/scripts/converter';
import CreatePlan from '@/components/CreatePlan.vue';
import { getToken } from 'beam-ts';
import { displayImageUrl } from '@/scripts/displayImageUrl';
import { useBeamPlansQuery } from '@/query/beam';
import { useQueryClient } from '@tanstack/vue-query';

const walletStore = useWalletStore();
const plans = ref<Plan[]>([]);
const selectedPlan = ref<Plan | null>(null);
const qc = useQueryClient();

const emit = defineEmits(['close-creating-plan']);

const props = defineProps({
    creatingPlan: { type: Boolean }
});

const address = computed(() => walletStore.address);
const plansQuery = useBeamPlansQuery(address);

const progress = computed(() => plansQuery.isLoading.value);

watchEffect(() => {
    if (plansQuery.data.value) plans.value = plansQuery.data.value;
});

const getPlans = async () => {
    await qc.invalidateQueries({ queryKey: ['plans', address.value ?? null] });
};
</script>

<template>
    <ProgressBox v-if="progress" />
    <div class="plans">
        <div class="plan" v-for="plan, index in plans" :key="index" @click="selectedPlan = plan">
            <img :src="displayImageUrl(plan.images[0])" alt="">

            <div class="plan_info">
                <h3 class="name">{{ plan.name }}</h3>
                <p class="description">{{ plan.description }}</p>

                <div class="plan_type">
                    <div class="duration">
                        <p>Duration: <span>{{ plan.interval / (24 * 60 * 60 * 1000) }} days</span></p>
                        <p>{{ plan.available ? 'Active' : 'Not active' }}</p>
                    </div>

                    <div class="amount">{{ Converter.toMoney(plan.amount) }} {{ getToken(plan.token)?.symbol }}</div>
                </div>
            </div>
        </div>
    </div>
    <div class="empty" v-if="!progress && plans.length == 0">
        <img src="/images/empty.png" alt="">
        <p>No plans.</p>
    </div>

    <CreatePlan v-if="props.creatingPlan" @refresh="getPlans()" @close="emit('close-creating-plan')" />

    <PlanDetails v-if="selectedPlan" :plan="selectedPlan" @close="selectedPlan = null" />
</template>

<style scoped>
.plans {
    padding: 0 50px;
    padding-bottom: 50px;
    gap: 30px;
    display: flex;
    flex-wrap: wrap;
}

.plan {
    display: flex;
    align-items: center;
    border-radius: 14px;
    background: var(--bg-light);
    width: 530px;
    cursor: pointer;
}

.plan img {
    width: 200px;
    height: 200px;
    object-fit: contain;
}

.plan_info {
    padding: 0 20px 0 10px;
    width: 100%;
}

.name {
    color: var(--tx-normal);
    font-size: 16px;
}

.description {
    margin-top: 16px;
    font-size: 14px;
    color: var(--tx-dimmed);
    -webkit-line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 50px;
}

.plan_type {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px dashed var(--bg-lightest);
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: space-between;
}

.duration p:first-child {
    font-size: 14px;
    color: var(--tx-semi);
}

.duration p:first-child span {
    color: var(--tx-normal);
}

.duration p:last-child {
    margin-top: 6px;
    font-size: 14px;
    color: var(--accent-green);
}

.amount {
    font-size: 16px;
    color: var(--tx-normal);
}
</style>