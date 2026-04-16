<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon.vue";
import BottomSheet from "@/components/mobile/BottomSheet.vue";
import AppFrame from "@/components/layout/AppFrame.vue";
import { AGENT_AVATAR_DEFAULT } from "@/constants/ui";
import { agentCardFromUri, agentDisplayDescription, agentDisplayName } from "@/scripts/agentCard";
import { useBeamAgentByAgentId } from "@/composables/useBeamAgentQueries";
import { useMutation } from "@tanstack/vue-query";
import {
  getClientApi,
  type AgentChatPreviousMessage,
  type AgentChatResponse,
  type CreateTransactionPayload,
} from "@/scripts/clientApi";
import { useWalletStore } from "@/stores/wallet";
import { appendChatBubble, loadChatBubbles, updateChatBubbleCtaState } from "@/scripts/chatHistoryDb";
import { BeamContract } from "@/scripts/contract";
import { TokenContract } from "@/scripts/erc20";
import { useWeb3Modal } from "@web3modal/wagmi/vue";
import { zeroAddress, type Hex, parseUnits, formatUnits } from "viem";
import { getToken, SCHEMA_JSON, TransactionType } from '@railbeam/beam-ts';
import SplitPayments from "@/components/SplitPayments.vue";
import { useDataStore } from "@/stores/data";

type ChatBubble = {
  id: string;
  direction: "in" | "out";
  text: string; // HTML for direction "in", plain text for "out"
  kind?: "text" | "x402" | "transaction";
  ctaStatus?: "idle" | "sending" | "failed" | "success";
  ctaError?: string;
  createdAt?: number;
  cta?: {
    label: string;
    action: "x402" | "transaction";
    payload: any;
  };
  computeVerified?: boolean;
  chatId?: string;
};

const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();
const dataStore = useDataStore();

const agentIdParam = computed(() => String(route.params.agentId ?? ""));
const agentQuery = useBeamAgentByAgentId(agentIdParam);
const agent = computed(() => agentQuery.data.value);
const card = computed(() => agentCardFromUri(agent.value?.uri ?? null));

const trustList = computed(() => card.value?.supportedTrust?.filter(Boolean) ?? []);
const services = computed(() => card.value?.services?.filter((s) => s?.name || s?.endpoint || s?.version) ?? []);

