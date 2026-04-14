<script setup lang="ts">
import { OG_STORAGE_PREFIX, isOgStorageRef } from "@/scripts/ogStorage";
import OgStorage from "@/scripts/ogStorage";
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from "vue";

const props = defineProps<{
  alt?: string;
  src?: string;
  rootHash?: string;
  url?: string;
}>();

const resolvedAlt = computed(() => props.alt || "Storage Image");
const resolvedUrl = ref<string | null>(props.url || null);
const loading = ref<boolean>(false);
let objectUrl: string | null = null;

function normalizeOgRef(value: string): string {
  if (isOgStorageRef(value)) return value;
  return `${OG_STORAGE_PREFIX}${value}`;
}

function isDirectUrl(value: string): boolean {
  const v = value.trim();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("blob:") ||
    v.startsWith("data:") ||
    v.startsWith("/")
  );
}

const resolvedRootHash = computed<string | null>(() => {
  const direct =
    typeof props.rootHash === "string" && props.rootHash.trim()
      ? props.rootHash.trim()
      : null;
  if (direct) return direct;

  const src = typeof props.src === "string" ? props.src.trim() : "";
  if (!src) return null;
  if (isDirectUrl(src)) return null;

  return src;
});

function cleanupObjectUrl() {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
}

async function loadFromStorage(rootHashOrRef: string) {
  loading.value = true;
  try {
    const buffer = await OgStorage.download(normalizeOgRef(rootHashOrRef));
    if (buffer) {
      cleanupObjectUrl();
      objectUrl = URL.createObjectURL(new Blob([buffer]));
      resolvedUrl.value = objectUrl;
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

  const src = typeof props.src === "string" ? props.src.trim() : "";
  if (src && isDirectUrl(src)) {
    resolvedUrl.value = src;
  }
});

onMounted(async () => {
  if (resolvedUrl.value) return;
  if (!resolvedRootHash.value) return;
  await loadFromStorage(resolvedRootHash.value);
});

onBeforeUnmount(() => {
  cleanupObjectUrl();
});
</script>

<template>
  <img :src="resolvedUrl || '/images/placeholder.png'" :alt="resolvedAlt" />
</template>

