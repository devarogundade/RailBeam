<script setup lang="ts">
import { onMounted } from "vue";
import { useDataStore } from "./stores/data";
import { formatUnits, parseEther, type Hex } from "viem";
import BeamSDK from "beam-ts/src";
import { Network, TransactionType } from "@/scripts/types";
import { notify } from "./reactives/notify";
import { getToken, SCHEMA_JSON } from "beam-ts/src/utils/constants";
import type { Metadata } from "beam-ts/src/types";
import { useUiStore } from "@/stores/ui";

type PaymentIntentV1 = {
  v: 1;
  kind: "onetime" | "recurrent";
  merchant: Hex;
  token?: Hex;
  amount?: string;
  description?: string;
  subscriptionId?: Hex;
};

function decodeIntentParam(encoded: string): PaymentIntentV1 {
  const pad =
    encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as PaymentIntentV1;
}

const beamSdk = new BeamSDK({
  network: Network.Testnet,
});

const dataStore = useDataStore();
const uiStore = useUiStore();

function paymentUrlSignals(params: URLSearchParams): boolean {
  const initiator = params.get("initiator");
  const session = params.get("session");
  const transactionId = params.get("tx");
  const intentEncoded = params.get("intent");
  return !!(
    initiator &&
    (intentEncoded || session || transactionId)
  );
}

const getFavicon = (url: string): string => {
  return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname.replace("www.", "")}`;
};

const getWebsiteTitle = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/<title>(.*?)<\/title>/);
    return match ? match[1] : "Unknown";
  } catch (error) {
    console.error("Failed to fetch website title:", error);
    return null;
  }
};

const getSubscription = async () => {
  if (
    dataStore.data?.type == TransactionType.Recurrent &&
    dataStore.data.subscriptionId
  ) {
    beamSdk.recurrentTransaction
      .getSubscription({
        subscriptionId: dataStore.data.subscriptionId,
      })
      .then((result) => {
        if (!result) {
          notify.push({
            title: "Subscription not found!",
            description: "Try again",
            category: "error",
          });
          return;
        }

        dataStore.setData({
          merchant: result.merchant,
          payers: [],
          amounts: [
            parseEther(
              formatUnits(result.amount, getToken(result.token)?.decimals || 18)
            ),
          ],
          type: TransactionType.Recurrent,
          description: dataStore.data?.description || result.description,
          metadata: dataStore.data?.metadata,
          subscriptionId: result.subsciptionId,
          token: result.token,
          splitPayment: false,
        });
      });
  }
};

function applyIntent(intent: PaymentIntentV1): boolean {
  if (intent.v !== 1 || !intent.merchant) return false;

  if (intent.kind === "onetime") {
    if (!intent.token || intent.amount == null || intent.amount === "")
      return false;
    const meta: Metadata = { schemaVersion: SCHEMA_JSON, value: "{}" };
    dataStore.setData({
      merchant: intent.merchant,
      payers: [],
      amounts: [parseEther(String(intent.amount))],
      token: intent.token,
      type: TransactionType.OneTime,
      description: intent.description ?? "",
      metadata: meta,
      splitPayment: false,
    });
    return true;
  }

  if (intent.kind === "recurrent") {
    if (!intent.subscriptionId) return false;
    dataStore.setData({
      merchant: intent.merchant,
      payers: [],
      amounts: [],
      type: TransactionType.Recurrent,
      description: intent.description ?? "",
      metadata: { schemaVersion: SCHEMA_JSON, value: "{}" },
      subscriptionId: intent.subscriptionId,
      splitPayment: false,
    });
    getSubscription();
    return true;
  }

  return false;
}

const getTransaction = async (transactionId: Hex) => {
  beamSdk.oneTimeTransaction
    .getTransaction({
      transactionId,
    })
    .then((result) => {
      if (!result) {
        notify.push({
          title: "Transaction not found!",
          description: "Try again",
          category: "error",
        });
        return;
      }

      dataStore.setData({
        merchant: result.merchant,
        payers: result.payers,
        amounts: result.amounts,
        type: result.type,
        description: result.description,
        metadata: {
          schemaVersion: result.metadata_schemaVersion,
          value: result.metadata_value,
        },
        token: result.token,
        subscriptionId: undefined,
        splitPayment: false,
      });

      getSubscription();
    });
};

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const session = params.get("session");
  const initiator = params.get("initiator");
  const transactionId = params.get("tx") as Hex | null;
  const intentEncoded = params.get("intent");

  if (!paymentUrlSignals(params)) {
    uiStore.setCheckoutFlow(false);
    return;
  }

  uiStore.setCheckoutFlow(true);

  const checkoutOrigin = initiator as string;

  let intentOk = false;
  if (intentEncoded) {
    try {
      const intent = decodeIntentParam(intentEncoded);
      intentOk = applyIntent(intent);
    } catch {
      intentOk = false;
    }
    if (!intentOk) {
      notify.push({
        title: "Invalid payment link!",
        description: "Could not read payment details.",
        category: "error",
      });
      return;
    }
  } else if (session && initiator) {
    window.addEventListener("message", (event) => {
      if (checkoutOrigin == event.origin && !dataStore.data) {
        dataStore.setData(JSON.parse(event.data));
        getSubscription();
      }
    });
  } else if (transactionId) {
    getTransaction(transactionId);
  } else {
    notify.push({
      title: "Invalid payment link!",
      description: "Try again.",
      category: "error",
    });
    return;
  }

  dataStore.setInitiator({
    url: checkoutOrigin,
    title: await getWebsiteTitle(checkoutOrigin),
    favicon: getFavicon(checkoutOrigin),
  });
});
</script>

<template>
  <RouterView />
</template>
