import type { Hex } from "viem";
import { formatUnits, zeroAddress } from "viem";
import { zeroGMainnet } from "viem/chains";
import type { SubscriptionPlan, Transaction } from '@railbeam/beam-ts';
import { TransactionStatus, TransactionType } from '@railbeam/beam-ts';
import { getToken } from '@railbeam/beam-ts';
import {
  DEFAULT_PLACEHOLDER_IMAGE,
  USER_AVATAR_OTHER,
  USER_AVATAR_SELF,
} from "@/constants/ui";
import Converter from "@/scripts/converter";

export type ShellTxRow = {
  id: string;
  title: string;
  sub: string;
  amount: string;
  tone: "green" | "red";
  img: string;
  token?: Hex;
  pendingYou?: boolean;
  payers?: Hex[];
  amountsWei?: bigint[];
  detailDate?: string;
  detailNetwork?: string;
};

export type ShellSubRow = {
  id: string;
  name: string;
  cadence: string;
  next: string;
  nextSummary: string;
  amount: string;
  img: string;
  status: string;
  merchant: string;
  planId: string;
  started: string;
  network: string;
  description: string;
  token?: Hex;
};

function toBigInt(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number")
    return Number.isFinite(v) ? BigInt(Math.trunc(v)) : 0n;
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

function shortAddr(h: Hex): string {
  if (!h || h.length < 12) return h ?? "—";
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

function relativeAgo(seconds: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - seconds));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / 86400 / 7)}w ago`;
}

function trimZeros(v: string): string {
  if (!v.includes(".")) return v;
  return v.replace(/\.?0+$/, "");
}

function intervalLabel(seconds: number): string {
  const d = seconds / 86400;
  if (d >= 6 && d <= 8) return "Weekly";
  if (d >= 25 && d <= 35) return "Monthly";
  if (d < 1 && seconds > 0) return "Sub-daily";
  if (seconds <= 0) return "Custom";
  return `${Math.round(d)}-day`;
}

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

export function mapTransactionToShellRow(
  tx: Transaction,
  wallet: Hex | null,
): ShellTxRow {
  const tsSec = Number(tx.blockTimestamp);
  const date = new Date(tsSec * 1000);
  const w = wallet?.toLowerCase() ?? "";
  const received =
    !!w &&
    (tx.confirmations ?? []).some(
      (c) => !w.includes(tx.payer) && c.recipient.toLowerCase() === w,
    );
  const tone: "green" | "red" = received ? "green" : "red";
  const title = received
    ? "Received"
    : tx.type === TransactionType.Recurrent
      ? "Subscription"
      : tx.description?.trim() || "Payment";

  const amountsWei =
    tx.amounts?.length > 0 ? tx.amounts.map((a) => toBigInt(a)) : undefined;
  const amountBi =
    amountsWei && amountsWei.length > 0
      ? amountsWei.reduce((acc, a) => acc + a, 0n)
      : toBigInt(tx.adjustedAmount);
  const tok = getToken(tx.adjustedToken);
  const decimals = tok?.decimals ?? 18;
  const symbol = tok?.symbol ?? "TOKEN";
  const units = trimZeros(formatUnits(amountBi, decimals));
  const amount = `${received ? "+" : "-"}${units} ${symbol}`;

  const payerIsViewer =
    !!w && (tx.payers ?? []).some((p) => p.toLowerCase() === w);
  const viewerPaid =
    !!w && (tx.confirmations ?? []).some((c) => c.from.toLowerCase() === w);

  const payers = tx.payers?.length > 0 ? (tx.payers as Hex[]) : undefined;

  return {
    id: tx.id,
    title,
    sub: `${shortAddr(tx.merchant)} · ${relativeAgo(tsSec)}`,
    amount,
    tone,
    img: received ? USER_AVATAR_OTHER : USER_AVATAR_SELF,
    token: tx.adjustedToken,
    pendingYou: payerIsViewer && !viewerPaid,
    payers,
    amountsWei,
    detailDate: Converter.fullMonth(date),
    detailNetwork: zeroGMainnet.name,
  };
}

export function mapSubscriptionToShellRow(
  plan: SubscriptionPlan,
  latestTx: Transaction | null,
): ShellSubRow {
  const interval = Number(plan.interval);
  const cadence = intervalLabel(interval);
  const amountBi = toBigInt(plan.amount);
  const tok = getToken(plan.token);
  const decimals = tok?.decimals ?? 18;
  const symbol = tok?.symbol ?? "TOKEN";
  const units = trimZeros(formatUnits(amountBi, decimals));
  const amount = `${units} ${symbol}`;

  const computedDueSec =
    Number(plan.blockTimestamp) > 0 && interval > 0
      ? Number(plan.blockTimestamp) + interval
      : 0;
  const dueSec = latestTx ? Number(latestTx.dueDate) : computedDueSec;
  let next = "—";
  let nextSummary = "—";
  if (dueSec > 0) {
    const d = new Date(dueSec * 1000);
    next = Converter.fullMonth(d);
    nextSummary = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  const startedSec = Number(plan.blockTimestamp);
  const started =
    startedSec > 0
      ? new Date(startedSec * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const st = latestTx?.status ?? TransactionStatus.Active;

  return {
    id: plan.subsciptionId,
    name: plan.description?.trim()?.slice(0, 48) || "Subscription",
    cadence,
    next,
    nextSummary,
    amount,
    img: DEFAULT_PLACEHOLDER_IMAGE,
    status: statusLabel(st),
    merchant: shortAddr(plan.merchant),
    planId: plan.subsciptionId,
    started,
    network: zeroGMainnet.name,
    description: plan.description || "",
    token: plan.token,
  };
}

export async function buildShellSubscriptions(
  txs: Transaction[],
  getSubscription: (id: Hex) => Promise<SubscriptionPlan | null>,
): Promise<ShellSubRow[]> {
  const recurrent = txs.filter(
    (t) =>
      t.type === TransactionType.Recurrent &&
      t.subscriptionId != null &&
      t.subscriptionId.toLowerCase() !== zeroAddress,
  );
  const bySub = new Map<string, Transaction>();
  for (const t of recurrent) {
    const sid = t.subscriptionId as string;
    const prev = bySub.get(sid);
    if (!prev || BigInt(t.timestamp) > BigInt(prev.timestamp)) {
      bySub.set(sid, t);
    }
  }

  const rows: ShellSubRow[] = [];
  for (const [subId, tx] of bySub) {
    const plan = await getSubscription(subId as Hex);
    if (!plan || plan.trashed) continue;
    rows.push(mapSubscriptionToShellRow(plan, tx));
  }
  return rows;
}
