<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import PayerShareList from "@/components/PayerShareList.vue";
import { useShellTransactionDetail } from "@/composables/useBeamShellQueries";
import { notify } from "@/reactives/notify";
import { useWalletStore } from "@/stores/wallet";
import { buildPayerShareRows } from "@/utils/payerShares";
import AppFrame from "@/components/layout/AppFrame.vue";
import { mapTransactionToShellRow } from "@/scripts/shellActivity";
import { TransactionStatus, TransactionType } from "beam-ts/src/enums";
import type { Hex } from "viem";
import { getToken } from "beam-ts/src/utils/constants";
import { zeroAddress } from "viem";
import { useWeb3Modal } from "@web3modal/wagmi/vue";
import { TokenContract } from "@/scripts/erc20";
import {
  BeamContract,
  OneTimeTransactionContract,
  RecurrentTransactionContract,
} from "@/scripts/contract";

const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();
const web3Modal = useWeb3Modal();

const approving = ref(false);
const paying = ref(false);
const minting = ref(false);
const allowanceWei = ref<bigint>(0n);

function safeBigInt(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return Number.isFinite(v) ? BigInt(Math.trunc(v)) : 0n;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0n;
    try {
      return BigInt(s);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

const id = computed(() => (route.params.id as string) ?? "");

const { data: txRaw, isFetching, refetch } = useShellTransactionDetail(id);

const tx = computed(() => {
  const t = txRaw.value;
  if (!t) return null;
  return mapTransactionToShellRow(t, walletStore.address);
});

function statusLabel(status: TransactionStatus): string {
  switch (status) {
    case TransactionStatus.Pending:
      return "Pending";
    case TransactionStatus.Active:
      return "Active";
    case TransactionStatus.Completed:
      return "Completed";
    case TransactionStatus.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
}

const shareRows = computed(() => {
  const t = txRaw.value;
  if (!t?.payers?.length || !t.amounts?.length) return [];
  const amounts = t.amounts.map((a: unknown) => safeBigInt(a));
  const paid = new Set<string>(
    (t.confirmations ?? []).map((c: any) => String(c.from ?? "").toLowerCase()),
  );
  return buildPayerShareRows(t.payers as Hex[], amounts, walletStore.address, paid);
});

const metaRows = computed(() => {
  const t = txRaw.value;
  if (!t) {
    return [
      { k: "Transaction", v: id.value.slice(0, 18) + (id.value.length > 18 ? "…" : "") },
      { k: "Status", v: "Not found" },
    ];
  }
  const n = t.payers?.length ?? 0;
  const rows: { k: string; v: string }[] = [
    { k: "Transaction", v: `${t.transactionId.slice(0, 10)}…${t.transactionId.slice(-6)}` },
    { k: "Status", v: statusLabel(t.status) },
    { k: "Date", v: tx.value?.detailDate ?? "—" },
    { k: "Network", v: tx.value?.detailNetwork ?? "—" },
    // `tx.amount` includes sign. For detail totals we want the absolute amount.
    { k: "Total", v: tx.value?.amount?.replace(/^[+-]/, "") ?? "—" },
  ];
  if (n > 1) rows.push({ k: "Payers", v: String(n) });
  return rows;
});

const amountSymbol = computed(() => {
  const t = txRaw.value;
  if (!t) return "";
  return getToken(t.adjustedToken)?.symbol ?? "TOKEN";
});

const amountDecimals = computed(() => {
  const t = txRaw.value;
  if (!t) return 18;
  return getToken(t.adjustedToken)?.decimals ?? 18;
});

const invalidId = computed(
  () => !!id.value && !id.value.toLowerCase().startsWith("0x")
);

const viewerCanPay = computed(() => {
  const t = txRaw.value;
  const addr = walletStore.address?.toLowerCase() ?? "";
  if (!t || !addr) return false;
  const isPayer = (t.payers ?? []).some((p: any) => String(p).toLowerCase() === addr);
  if (!isPayer) return false;
  const paid = (t.confirmations ?? []).some(
    (c: any) => String(c.from ?? "").toLowerCase() === addr,
  );
  return !paid;
});

const viewerIndex = computed(() => {
  const t = txRaw.value;
  const addr = walletStore.address?.toLowerCase() ?? "";
  if (!t || !addr) return -1;
  const payers = (t.payers ?? []) as Hex[];
  if (payers.length <= 1) return 0;
  return payers.findIndex((p) => p.toLowerCase() === addr);
});

const viewerAmountWei = computed(() => {
  const t = txRaw.value;
  const i = viewerIndex.value;
  if (!t || i < 0) return 0n;
  const amounts = (t.amounts ?? []) as unknown[];
  const a = amounts[i];
  return safeBigInt(a);
});

const tokenAddress = computed(() => (txRaw.value?.token as Hex | undefined) ?? undefined);

async function refreshAllowance() {
  const t = txRaw.value;
  const token = tokenAddress.value;
  const wallet = walletStore.address as Hex | undefined;
  if (!t || !token || !wallet) {
    allowanceWei.value = 0n;
    return;
  }
  allowanceWei.value = await TokenContract.getAllowance(token, wallet, BeamContract.address);
}

watch([() => walletStore.address, () => txRaw.value?.transactionId], () => {
  refreshAllowance();
});

function goBack() {
  router.push({ name: "payment-activity" });
}

async function payMyShare() {
  if (!walletStore.address) {
    web3Modal.open();
    return;
  }
  const t = txRaw.value;
  if (!t) return;
  if (!viewerCanPay.value) return;
  const i = viewerIndex.value;
  if (i < 0) {
    notify.push({
      title: "Wrong wallet",
      description: "Connect a wallet that is listed as a payer for this transaction.",
      category: "error",
    });
    return;
  }

  const amountWei = viewerAmountWei.value;
  const token = tokenAddress.value ?? zeroAddress;

  // ERC20: ensure approval for Beam contract to transfer payer's share.
  if (token !== zeroAddress) {
    if (allowanceWei.value < amountWei) {
      if (approving.value) return;
      approving.value = true;
      const approvalHash = await TokenContract.approve(token, BeamContract.address, amountWei);
      approving.value = false;
      if (!approvalHash) {
        notify.push({
          title: "Approval failed",
          description: "Try again.",
          category: "error",
        });
        return;
      }
      await refreshAllowance();
    }
  }

  if (paying.value) return;
  paying.value = true;
  const txHash = await BeamContract.fulfillOneTimeTransaction(
    { transactionId: t.transactionId },
    token === zeroAddress ? amountWei : 0n,
  );
  paying.value = false;

  if (txHash) {
    notify.push({
      title: "Payment sent!",
      description: "Your share was paid.",
      category: "success",
      linkTitle: "View Trx",
      linkUrl: `${import.meta.env.VITE_EXPLORER_URL}/tx/${txHash}`,
    });
    refetch();
    router.push({ name: "payment-tx-success", params: { id: t.transactionId } });
  } else {
    notify.push({
      title: "Payment failed",
      description: "Try again.",
      category: "error",
    });
  }
}

function mintReceipt() {
  void (async () => {
    if (minting.value) return;
    if (!walletStore.address) {
      web3Modal.open();
      return;
    }
    const raw = txRaw.value;
    const t = tx.value;
    if (!raw || !t) return;

    const contract =
      raw.type === TransactionType.Recurrent
        ? RecurrentTransactionContract
        : OneTimeTransactionContract;

    const metadata = {
      name: "Payment receipt.",
      description: raw.description ? String(raw.description) : "No description.",
      image: t.img,
    };

    minting.value = true;
    try {
      const txHash = await contract.mintReceipt({
        to: walletStore.address as Hex,
        transactionId: raw.transactionId as Hex,
        URI: JSON.stringify(metadata),
      });

      if (txHash) {
        notify.push({
          title: "Transaction was sent!",
          description: "Receipt NFT was minted.",
          category: "success",
          linkTitle: "View Trx",
          linkUrl: `${import.meta.env.VITE_EXPLORER_URL}/tx/${txHash}`,
        });
      } else {
        notify.push({
          title: "Failed to mint receipt!",
          description: "Try again.",
          category: "error",
        });
      }
    } catch {
      notify.push({
        title: "Failed to mint receipt!",
        description: "Try again.",
        category: "error",
      });
    } finally {
      minting.value = false;
    }
  })();
}
</script>

<template>
  <div class="page">
    <header class="bar sticky-top">
      <AppFrame :topInset="false">
        <div class="bar__inner">
          <button type="button" class="icon-btn" aria-label="Back" @click="goBack">
            <ChevronLeftIcon />
          </button>
          <h1 class="bar-title">Transaction</h1>
          <span class="bar-spacer" />
        </div>
      </AppFrame>
    </header>

    <AppFrame :topInset="false">
      <div class="page-body">
        <p v-if="invalidId" class="warn">
          Invalid transaction id. Open this screen from Activity or Home.
        </p>
        <p v-else-if="isFetching && !txRaw" class="muted">Loading…</p>

        <template v-else-if="tx && txRaw">
          <div class="tx-hero">
            <img class="hero-av" :src="tx.img" alt="" width="56" height="56" />
            <div class="hero-text">
              <p class="hero-title">{{ tx.title }}</p>
              <p class="hero-amt" :class="tx.tone">{{ tx.amount }}</p>
            </div>
          </div>

          <ul class="rows">
            <li v-for="r in metaRows" :key="r.k" class="row">
              <span class="k">{{ r.k }}</span>
              <span class="v">{{ r.v }}</span>
            </li>
          </ul>

          <section v-if="shareRows.length > 1" class="payer-block">
            <h2 class="block-title">Split</h2>
            <p class="block-copy">Each payer’s share of the total.</p>
            <div class="payer-card">
              <PayerShareList :rows="shareRows" :symbol="amountSymbol" :decimals="amountDecimals" />
            </div>
          </section>

          <p v-else class="note">Single-payer transaction — no split breakdown.</p>

          <footer class="mint-footer">
            <button
              v-if="viewerCanPay"
              type="button"
              class="mint-primary"
              :disabled="approving || paying"
              @click="payMyShare"
            >
              {{ approving ? "Approving…" : paying ? "Paying…" : "Pay" }}
            </button>
            <button
              v-else
              type="button"
              class="mint-primary"
              :disabled="minting"
              @click="mintReceipt"
            >
              {{ minting ? "Minting…" : "Mint Receipt" }}
            </button>
          </footer>
        </template>

        <template v-else-if="!invalidId">
          <p class="warn">
            No transaction found for this id. Try again later.
          </p>
          <button type="button" class="link-back" @click="goBack">Back to activity</button>
        </template>
      </div>
    </AppFrame>
  </div>
</template>

<style scoped>
.page {
  min-height: 50vh;
  color: var(--tx-normal);
  padding: 0;
}

.page-body {
  padding: 12px 0 max(28px, env(safe-area-inset-bottom, 0px));
}

.muted {
  font-size: 14px;
  color: var(--tx-dimmed);
}

.bar {
  margin: 0 0 20px;
  position: sticky;
  top: 0;
  z-index: 30;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 0 12px;
  background: var(--frost-bg, rgba(22, 22, 24, 0.78));
  backdrop-filter: blur(24px) saturate(1.65);
  -webkit-backdrop-filter: blur(24px) saturate(1.65);
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.bar__inner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.tx-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  padding: 4px 0;
}
.hero-av {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-14);
  object-fit: cover;
  border: 1px solid var(--bg-lightest);
  flex-shrink: 0;
}
.hero-text {
  min-width: 0;
}
.hero-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.hero-amt {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.hero-amt.green {
  color: var(--accent-green);
}
.hero-amt.red {
  color: var(--accent-red);
}
.mint-footer {
  margin-top: 28px;
  padding-top: 16px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--bg-lightest);
}
.mint-primary {
  width: 100%;
  min-height: var(--native-tap, 44px);
  border: none;
  border-radius: var(--radius-14);
  background: var(--primary);
  color: var(--tx-normal);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(245, 95, 20, 0.35);
}
.mint-primary:active {
  transform: scale(0.98);
  opacity: 0.94;
}
.icon-btn {
  width: var(--native-tap, 44px);
  height: var(--native-tap, 44px);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(36, 36, 38, 0.95);
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
  cursor: pointer;
}
.icon-btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}
.bar-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
}
.bar-spacer {
  width: 44px;
}
.rows {
  list-style: none;
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  overflow: hidden;
  background: var(--bg-light);
  box-shadow: var(--native-shadow-md, 0 8px 28px rgba(0, 0, 0, 0.42));
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  font-size: 14px;
}
.row:last-child {
  border-bottom: none;
}
.k {
  color: var(--tx-dimmed);
}
.v {
  color: var(--tx-normal);
  text-align: right;
  word-break: break-all;
}
.payer-block {
  margin-top: 20px;
}
.block-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}
.block-copy {
  font-size: 13px;
  color: var(--tx-dimmed);
  margin-bottom: 12px;
  line-height: 1.45;
}
.payer-card {
  border-radius: var(--radius-14);
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: var(--bg-light);
  padding: 8px 16px 4px;
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
}
.note {
  margin-top: 16px;
  font-size: 13px;
  color: var(--tx-dimmed);
}
.warn {
  font-size: 14px;
  color: var(--tx-semi);
  line-height: 1.5;
}
.link-back {
  margin-top: 16px;
  padding: 0;
  border: none;
  background: none;
  color: var(--primary-light);
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
}
</style>