const infoOpen = ref(false);
const draft = ref("");
const msgsEl = ref<HTMLElement | null>(null);
const endEl = ref<HTMLElement | null>(null);
const bubbles = ref<ChatBubble[]>([]);
const stickToBottom = ref(true);
const web3Modal = useWeb3Modal();
const splitPaymentsOpen = ref(false);
const splitForBubbleId = ref<string | null>(null);

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractX402ResourceId(resource: unknown): string | null {
  if (typeof resource !== "string") return null;
  const s = resource.trim();
  if (!s) return null;
  // Common backend form: "/resource/pay/<id>" or full URL ending in "/resource/pay/<id>"
  const match = s.match(/\/resource\/pay\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

async function runCta(b: ChatBubble) {
  if (!b.cta) return;
  if (b.ctaStatus === "sending" || b.ctaStatus === "success") return;

  // For split one-time payments we open the split sheet first, then execute after confirm.
  if (b.cta.action === "transaction") {
    const p = b.cta.payload ?? {};
    const kind = String(p.kind ?? "").trim().toLowerCase();
    const wantsSplit = kind === "onetime" && typeof p.splitPayment === "boolean" ? p.splitPayment : false;
    if (wantsSplit) {
      if (!walletStore.address) {
        web3Modal.open();
        return;
      }
      const merchant = String(p.merchant ?? "").trim();
      const token = (String(p.token ?? "").trim() || zeroAddress) as Hex;
      const tokenMeta = getToken(token);
      const decimals = tokenMeta?.decimals ?? 18;
      const amountWei = parseAmountToBaseUnits(p.amount, decimals);
      if (!merchant || amountWei <= 0n) return;

      dataStore.setData({
        type: TransactionType.OneTime,
        merchant: merchant as Hex,
        token,
        description: typeof p.description === "string" ? p.description : "",
        metadata: p.metadata ?? { schemaVersion: SCHEMA_JSON, value: "{}" },
        splitPayment: true,
        payers: [walletStore.address as Hex],
        amounts: [amountWei],
      });
      splitForBubbleId.value = b.id;
      splitPaymentsOpen.value = true;
      return;
    }
  }

  // Update local + DB state to "sending"
  b.ctaStatus = "sending";
  b.ctaError = undefined;
  bubbles.value = bubbles.value.map((x) => (x.id === b.id ? { ...b } : x));
  await updateChatBubbleCtaState({
    agentId: agentIdParam.value.trim(),
    userAddress: (walletStore.address ?? "anon").toLowerCase(),
    id: b.id,
    ctaStatus: "sending",
    ctaError: null,
  });
  try {
    if (b.cta.action === "x402") {
      const rId = extractX402ResourceId(b.cta.payload?.resource);
      if (rId) {
        const data = (await getClientApi().payResource(rId)) as any;
        if (data?.kind === "link" && typeof data.link === "string") {
          await appendInChatStatus(
            `<p><strong>Unlocked link:</strong> <a href="${escapeAttr(
              data.link,
            )}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.link)}</a></p>`,
          );
          await appendPaymentCompletedMessage({ label: `resource ${rId}` });
        } else {
          await appendInChatStatus(`<p>Payment complete.</p>`);
          await appendPaymentCompletedMessage({ label: `resource ${rId}` });
        }
        b.ctaStatus = "success";
        b.ctaError = undefined;
        bubbles.value = bubbles.value.map((x) => (x.id === b.id ? { ...b } : x));
        await updateChatBubbleCtaState({
          agentId: agentIdParam.value.trim(),
          userAddress: (walletStore.address ?? "anon").toLowerCase(),
          id: b.id,
          ctaStatus: "success",
          ctaError: null,
        });
      } else {
        throw new Error("Missing resource id.");
      }
    }

    if (b.cta.action === "transaction") {
      if (!walletStore.address) {
        web3Modal.open();
        throw new Error("Connect a wallet to continue.");
      }
      const p = b.cta.payload ?? {};
      const kind = String(p.kind ?? "").trim();
      const merchant = String(p.merchant ?? "").trim();
      if (!kind || !merchant) throw new Error("Invalid transaction payload");

      const payload: CreateTransactionPayload =
        kind === "onetime"
          ? {
            kind: "onetime",
            merchant,
            token: String(p.token ?? "").trim(),
            amount: String(p.amount ?? "").trim(),
            description: typeof p.description === "string" ? p.description : undefined,
            splitPayment: typeof p.splitPayment === "boolean" ? p.splitPayment : undefined,
          }
          : {
            kind: "recurrent",
            merchant,
            subscriptionId: String(p.subscriptionId ?? "").trim(),
            description: typeof p.description === "string" ? p.description : undefined,
          };

      if (kind === "onetime") {
        const token = (String((payload as any).token ?? "").trim() || zeroAddress) as Hex;
        const tokenMeta = getToken(token);
        const decimals = tokenMeta?.decimals ?? 18;
        const symbol = tokenMeta?.symbol ?? (token === zeroAddress ? "ETH" : "TOKEN");
        const amountWei = parseAmountToBaseUnits((payload as any).amount, decimals);
        if (amountWei <= 0n) throw new Error("Invalid amount");

        // ERC20: ensure approval for Beam contract transfer (payer is current wallet).
        if (token !== zeroAddress) {
          const allowanceWei = await TokenContract.getAllowance(
            token,
            walletStore.address as Hex,
            BeamContract.address as Hex,
          );
          if (allowanceWei < amountWei) {
            const approvalHash = await TokenContract.approve(token, BeamContract.address as Hex, amountWei);
            if (!approvalHash) throw new Error("Approval failed");
          }
        }

        const txHash = await BeamContract.oneTimeTransaction(
          {
            payers: [walletStore.address as Hex],
            merchant,
            amounts: [amountWei],
            token,
            description: typeof (payload as any).description === "string" ? (payload as any).description : "",
            metadata: (payload as any).metadata ?? { schemaVersion: SCHEMA_JSON, value: "{}" },
          } as any,
          token === zeroAddress ? amountWei : 0n,
        );
        if (!txHash) throw new Error("Transaction failed");
        await appendPaymentCompletedMessage({
          label: merchant,
          amount: { valueBaseUnits: amountWei, decimals, symbol },
          txHash,
        });
        b.ctaStatus = "success";
        b.ctaError = undefined;
        bubbles.value = bubbles.value.map((x) => (x.id === b.id ? { ...b } : x));
        await updateChatBubbleCtaState({
          agentId: agentIdParam.value.trim(),
          userAddress: (walletStore.address ?? "anon").toLowerCase(),
          id: b.id,
          ctaStatus: "success",
          ctaError: null,
        });
      } else if (kind === "recurrent") {
        const subscriptionId = String((payload as any).subscriptionId ?? "").trim();
        if (!subscriptionId) throw new Error("Invalid subscription id");
        const txHash = await BeamContract.recurrentTransaction(
          {
            merchant,
            subscriptionId,
            description: typeof (payload as any).description === "string" ? (payload as any).description : "",
            metadata: (payload as any).metadata ?? { schemaVersion: SCHEMA_JSON, value: "{}" },
          } as any,
          0n,
        );
        if (!txHash) throw new Error("Transaction failed");
        await appendPaymentCompletedMessage({ label: merchant, txHash });
        b.ctaStatus = "success";
        b.ctaError = undefined;
        bubbles.value = bubbles.value.map((x) => (x.id === b.id ? { ...b } : x));
        await updateChatBubbleCtaState({
          agentId: agentIdParam.value.trim(),
          userAddress: (walletStore.address ?? "anon").toLowerCase(),
          id: b.id,
          ctaStatus: "success",
          ctaError: null,
        });
      }
      return;
    }

    throw new Error("Unsupported action.");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    b.ctaStatus = "failed";
    b.ctaError = msg || "Unknown error";
    bubbles.value = bubbles.value.map((x) => (x.id === b.id ? { ...b } : x));
    await updateChatBubbleCtaState({
      agentId: agentIdParam.value.trim(),
      userAddress: (walletStore.address ?? "anon").toLowerCase(),
      id: b.id,
      ctaStatus: "failed",
      ctaError: b.ctaError,
    });
  } finally {
    // no-op: button state is derived from persisted status
  }
}

async function onSplitPaymentConfirmed(args: { payers: Hex[]; amounts: bigint[] }) {
  const bubbleId = splitForBubbleId.value;
  splitForBubbleId.value = null;
  splitPaymentsOpen.value = false;
  if (!bubbleId) return;

  const b = bubbles.value.find((x) => x.id === bubbleId);
  if (!b?.cta || b.cta.action !== "transaction") return;

  // Proceed with the original CTA, using the confirmed split.
  b.ctaStatus = "sending";
  b.ctaError = undefined;
  bubbles.value = bubbles.value.map((x) => (x.id === b.id ? { ...b } : x));
  await updateChatBubbleCtaState({
    agentId: agentIdParam.value.trim(),
    userAddress: (walletStore.address ?? "anon").toLowerCase(),
    id: b.id,
    ctaStatus: "sending",
    ctaError: null,
  });

  try {
    const p = b.cta.payload ?? {};
    const merchant = String(p.merchant ?? "").trim() as Hex;
    const token = (String(p.token ?? "").trim() || zeroAddress) as Hex;
    const tokenMeta = getToken(token);
    const decimals = tokenMeta?.decimals ?? 18;
    const symbol = tokenMeta?.symbol ?? (token === zeroAddress ? "ETH" : "TOKEN");
    const totalWei = args.amounts.reduce((a, v) => a + v, 0n);
    if (!merchant || totalWei <= 0n || args.payers.length === 0 || args.amounts.length !== args.payers.length) {
      throw new Error("Invalid split payment details");
    }

    // ERC20: ensure approval for Beam contract transfer (payer is current wallet).
    if (!walletStore.address) throw new Error("Connect a wallet to continue.");
    if (token !== zeroAddress) {
      const allowanceWei = await TokenContract.getAllowance(
        token,
        walletStore.address as Hex,
        BeamContract.address as Hex,
      );
      if (allowanceWei < totalWei) {
        const approvalHash = await TokenContract.approve(token, BeamContract.address as Hex, totalWei);
        if (!approvalHash) throw new Error("Approval failed");
      }
    }

    const txHash = await BeamContract.oneTimeTransaction(
      {
        payers: args.payers,
        merchant,
        amounts: args.amounts,
        token,
        description: typeof p.description === "string" ? p.description : "",
        metadata: p.metadata ?? { schemaVersion: SCHEMA_JSON, value: "{}" },
      } as any,
      token === zeroAddress ? totalWei : 0n,
    );
    if (!txHash) throw new Error("Transaction failed");
    await appendPaymentCompletedMessage({
      label: merchant,
      amount: { valueBaseUnits: totalWei, decimals, symbol },
      txHash,
    });

    b.ctaStatus = "success";
    b.ctaError = undefined;
    bubbles.value = bubbles.value.map((x) => (x.id === b.id ? { ...b } : x));
    await updateChatBubbleCtaState({
      agentId: agentIdParam.value.trim(),
      userAddress: (walletStore.address ?? "anon").toLowerCase(),
      id: b.id,
      ctaStatus: "success",
      ctaError: null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    b.ctaStatus = "failed";
    b.ctaError = msg || "Unknown error";
    bubbles.value = bubbles.value.map((x) => (x.id === b.id ? { ...b } : x));
    await updateChatBubbleCtaState({
      agentId: agentIdParam.value.trim(),
      userAddress: (walletStore.address ?? "anon").toLowerCase(),
      id: b.id,
      ctaStatus: "failed",
      ctaError: b.ctaError,
    });
  }
}

function safeBigIntish(v: unknown): bigint {
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}

function escapeAttr(s: string): string {
  // For href attribute; keep it simple and safe.
  return escapeHtml(s).replace(/`/g, "&#96;");
}

async function appendInChatStatus(html: string) {
  const sys: ChatBubble = {
    id: uid("in"),
    direction: "in",
    text: html,
    kind: "text",
    createdAt: Date.now(),
  };
  bubbles.value = [...bubbles.value, sys];
  await appendChatBubble({
    agentId: agentIdParam.value.trim(),
    userAddress: (walletStore.address ?? "anon").toLowerCase(),
    bubble: sys,
  });
  stickToBottom.value = true;
  await scrollToBottom("auto");
}

// (status bubbles removed; CTA state is stored on the original message)

async function appendPaymentCompletedMessage(params: {
  label: string;
  amount?: { valueBaseUnits?: bigint; decimals?: number; symbol?: string; } | null;
  txHash?: string | null;
}) {
  const label = params.label.trim() || "payment";
  const txHash = (params.txHash ?? "").trim();
  const lines: string[] = [];
  lines.push(`<p><strong>Payment completed for ${escapeHtml(label)}</strong></p>`);
  if (params.amount?.valueBaseUnits != null) {
    const decimals = typeof params.amount.decimals === "number" ? params.amount.decimals : 18;
    const symbol = params.amount.symbol?.trim() || "";
    const pretty = formatUnits(params.amount.valueBaseUnits, decimals);
    lines.push(`<p>Amount: ${escapeHtml(pretty)}${symbol ? ` ${escapeHtml(symbol)}` : ""}</p>`);
  }
  if (txHash) {
    lines.push(`<p>Txhash: <span class="v-mono">${escapeHtml(txHash)}</span></p>`);
  }
  await appendInChatStatus(lines.join(""));
}

function parseAmountToBaseUnits(raw: unknown, decimals: number): bigint {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return 0n;
    // treat numeric input as human units (may contain fraction)
    return parseUnits(String(raw), decimals);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return 0n;
    // If looks like an integer (and only an integer), assume it's already base units.
    // Note: if a unit/symbol is present (e.g. "0.002 0G" or "1 ETH"), treat it as human units.
    if (/^\d+$/.test(s)) {
      try {
        return BigInt(s);
      } catch {
        return 0n;
      }
    }
    // Otherwise parse as human units. Allow common formats like:
    // - "0.002 0G"
    // - "0.0020G"
    // - "  .5 ETH"
    try {
      const numericPrefix = s.match(/^\s*(\d+(?:\.\d+)?|\.\d+)/)?.[1];
      return parseUnits(numericPrefix ?? s, decimals);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const threadKey = computed(() => {
  const agentId = agentIdParam.value.trim();
  const userAddress = (walletStore.address ?? "anon").toLowerCase();
  return `${agentId}::${userAddress}`;
});

async function restoreThread() {
  const agentId = agentIdParam.value.trim();
  if (!agentId) return;
  const userAddress = (walletStore.address ?? "anon").toLowerCase();
  const persisted = await loadChatBubbles({ agentId, userAddress, limit: 200 });
  bubbles.value = persisted.map((b) => ({
    id: b.id,
    direction: b.direction,
    text: b.text,
    kind: b.kind,
    cta: b.cta,
    computeVerified: b.computeVerified,
    chatId: b.chatId,
    createdAt: b.createdAt,
  }));
}

function isTransactionBubble(m: ChatBubble): boolean {
  return m.kind === "transaction" || m.cta?.action === "transaction";
}

function isX402Bubble(m: ChatBubble): boolean {
  return m.kind === "x402" || m.cta?.action === "x402";
}

function txnKindTitle(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Payment";
  const k = String((payload as Record<string, unknown>).kind ?? "")
    .trim()
    .toLowerCase();
  if (k === "recurrent") return "Subscription";
  if (k === "onetime") return "One-time payment";
  return "Payment";
}

function shortHexId(value: string): string {
  const s = value.trim();
  if (!s.startsWith("0x") || s.length < 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function txnDetailRows(payload: unknown): { label: string; value: string; }[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const rows: { label: string; value: string; }[] = [];
  const desc = typeof p.description === "string" ? p.description.trim() : "";
  if (desc) rows.push({ label: "Details", value: desc });
  const kind = String(p.kind ?? "")
    .trim()
    .toLowerCase();
  if (kind === "onetime") {
    const amount = String(p.amount ?? "").trim();
    const token = String(p.token ?? "").trim();
    if (amount || token) {
      const tokenShort = token ? shortHexId(token) : "";
      const value = [amount, tokenShort].filter(Boolean).join(" · ") || "—";
      rows.push({ label: "Amount", value });
    }
  }
  const merchant = typeof p.merchant === "string" ? p.merchant.trim() : "";
  if (merchant) rows.push({ label: "Merchant", value: shortHexId(merchant) });
  if (kind === "recurrent") {
    const sid = String(p.subscriptionId ?? "").trim();
    if (sid) rows.push({ label: "Plan", value: sid });
  }
  return rows;
}

function ctaButtonLabel(m: ChatBubble): string {
  if (m.ctaStatus === "sending") return "Processing…";
  if (m.ctaStatus === "success") return "Done";
  if (m.ctaStatus === "failed") return "Try again";
  if (m.cta?.action === "transaction") {
    const k = String((m.cta.payload as Record<string, unknown> | undefined)?.kind ?? "")
      .trim()
      .toLowerCase();
    return k === "recurrent" ? "Subscribe" : "Pay now";
  }
  return m.cta?.label ?? "Continue";
}

const chatMutation = useMutation({
  mutationFn: async (args: { message: string; previousMessages: AgentChatPreviousMessage[]; }): Promise<AgentChatResponse> => {
    const agentId = Number(agentIdParam.value);
    return getClientApi().chatWithAgent({
      agentId,
      message: args.message,
      userAddress: walletStore.address ?? undefined,
      previousMessages: args.previousMessages,
    });
  },
});

function buildPreviousMessagesForRequest(latestUserMessage: string): AgentChatPreviousMessage[] {
  // Use only persisted user/assistant bubbles; exclude the just-added outgoing bubble for this send.
  const items = bubbles.value
    .filter((b) => b.direction === "out" || b.direction === "in")
    .map((b) => ({
      role: (b.direction === "out" ? "user" : "assistant") as AgentChatPreviousMessage["role"],
      content: typeof b.text === "string" ? b.text : "",
      id: b.id,
    }));

  // Drop the most recent outgoing bubble if it's the one we just added for this send.
  const last = items[items.length - 1];
  if (last?.role === "user" && last.content.trim() === latestUserMessage.trim()) {
    items.pop();
  }

  return items
    .map(({ role, content }) => ({ role, content: content.trim() }))
    .filter((m) => !!m.content)
    .slice(-3);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDayMs(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDayLabel(ts: number) {
  const today0 = startOfDayMs(Date.now());
  const day0 = startOfDayMs(ts);
  const diffDays = Math.round((today0 - day0) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 6) {
    return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(ts));
  }
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(ts));
}

type TimelineRow =
  | { type: "day"; key: string; label: string; }
  | { type: "msg"; key: string; m: ChatBubble; time: string; };

const timeline = computed<TimelineRow[]>(() => {
  const rows: TimelineRow[] = [];
  let lastDay: string | null = null;
  for (const m of bubbles.value) {
    const ts = typeof m.createdAt === "number" ? m.createdAt : Date.now();
    const dk = dayKey(ts);
    if (dk !== lastDay) {
      rows.push({ type: "day", key: `day_${dk}`, label: formatDayLabel(ts) });
      lastDay = dk;
    }
    rows.push({ type: "msg", key: m.id, m: { ...m, createdAt: ts }, time: formatTime(ts) });
  }
  return rows;
});

function isNearBottom(el: HTMLElement) {
  const thresholdPx = 120;
  const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight);
  return remaining <= thresholdPx;
}

function onMsgsScroll() {
  const el = msgsEl.value;
  if (!el) return;
  stickToBottom.value = isNearBottom(el);
}

async function scrollToBottom(behavior: ScrollBehavior = "smooth") {
  await nextTick();
  // On mobile, layout/viewport can settle after the next frame (safe-area/keyboard).
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const container = msgsEl.value;
  if (container) {
    container.scrollTo({ top: container.scrollHeight, behavior });
    return;
  }
  endEl.value?.scrollIntoView({ behavior, block: "end" });
}

watch(
  () => bubbles.value.length,
  async () => {
    if (stickToBottom.value) await scrollToBottom();
  }
);

async function send() {
  const text = draft.value.trim();
  if (!text || chatMutation.isPending.value) return;
  draft.value = "";

  const outBubble: ChatBubble = { id: uid("out"), direction: "out", text, createdAt: Date.now() };
  bubbles.value = [...bubbles.value, outBubble];
  await appendChatBubble({
    agentId: agentIdParam.value.trim(),
    userAddress: (walletStore.address ?? "anon").toLowerCase(),
    bubble: outBubble,
  });
  stickToBottom.value = true;
  await scrollToBottom();

  const res: AgentChatResponse = await chatMutation
    .mutateAsync({ message: text, previousMessages: buildPreviousMessagesForRequest(text) })
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      return { type: "text", content: msg, error: msg } as AgentChatResponse;
    });

  let inText = res.content || "—";
  let cta: ChatBubble["cta"] | undefined = undefined;
  let inKind: ChatBubble["kind"] = res.type;

  if (res.type === "x402") {
    const payload = safeJsonParse<any>(res.content);
    if (payload && typeof payload === "object") {
      inText = typeof payload.text === "string" && payload.text.trim() ? payload.text : "<p>Payment required.</p>";
      cta = { label: "Pay", action: "x402", payload };
    } else {
      inKind = "text";
      inText = "<p>Could not read payment link. Please try again.</p>";
    }
  }

  if (res.type === "transaction") {
    const payload = safeJsonParse<any>(res.content);
    if (payload && typeof payload === "object") {
      inText = typeof payload.text === "string" && payload.text.trim() ? payload.text : "<p>Payment required.</p>";
      cta = { label: "Pay", action: "transaction", payload };
    } else {
      inKind = "text";
      inText = "<p>Could not read payment details. Please try again.</p>";
    }
  }

  const inBubble: ChatBubble = {
    id: uid("in"),
    direction: "in",
    text: inText,
    kind: inKind,
    cta,
    computeVerified: typeof res.compute?.verified === "boolean" ? res.compute.verified : undefined,
    chatId: res.compute?.chatId || undefined,
    createdAt: Date.now(),
  };

  bubbles.value = [...bubbles.value, inBubble];
  await appendChatBubble({
    agentId: agentIdParam.value.trim(),
    userAddress: (walletStore.address ?? "anon").toLowerCase(),
    bubble: inBubble,
  });
}

const invalidId = computed(() => {
  const n = Number(agentIdParam.value);
  return !!agentIdParam.value && !Number.isFinite(n);
});

onMounted(async () => {
  await restoreThread();
  stickToBottom.value = true;
  await scrollToBottom();
});

watch(
  () => threadKey.value,
  async () => {
    await restoreThread();
    stickToBottom.value = true;
    await scrollToBottom();
  }
);
</script>

<template>
  <div class="page">
    <header class="top sticky-top">
      <AppFrame :topInset="false">
        <div class="top__inner">
          <button type="button" class="icon-btn" aria-label="Back" @click="router.back()">
            <ChevronLeftIcon />
          </button>
          <button type="button" class="title" aria-label="Open agent details" :disabled="!agent"
            @click="infoOpen = true">
            <img class="avatar" :src="agentCardFromUri(agent?.uri ?? null)?.image || AGENT_AVATAR_DEFAULT" width="34"
              height="34" alt="" />
            <div class="title-txt">
              <p class="name">{{ agent ? agentDisplayName(agent) : "Agent" }}</p>
              <p class="sub">Chat</p>
            </div>
          </button>
          <span class="sp" />
        </div>
      </AppFrame>
    </header>

    <AppFrame class="content" :topInset="false">
      <div class="wrap">
        <p v-if="invalidId" class="warn">Invalid agent id.</p>
        <p v-else-if="agentQuery.isFetching.value && !agent" class="muted">Loading…</p>
        <p v-else-if="!agent" class="warn">Agent not found.</p>

        <div v-else ref="msgsEl" class="msgs" aria-label="Chat messages" @scroll="onMsgsScroll">
          <div class="intro">
            <p class="intro-title">Chat</p>
            <p class="intro-copy">Ask the agent anything.</p>
          </div>

          <div v-for="row in timeline" :key="row.key">
            <div v-if="row.type === 'day'" class="day-sep" aria-hidden="true">
              <span class="day-sep__pill">{{ row.label }}</span>
            </div>
            <div v-else class="msg-row" :class="row.m.direction === 'out' ? 'msg-row--out' : 'msg-row--in'">
              <div class="bubble" :class="[
                row.m.direction === 'out' ? 'out' : 'in',
                row.m.direction === 'in' && isTransactionBubble(row.m) ? 'bubble--transaction' : '',
                row.m.direction === 'in' && isX402Bubble(row.m) && !isTransactionBubble(row.m) ? 'bubble--x402' : '',
              ]">
                <p v-if="row.m.direction === 'out'" class="txt">{{ row.m.text }}</p>
                <template v-else>
                  <div v-if="isTransactionBubble(row.m)" class="txn-offer">
                    <p class="txn-kind">{{ txnKindTitle(row.m.cta?.payload) }}</p>
                    <div class="txt txn-body" v-html="row.m.text"></div>
                    <dl v-if="txnDetailRows(row.m.cta?.payload).length" class="txn-kv">
                      <template v-for="(r, idx) in txnDetailRows(row.m.cta?.payload)" :key="idx">
                        <dt>{{ r.label }}</dt>
                        <dd>{{ r.value }}</dd>
                      </template>
                    </dl>
                  </div>
                  <div v-else class="txt" v-html="row.m.text"></div>
                </template>

                <button v-if="row.m.direction === 'in' && row.m.cta" type="button" class="cta"
                  :class="row.m.cta.action === 'transaction' ? 'cta--transaction' : ''"
                  :disabled="row.m.ctaStatus === 'sending' || row.m.ctaStatus === 'success'" @click="runCta(row.m)">
                  {{ ctaButtonLabel(row.m) }}
                </button>
                <p v-if="row.m.direction === 'in' && row.m.ctaStatus === 'failed' && row.m.ctaError" class="cta-err">
                  {{ row.m.ctaError }}
                </p>
                <div v-if="row.m.direction === 'in' && row.m.chatId" class="meta">
                  <span class="meta-kv">
                    <span class="meta-k">chatId</span>
                    <span class="meta-v v-mono">{{ row.m.chatId }}</span>
                  </span>
                </div>
              </div>

              <div class="msg-time" :class="row.m.direction === 'out' ? 'msg-time--out' : 'msg-time--in'">
                <span class="time">{{ row.time }}</span>
                <template v-if="row.m.direction === 'in' && row.m.computeVerified === true">
                  <span class="time-sep" aria-hidden="true">•</span>
                  <span class="time-verified">Compute verified</span>
                </template>
              </div>
            </div>
          </div>
          <div v-if="chatMutation.isPending.value" class="msg-row msg-row--in" aria-label="Agent typing">
            <div class="bubble in">
              <div class="typing" aria-hidden="true">
                <span class="typing-dot" />
                <span class="typing-dot" />
                <span class="typing-dot" />
              </div>
            </div>
          </div>
          <div ref="endEl" aria-hidden="true" />
        </div>

        <form class="composer" @submit.prevent="send">
          <textarea v-model="draft" class="input" rows="1" placeholder="Message…" :disabled="!agent"
            @focus="stickToBottom = true; scrollToBottom('auto')"
            @keydown.enter.exact.prevent="send" />
          <button type="submit" class="send" :disabled="!agent || !draft.trim() || chatMutation.isPending.value">
            {{ chatMutation.isPending.value ? "…" : "Send" }}
          </button>
        </form>
      </div>
    </AppFrame>

    <BottomSheet v-model="infoOpen" title="Agent details">
      <div v-if="agent" class="info">
        <div class="info-top">
          <img class="info-avatar" :src="agentCardFromUri(agent.uri)?.image || AGENT_AVATAR_DEFAULT" width="56"
            height="56" alt="" />
          <div class="info-main">
            <p class="info-name">{{ agentDisplayName(agent) }}</p>
            <p class="info-desc">{{ agentDisplayDescription(agent) }}</p>
          </div>
        </div>

        <section class="kv" aria-label="Agent status">
          <div class="kv-row">
            <span class="k">Agent id</span>
            <span class="v v-mono">#{{ agent.agentId.toString() }}</span>
          </div>
          <div class="kv-row">
            <span class="k">Owner</span>
            <span class="v v-mono">{{ agent.owner }}</span>
          </div>
          <div class="kv-row">
            <span class="k">Agent wallet</span>
            <span class="v v-mono">{{ agent.agentWallet ?? "—" }}</span>
          </div>
          <div class="kv-row">
            <span class="k">Card active</span>
            <span class="v">{{ typeof card?.active === "boolean" ? (card.active ? "Yes" : "No") : "—" }}</span>
          </div>
          <div class="kv-row">
            <span class="k">x402</span>
            <span class="v">{{
              typeof card?.x402Support === "boolean"
                ? (card.x402Support ? "Supported" : "Not supported")
                : "—"
            }}</span>
          </div>
        </section>

        <section v-if="trustList.length" class="kv" aria-label="Supported trust">
          <div class="kv-row">
            <span class="k">Trust</span>
            <span class="v">{{ trustList.join(", ") }}</span>
          </div>
        </section>

        <section v-if="services.length" class="kv" aria-label="Services">
          <div class="kv-row">
            <span class="k">Services</span>
            <span class="v"> </span>
          </div>
          <div v-for="(s, idx) in services" :key="idx" class="svc">
            <p class="svc-name">{{ s.name || "Service" }}</p>
            <p v-if="s.endpoint" class="svc-sub v-mono">{{ s.endpoint }}</p>
            <p v-if="s.version" class="svc-sub">v{{ s.version }}</p>
          </div>
        </section>

        <section class="kv" aria-label="Raw card">
          <div class="kv-row">
            <span class="k">URI</span>
            <span class="v v-mono v-pre">{{ agent.uri || "—" }}</span>
          </div>
        </section>
      </div>
    </BottomSheet>

    <BottomSheet v-model="splitPaymentsOpen" title="Split payment">
      <SplitPayments
        variant="sheet"
        @close="splitPaymentsOpen = false; splitForBubbleId = null"
        @confirmed="onSplitPaymentConfirmed"
      />
    </BottomSheet>
  </div>
</template>

<style scoped>
.page {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px 0 0;
  color: var(--tx-normal);
}

.top {
  padding-bottom: 10px;
  border-bottom: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  position: sticky;
  top: 0;
  z-index: 30;
  margin-top: 0;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 0 10px;
  background: var(--frost-bg, rgba(22, 22, 24, 0.78));
  backdrop-filter: blur(24px) saturate(1.65);
  -webkit-backdrop-filter: blur(24px) saturate(1.65);
}

.top__inner {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;
  width: 100%;
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

.title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 4px 6px;
  margin: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-12);
  -webkit-tap-highlight-color: transparent;
}

.title:disabled {
  cursor: default;
  opacity: 0.8;
}

.avatar {
  border-radius: 12px;
  border: 1px solid var(--bg-lightest);
  object-fit: cover;
  flex-shrink: 0;
}

.title-txt {
  min-width: 0;
}

.name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--tx-dimmed);
  font-weight: 700;
}

.msgs {
  flex: 1 1 auto;
  padding: 14px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.day-sep {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 6px 0 4px;
  pointer-events: none;
}

.day-sep__pill {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
  padding: 6px 10px;
  border-radius: 999px;
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(22, 22, 24, 0.62);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
}

.intro {
  padding: 12px 14px;
  border-radius: var(--radius-14);
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.14);
  margin-bottom: 4px;
}

.intro-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.intro-copy {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--tx-semi);
}

.bubble {
  max-width: 86%;
  width: fit-content;
  min-width: 80px;
  padding: 11px 12px;
  border-radius: 16px;
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.18);
  box-shadow: var(--native-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.35));
}

.bubble.in {
  align-self: flex-start;
  border-top-left-radius: 10px;
}

.bubble.out {
  align-self: flex-end;
  background: rgba(245, 95, 20, 0.12);
  border-color: rgba(245, 95, 20, 0.35);
  border-top-right-radius: 10px;
}

.bubble.bubble--transaction {
  border-color: rgba(120, 200, 255, 0.35);
  background: linear-gradient(165deg, rgba(40, 90, 140, 0.22), rgba(0, 0, 0, 0.2));
  max-width: 92%;
}

.bubble.bubble--x402 {
  border-color: rgba(245, 95, 20, 0.4);
  background: linear-gradient(165deg, rgba(245, 95, 20, 0.14), rgba(0, 0, 0, 0.18));
}

.txn-offer {
  display: grid;
  gap: 10px;
}

.txn-kind {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(170, 220, 255, 0.95);
}

.txn-body {
  margin: 0;
}

.txn-kv {
  margin: 0;
  padding: 10px 10px;
  border-radius: 12px;
  border: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  background: rgba(0, 0, 0, 0.2);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 12px;
  align-items: baseline;
  font-size: 12px;
}

.txn-kv dt {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 10px;
  color: var(--tx-dimmed);
}

.txn-kv dd {
  margin: 0;
  color: var(--tx-semi);
  word-break: break-word;
}

.txt {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--tx-normal);
  white-space: pre-wrap;
  word-break: break-word;
}

.txt :deep(p:first-child) {
  margin-top: 0;
}

.txt :deep(p:last-child) {
  margin-bottom: 0;
}

.time {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.42);
}

.msg-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg-row--in {
  align-items: flex-start;
}

.msg-row--out {
  align-items: flex-end;
}

.msg-time {
  max-width: 86%;
  padding: 0 4px;
}

.msg-time--in {
  text-align: left;
}

.msg-time--out {
  text-align: right;
}

.msg-time--out .time {
  color: rgba(245, 95, 20, 0.78);
}

.msg-time--in .time {
  color: rgba(255, 255, 255, 0.42);
}

.time-sep {
  padding: 0 6px;
  color: rgba(255, 255, 255, 0.35);
}

.time-verified {
  color: rgba(190, 255, 205, 0.95);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.typing {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 14px;
  padding: 2px 0;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  animation: typing-bounce 1.05s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.14s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.28s;
}

@keyframes typing-bounce {

  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.55;
  }

  40% {
    transform: translateY(-4px);
    opacity: 0.95;
  }
}

.cta {
  margin-top: 10px;
  width: 100%;
  min-height: var(--native-tap, 44px);
  height: 44px;
  border: none;
  border-radius: 12px;
  background: var(--primary);
  color: var(--tx-normal);
  font-weight: 800;
  cursor: pointer;
}

.cta:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.cta--transaction {
  background: linear-gradient(180deg, rgba(100, 180, 255, 0.95), rgba(70, 140, 220, 0.98));
  color: rgba(12, 18, 28, 0.98);
}

.cta-err {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: rgba(255, 200, 197, 0.95);
}

.meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.meta-kv {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  font-size: 12px;
  color: var(--tx-dimmed);
}

.meta-k {
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 10px;
  color: var(--tx-dimmed);
}

.meta-v {
  color: var(--tx-semi);
  word-break: break-all;
}

.composer {
  display: grid;
  grid-template-columns: 1fr 78px;
  gap: 10px;
  padding-top: 10px;
  border-top: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
  position: sticky;
  bottom: 0;
  z-index: 20;
  padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));
  background: var(--bg);
}

.input {
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid var(--bg-lightest);
  background: rgba(0, 0, 0, 0.16);
  color: var(--tx-normal);
  padding: 12px 14px;
  outline: none;
  font-size: 16px;
  line-height: 1.35;
  resize: none;
  max-height: 130px;
  box-sizing: border-box;
}

.send {
  height: 46px;
  border: none;
  border-radius: 14px;
  background: var(--primary);
  color: var(--tx-normal);
  font-weight: 800;
  cursor: pointer;
}

.send:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.muted {
  font-size: 14px;
  color: var(--tx-dimmed);
}

.warn {
  font-size: 14px;
  color: var(--tx-semi);
}

.info {
  display: grid;
  gap: 14px;
  color: var(--tx-normal);
}

.info-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-avatar {
  border-radius: var(--radius-14);
  border: 1px solid var(--bg-lightest);
  object-fit: cover;
  flex-shrink: 0;
}

.info-main {
  min-width: 0;
}

.info-name {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.info-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--tx-semi);
}

.kv {
  border: 1px solid var(--bg-lightest);
  border-radius: var(--radius-14);
  background: rgba(0, 0, 0, 0.12);
  padding: 12px 12px;
  display: grid;
  gap: 10px;
}

.kv-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  align-items: start;
}

.k {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx-dimmed);
}

.v {
  font-size: 13px;
  color: var(--tx-normal);
  word-break: break-word;
}

.v-mono {
  font-variant-numeric: tabular-nums;
}

.v-pre {
  white-space: pre-wrap;
  word-break: break-word;
}

.svc {
  padding-top: 8px;
  border-top: 0.5px solid var(--hairline, rgba(255, 255, 255, 0.09));
}

.svc-name {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--tx-normal);
}

.svc-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--tx-semi);
}
</style>
