<script setup lang="ts">
import ProgressBox from "@/components/ProgressBox.vue";
import { notify } from "@/reactives/notify";
import { Client } from "@/scripts/client";
import { IdentityRegistryContract } from "@/scripts/contract";
import { useWalletStore } from "@/stores/wallet";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import StorageImage from "@/components/StorageImage.vue";

type AgentService =
  | { name: "web"; endpoint: string; }
  | { name: "A2A"; endpoint: string; version?: string; }
  | { name: "MCP"; endpoint: string; version?: string; }
  | { name: "OASF"; endpoint: string; version?: string; skills?: string[]; domains?: string[]; }
  | { name: "ENS"; endpoint: string; version?: string; }
  | { name: "DID"; endpoint: string; version?: string; }
  | { name: "email"; endpoint: string; };

type AgentCardRegistrationV1 = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  name: string;
  description: string;
  image?: string;
  services: AgentService[];
  x402Support: boolean;
  active: boolean;
  registrations: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
  supportedTrust: Array<"reputation" | "crypto-economic" | "tee-attestation">;
};

const router = useRouter();
const walletStore = useWalletStore();

const progress = ref(false);
const saving = ref(false);
const step = ref<1 | 2>(1);

const name = ref("");
const description = ref("");
const topicsRaw = ref("payments, subscriptions, support");
const x402Enabled = ref(false);
const imageDataUrl = ref<string>("");
const imageBusy = ref(false);
const webEndpoint = ref("");
const emailEndpoint = ref("");
const a2aEndpoint = ref("");

const config = ref("");

const merchantWallet = computed(() => walletStore.address);
const merchant = computed(() => walletStore.merchant);

const canProceedStep1 = computed(() =>
  Boolean(name.value.trim() && description.value.trim() && !saving.value)
);

const canSave = computed(() => {
  if (!canProceedStep1.value) return false;
  return true;
});

const agentCard = computed<AgentCardRegistrationV1>(() => {
  const services: AgentService[] = [];

  if (webEndpoint.value.trim()) {
    services.push({ name: "web", endpoint: webEndpoint.value.trim() });
  }

  if (emailEndpoint.value.trim()) {
    services.push({ name: "email", endpoint: emailEndpoint.value.trim() });
  }

  if (a2aEndpoint.value.trim()) {
    services.push({ name: "A2A", endpoint: a2aEndpoint.value.trim() });
  }

  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: name.value.trim(),
    description: description.value.trim(),
    image: imageDataUrl.value.trim() ? imageDataUrl.value.trim() : undefined,
    services,
    x402Support: Boolean(x402Enabled.value),
    active: true,
    registrations: [],
    supportedTrust: ["reputation"],
  };
});

async function createAgent() {
  if (!merchantWallet.value) {
    notify.push({
      title: "Connect wallet",
      description: "Connect your merchant wallet to create an agent.",
      category: "error",
    });
    return;
  }

  const n = name.value.trim();
  const d = description.value.trim();
  if (!n || !d) {
    notify.push({
      title: "Missing info",
      description: "Name and description are required.",
      category: "error",
    });
    return;
  }

  saving.value = true;

  const encryptedMetadata = await Client.createEncryptedMetadata(config.value);
  if (!encryptedMetadata?.rootHash) {
    notify.push({
      title: "Encryption failed",
      description: "Could not encrypt agent configuration metadata.",
      category: "error",
    });
    saving.value = false;
    return;
  }

  const tx = await IdentityRegistryContract.register(
    JSON.stringify(agentCard.value),
    [
      {
        metadataKey: "encryptedConfig",
        metadataValue: encryptedMetadata.rootHash as `0x${string}`,
      },
      {
        metadataKey: "encryptedConfigTx",
        metadataValue: encryptedMetadata.txHash as `0x${string}`,
      }
    ],
  );

  notify.push(
    tx
      ? {
        title: "Published on-chain",
        description: `Transaction: ${tx}`,
        category: "success",
      }
      : {
        title: "Publish failed",
        description: "Could not publish agent in IdentityRegistry.",
        category: "error",
      }
  );

  saving.value = false;
  router.replace({ name: "agents" });
}

