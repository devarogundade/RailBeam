<script setup lang="ts">
import { onMounted } from "vue";
import { useDataStore } from "./stores/data";
import { formatUnits, parseUnits, type Hex } from "viem";
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
  splitPayment?: boolean;
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

function mergedUrlSearchParamsFromLocation(loc: Location): URLSearchParams {
  const out = new URLSearchParams(loc.search);
  // Also support links that store query params inside the hash fragment.
  // Examples:
  // - "/#/?txn=...&initiator=..."
  // - "/#/p/home?txn=...&initiator=..."
  const hash = (loc.hash || "").replace(/^#/, "");
  const idx = hash.indexOf("?");
  if (idx >= 0) {
    const qs = hash.slice(idx + 1);
    const hp = new URLSearchParams(qs);
    hp.forEach((value, key) => {
      if (!out.has(key)) out.set(key, value);
    });
  }
  return out;
}

function paymentUrlSignals(params: URLSearchParams): boolean {
  const initiator = params.get("initiator");
  const session = params.get("session");
  const transactionId = params.get("tx");
  const checkoutTxnId = params.get("txn");
  const intentEncoded = params.get("intent");
  return !!(
    initiator &&
    (intentEncoded || session || transactionId || checkoutTxnId)
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

        const tok = getToken(result.token);
        const decimals = tok?.decimals ?? 18;

        dataStore.setData({
          merchant: result.merchant,
          payers: [],
          // Keep on-chain amount in base units for the selected token.
          amounts: [parseUnits(formatUnits(result.amount, decimals), decimals)],
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
    const tok = getToken(intent.token);
    const decimals = tok?.decimals ?? 18;
    const meta: Metadata = { schemaVersion: SCHEMA_JSON, value: "{}" };
    dataStore.setData({
      merchant: intent.merchant,
      payers: [],
      amounts: [parseUnits(String(intent.amount), decimals)],
      token: intent.token,
      type: TransactionType.OneTime,
      description: intent.description ?? "",
      metadata: meta,
      splitPayment: intent.splitPayment ?? false,
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
      splitPayment: intent.splitPayment ?? false,
    });
    getSubscription();
    return true;
  }

  return false;
}

type CheckoutTransactionView = {
  id: string;
  kind: "onetime" | "recurrent";
  merchant: Hex;
  token?: Hex;
  amount?: string;
  description?: string;
  splitPayment?: boolean;
  subscriptionId?: Hex;
};

function applyCheckoutTxn(tx: CheckoutTransactionView): boolean {
  if (!tx?.id || !tx.kind || !tx.merchant) return false;
  if (tx.kind === "onetime") {
    if (!tx.token || tx.amount == null || tx.amount === "") return false;
    const tok = getToken(tx.token);
    const decimals = tok?.decimals ?? 18;
    const meta: Metadata = { schemaVersion: SCHEMA_JSON, value: "{}" };
    dataStore.setData({
      merchant: tx.merchant,
      payers: [],
      amounts: [parseUnits(String(tx.amount), decimals)],
      token: tx.token,
      type: TransactionType.OneTime,
      description: tx.description ?? "",
      metadata: meta,
      splitPayment: tx.splitPayment ?? false,
    });
    return true;
  }

  if (tx.kind === "recurrent") {
    if (!tx.subscriptionId) return false;
    dataStore.setData({
      merchant: tx.merchant,
      payers: [],
      amounts: [],
      type: TransactionType.Recurrent,
      description: tx.description ?? "",
      metadata: { schemaVersion: SCHEMA_JSON, value: "{}" },
      subscriptionId: tx.subscriptionId,
      splitPayment: tx.splitPayment ?? false,
    });
    getSubscription();
    return true;
  }

  return false;
}

async function getCheckoutTxn(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${import.meta.env.VITE_CLIENT_URL}/transaction/view/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as CheckoutTransactionView;
    return applyCheckoutTxn(data);
  } catch {
    return false;
  }
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
  const params = mergedUrlSearchParamsFromLocation(window.location);
  const session = params.get("session");
  const initiator = params.get("initiator");
  const transactionId = params.get("tx") as Hex | null;
  const checkoutTxnId = params.get("txn");
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
  } else if (checkoutTxnId) {
    console.log({ checkoutTxnId });
    const ok = await getCheckoutTxn(checkoutTxnId);
    if (!ok) {
      notify.push({
        title: "Invalid payment link!",
        description: "Could not load transaction details.",
        category: "error",
      });
      return;
    }
  } else if (transactionId) {
    getTransaction(transactionId);
  } else if (session && initiator) {
    window.addEventListener("message", (event) => {
      if (checkoutOrigin == event.origin && !dataStore.data) {
        dataStore.setData(JSON.parse(event.data));
        getSubscription();
      }
    });
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
