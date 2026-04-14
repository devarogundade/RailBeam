<script setup lang="ts">
import { OG_STORAGE_PREFIX, isOgStorageRef } from '@/scripts/storage';
import Storage from '@/scripts/storage';
import { computed, onMounted, ref, watchEffect } from 'vue';

const props = defineProps<{
    alt?: string;
    src?: string;
    rootHash?: string;
    url?: string;
}>();

const resolvedAlt = computed(() => props.alt || 'Storage Image');
const resolvedUrl = ref<string | null>(props.url || null);
const loading = ref<boolean>(false);

function normalizeOgRef(value: string): string {
    if (isOgStorageRef(value)) return value;
    return `${OG_STORAGE_PREFIX}${value}`;
}

function isDirectUrl(value: string): boolean {
    const v = value.trim();
    return (
        v.startsWith('http://') ||
        v.startsWith('https://') ||
        v.startsWith('blob:') ||
        v.startsWith('data:') ||
        v.startsWith('/')
    );
}

const resolvedRootHash = computed<string | null>(() => {
    const direct = typeof props.rootHash === 'string' && props.rootHash.trim() ? props.rootHash.trim() : null;
    if (direct) return direct;

    const src = typeof props.src === 'string' ? props.src.trim() : '';
    if (!src) return null;
    if (isDirectUrl(src)) return null;

    return src;
});

async function loadFromStorage(rootHashOrRef: string) {
    loading.value = true;
    try {
        const buffer = await Storage.download(normalizeOgRef(rootHashOrRef));
        if (buffer) {
            resolvedUrl.value = URL.createObjectURL(new Blob([buffer]));
        }
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
}

watchEffect(() => {
    if (props.url) {
        resolvedUrl.value = props.url;
        return;
    }

    const src = typeof props.src === 'string' ? props.src.trim() : '';
    if (src && isDirectUrl(src)) {
        resolvedUrl.value = src;
    }
});

onMounted(async () => {
    if (resolvedUrl.value) return;
    if (!resolvedRootHash.value) return;
    await loadFromStorage(resolvedRootHash.value);
});

</script>

<template>
    <img :src="resolvedUrl || '/images/placeholder.png'" :alt="resolvedAlt" />
</template>