function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    notify.push({
      title: "Image",
      description: "Please select an image file.",
      category: "error",
    });
    return;
  }

  imageBusy.value = true;
  const reader = new FileReader();
  reader.onload = () => {
    imageDataUrl.value = typeof reader.result === "string" ? reader.result : "";
    imageBusy.value = false;
  };
  reader.onerror = () => {
    imageBusy.value = false;
    notify.push({
      title: "Image",
      description: "Could not read image. Try a smaller file.",
      category: "error",
    });
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  imageDataUrl.value = "";
}

function goNext() {
  if (!canProceedStep1.value) {
    notify.push({
      title: "Missing info",
      description: "Name and description are required.",
      category: "error",
    });
    return;
  }
  step.value = 2;
}

function goBack() {
  step.value = 1;
}
</script>

<template>
  <ProgressBox v-if="progress" />

  <div class="container" v-else>
    <div class="panel">
      <form class="form" @submit.prevent="createAgent">
        <div class="steps">
          <div :class="step === 1 ? 'step step_active' : 'step'">
            <div class="step_dot">1</div>
            <div class="step_text">
              <p class="step_title">Profile</p>
              <p class="step_sub">Public agent details</p>
            </div>
          </div>
          <div class="step_divider" />
          <div :class="step === 2 ? 'step step_active' : 'step'">
            <div class="step_dot">2</div>
            <div class="step_text">
              <p class="step_title">Config</p>
              <p class="step_sub">Encrypted configuration data</p>
            </div>
          </div>
        </div>

        <div v-if="step === 1" class="step_panel">
          <div class="img-row">
            <StorageImage class="avatar" :src="imageDataUrl || '/images/colors.png'" alt="" />
            <div class="img-actions">
              <label class="file">
                <input class="file__input" type="file" accept="image/*" @change="onPickImage" />
                <span>{{ imageBusy ? "Loading…" : "Choose image" }}</span>
              </label>
              <button class="ghost" type="button" :disabled="!imageDataUrl" @click="clearImage">Remove</button>
            </div>
          </div>

          <div class="inputs">
            <div class="field_label">
              <p>Name</p>
            </div>
            <input v-model="name" class="text_input" type="text" placeholder="Support Concierge" />
          </div>

          <div class="inputs">
            <div class="field_label">
              <p>Description</p>
            </div>
            <textarea v-model="description" rows="4" placeholder="What does this agent do for your customers?" />
          </div>

          <div class="inputs">
            <div class="field_label">
              <p>Topics <span class="optional">comma-separated</span></p>
            </div>
            <input v-model="topicsRaw" class="text_input" type="text" placeholder="payments, refunds, plans" />
          </div>

          <div class="inputs">
            <div class="field_label">
              <p>Web <span class="optional">optional</span></p>
            </div>
            <input v-model="webEndpoint" class="text_input" type="text" placeholder="https://web.agentxyz.com/" />
          </div>

          <div class="inputs">
            <div class="field_label">
              <p>Email <span class="optional">optional</span></p>
            </div>
            <input v-model="emailEndpoint" class="text_input" type="text" placeholder="mail@myagent.com" />
          </div>

          <div class="inputs">
            <div class="field_label">
              <p>x402 <span class="optional">optional</span></p>
            </div>
            <label class="toggle_row" :class="{ toggle_row_on: x402Enabled }">
              <input v-model="x402Enabled" class="sr_only" type="checkbox" />
              <span class="radio" aria-hidden="true">
                <span class="radio__ring">
                  <span class="radio__dot" />
                </span>
              </span>
              <span>Enable x402 for this agent</span>
            </label>
          </div>

          <div class="inputs">
            <div class="field_label">
              <p>A2A Endpoint <span class="optional">optional</span></p>
            </div>
            <input v-model="a2aEndpoint" class="text_input" type="text" placeholder="https://a2a.agentxyz.com/" />
          </div>

          <div class="row">
            <button class="secondary" type="button" @click="router.push({ name: 'agents' })">Cancel</button>
            <button class="primary" type="button" :disabled="!canProceedStep1" @click="goNext">Next</button>
          </div>
        </div>

        <div v-else class="step_panel">
          <div class="inputs">
            <div class="field_label">
              <p>Agent configuration <span class="optional">encrypted</span></p>
            </div>
            <textarea v-model="config" rows="8"
              placeholder="Paste encrypted agent configuration data (or JSON to be sealed)." />
            <p class="hint">
              This value is sealed and anchored as on-chain metadata under <code>encryptedConfig</code>.
            </p>
          </div>

          <div class="row row_three">
            <button class="secondary" type="button" @click="goBack">Back</button>
            <button class="secondary" type="button" @click="router.push({ name: 'agents' })">Cancel</button>
            <button class="primary" type="submit" :disabled="!canSave">Create</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.container {
  min-height: calc(100dvh - 90px);
  padding: 24px 50px;
  display: flex;
  flex-direction: column;
}

.panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.form {
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 12px;
  max-width: 720px;
  align-content: start;
}

.steps {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
  border-radius: 12px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0.7;
}

.step_active {
  opacity: 1;
}

.step_dot {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--tx-normal);
  flex-shrink: 0;
}

.step_active .step_dot {
  border-color: var(--tx-semi);
}

.step_text {
  display: grid;
  gap: 2px;
}

.step_title {
  margin: 0;
  font-size: 14px;
  color: var(--tx-normal);
}

.step_sub {
  margin: 0;
  font-size: 12px;
  color: var(--tx-dimmed);
}

.step_divider {
  width: 28px;
  height: 1px;
  background: var(--bg-lightest);
}

.step_panel {
  display: grid;
  gap: 12px;
}

.inputs+.inputs {
  margin-top: 4px;
}

.field_label {
  margin-bottom: 10px;
}

.field_label p {
  font-size: 14px;
  color: var(--tx-dimmed);
  margin: 0;
}

.optional {
  font-size: 12px;
  color: var(--tx-semi);
}

.text_input {
  height: 44px;
  width: 100%;
  border: 1px solid var(--bg-lightest);
  border-radius: 8px;
  background: var(--bg);
  color: var(--tx-normal);
  padding: 0 16px;
  outline: none;
  font-size: 14px;
  box-sizing: border-box;
}

.text_input::placeholder {
  color: var(--tx-dimmed);
}

.inputs textarea {
  width: 100%;
  border-radius: 8px;
  background: var(--bg);
  border: 1px solid var(--bg-lightest);
  color: var(--tx-normal);
  padding: 12px 16px;
  resize: vertical;
  outline: none;
  font-size: 14px;
  min-height: 88px;
  box-sizing: border-box;
}

.inputs textarea::placeholder {
  color: var(--tx-dimmed);
}

.img-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 14px;
  border-radius: 12px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg-light);
}

.avatar :deep(img),
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  flex-shrink: 0;
}

.img-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.file {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--bg-lightest);
  color: var(--tx-normal);
  background: var(--bg);
}

.file__input {
  display: none;
}

.ghost {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid var(--bg-lightest);
  color: var(--tx-normal);
  background: transparent;
}

.ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.toggle_row {
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--tx-normal);
  font-size: 14px;
  cursor: pointer;
}

.sr_only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.radio {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  border: 1px solid var(--bg-lightest);
  background: var(--bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.radio__ring {
  width: 10px;
  height: 10px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.radio__dot {
  width: 10px;
  height: 10px;
  border-radius: 10px;
}

.toggle_row_on .radio {
  border-color: var(--primary-light);
}

.toggle_row_on .radio__dot {
  background: var(--primary);
}

.row {
  margin-top: 4px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.row_three {
  max-width: 560px;
  grid-template-columns: 1fr 1fr 1fr;
}

.hint {
  margin: 10px 2px 0;
  font-size: 12px;
  color: var(--tx-dimmed);
  line-height: 1.4;
}

.hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.primary,
.secondary {
  height: 46px;
  padding: 0 14px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--bg-lightest);
  color: var(--tx-normal);
}

.primary {
  background: var(--bg-lightest);
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary {
  background: var(--bg);
}
</style>
