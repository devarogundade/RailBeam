import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Zap,
  CreditCard,
  Users,
  Receipt,
  Landmark,
  Plus,
} from "lucide-react";
import {
  useMyActiveSubscribedChainAgentIds,
  useStardormRecentSubscriptions,
} from "@/lib/hooks/use-stardorm-subgraph";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { BEAM_CHAIN_IDS, BEAM_TOKENS, beamNetworkFromChainId, beamNetworkLabelFromChainId } from "@/lib/beam-chain-config";
import { getStardormSubgraphUrlForChain, getStardormPaymentTokenDecimals } from "@/lib/stardorm-subgraph-config";
import {
  formatCompactFromBaseUnits,
  formatSubgraphDateTime,
  formatSubgraphRelativeTime,
  shortenHex,
} from "@/lib/format-subgraph";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchStardormCreditCards,
  fetchStardormCreditCardSensitiveDetails,
  fetchCreditCardFundQuote,
  fundStardormCreditCardViaX402,
  fetchStardormFinancialSnapshots,
  fetchStardormKycStatus,
  fetchStardormOnRamps,
  fetchStardormPaymentRequests,
  isStardormInferenceEnabled,
  withdrawStardormCreditCard,
} from "@/lib/stardorm-api";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { Badge } from "@/components/ui/badge";
import type { CreditCardPublic, FinancialSnapshotDailyRow, OnRampRecord, PublicPaymentRequest, UserKycStatus } from "@railbeam/stardorm-api-contract";
import { toast } from "sonner";
import { parseAgentUriFromString } from "@/lib/agent-uri-metadata";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/empty-state";
import { queryKeys } from "@/lib/query-keys";
import {
  DashboardListSkeleton,
  DashboardOnRampsListSkeleton,
  DashboardPaymentRequestsSkeleton,
  PageRoutePending,
  VirtualCardsPanelSkeleton,
} from "@/components/page-shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { CreatePaymentLinkDialog } from "@/components/create-payment-link-dialog";
import { VirtualCardFundsDialog } from "@/components/virtual-card-funds-dialog";
import { VirtualCardBillingDialog } from "@/components/virtual-card-billing-dialog";
import { VirtualCardFundsActions } from "@/components/virtual-card-funds-actions";
import { VirtualCreditCard } from "@/components/virtual-credit-card";
import { X402PaymentLinkCopyButtons } from "@/components/x402-payment-link-actions";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  pendingComponent: () => <PageRoutePending variant="default" />,
});

function Dashboard() {
  const { hired, balance } = useApp();
  const { address } = useAccount();
  const { effectiveChainId } = useBeamNetwork();
  const monthly = hired.reduce((s, a) => {
    const p = a.pricePerMonth;
    return p != null && Number.isFinite(p) ? s + p : s;
  }, 0);
  const anyListedPrices = hired.some((a) => a.pricePerMonth != null);
  const subgraphUrl = getStardormSubgraphUrlForChain(effectiveChainId);
  const [subsScope, setSubsScope] = React.useState<"all" | "mine">("all");
  const tokenDecimals = getStardormPaymentTokenDecimals();
  const subsUser =
    subsScope === "mine" && address ? (address.toLowerCase() as `0x${string}`) : undefined;
  const { data: subscriptions, isPending: subsPending, isError: subsError } =
    useStardormRecentSubscriptions({ user: subsUser, limit: 20 });

  const walletKey = address ? (address.toLowerCase() as `0x${string}`) : null;
  const myActiveIndexed = useMyActiveSubscribedChainAgentIds(walletKey);
  const [dashTab, setDashTab] = React.useState("virtual-cards");
  const stardormSession = isStardormInferenceEnabled();

  React.useEffect(() => {
    if (!address && subsScope === "mine") setSubsScope("all");
  }, [address, subsScope]);

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm uppercase tracking-wider text-muted-foreground">
              Treasury
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">Financial dashboard</h1>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi
            label="Wallet balance"
            value={`${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} 0G`}
            icon={<CoinIcon className="h-4 w-4" />}
          />
          <Kpi
            label="Active agents"
            value={`${hired.length}`}
            icon={<Zap className="h-4 w-4 text-primary" />}
          />
          <Kpi
            label="Listed monthly total"
            value={anyListedPrices ? `${monthly.toLocaleString()} 0G` : "—"}
            icon={<CoinIcon className="h-4 w-4" />}
            delta={
              anyListedPrices
                ? "Sum of listed monthly prices for your hired agents when available."
                : undefined
            }
          />
        </div>

        <Tabs value={dashTab} onValueChange={setDashTab} className="mt-6">
          <TabsList className="h-auto min-h-9 w-full flex-wrap justify-start gap-1 bg-muted p-1">
            <TabsTrigger value="virtual-cards">Virtual cards</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
            <TabsTrigger value="on-ramp">On Ramp</TabsTrigger>
          </TabsList>

          <TabsContent value="virtual-cards" className="mt-4">
            <CreditCardsPanel stardormSession={stardormSession} />
          </TabsContent>

          <TabsContent value="payments" className="mt-4 space-y-6">
            <DashboardPaymentRequests enabled={stardormSession && dashTab === "payments"} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground lg:col-span-2">
                <div className="font-medium text-foreground">Revenue</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Completed payment links and checkouts where your wallet is the payee (daily UTC rollup).
                </p>
                <PaymentLinkRevenueChart enabled={Boolean(stardormSession && dashTab === "payments")} />
              </div>

              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Spend by category</div>
                <p className="mt-2">
                  Category breakdown needs labeled spend from billing. The KPI row shows the sum of any
                  listed monthly fees for hired agents when prices are available.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">Employees</div>
                  <p className="text-[11px] text-muted-foreground">
                    Recent employee payments.
                  </p>
                  {subgraphUrl && address ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Active hires for this wallet:{" "}
                      {myActiveIndexed.isPending
                        ? "…"
                        : String(myActiveIndexed.data?.length ?? 0)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {address ? (
                    <div className="flex rounded-md border border-border p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSubsScope("all")}
                        className={cn(
                          "rounded px-2 py-1 transition-colors",
                          subsScope === "all"
                            ? "bg-pill text-pill-foreground"
                            : "text-muted-foreground hover:bg-(--bg-hover)",
                        )}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubsScope("mine")}
                        className={cn(
                          "rounded px-2 py-1 transition-colors",
                          subsScope === "mine"
                            ? "bg-pill text-pill-foreground"
                            : "text-muted-foreground hover:bg-(--bg-hover)",
                        )}
                      >
                        My wallet
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {!subgraphUrl ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Employee activity is not available in this version of the app.
                </p>
              ) : subsError ? (
                <p className="mt-3 text-sm text-destructive">
                  Could not load employee activity. Try again later.
                </p>
              ) : subsPending ? (
                <DashboardListSkeleton rows={5} />
              ) : !subscriptions?.length ? (
                <div className="mt-3">
                  <EmptyState
                    icon={Users}
                    title="No employee activity yet"
                    description="When agents receive payments through the network, they will appear in this list. Hire from the marketplace and complete a paid flow to see history here."
                  />
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-border text-sm">
                  {subscriptions.map((row) => {
                    const paid = formatCompactFromBaseUnits(row.paidAmount, tokenDecimals);
                    const rel = formatSubgraphRelativeTime(row.blockTimestamp);
                    const abs = formatSubgraphDateTime(row.blockTimestamp);
                    const agentUri = parseAgentUriFromString(row.agent?.uri);
                    return (
                      <li key={row.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-medium">{agentUri?.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {shortenHex(row.user)} ·{" "}
                            <span title={abs} className="cursor-default">
                              {rel}
                            </span>
                          </div>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-success sm:justify-end">
                          <ArrowUpRight className="h-3 w-3" />
                          <CoinIcon className="h-3.5 w-3.5" />+{paid} 0G
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="kyc" className="mt-4">
            <DashboardKyc enabled={stardormSession && dashTab === "kyc"} />
          </TabsContent>

          <TabsContent value="on-ramp" className="mt-4">
            <DashboardOnRamps enabled={stardormSession && dashTab === "on-ramp"} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const KYC_STATUS_LABEL: Record<UserKycStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  processing: "Processing",
  verified: "Verified",
  requires_input: "Requires input",
  canceled: "Canceled",
};

const KYC_STATUS_BADGE: Record<
  UserKycStatus,
  { className: string; dotClassName: string; pulse?: boolean }
> = {
  not_started: {
    className: "border-border/80 bg-muted/50 text-muted-foreground",
    dotClassName: "bg-muted-foreground/60",
  },
  pending: {
    className: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300",
    dotClassName: "bg-amber-500",
    pulse: true,
  },
  processing: {
    className: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-300",
    dotClassName: "bg-sky-500",
    pulse: true,
  },
  verified: {
    className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
  },
  requires_input: {
    className: "border-orange-500/35 bg-orange-500/10 text-orange-900 dark:text-orange-300",
    dotClassName: "bg-orange-500",
  },
  canceled: {
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
};

function KycStatusBadge({ status }: { status: UserKycStatus }) {
  const style = KYC_STATUS_BADGE[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 border px-2.5 py-0 text-xs font-medium normal-case tracking-normal shadow-none",
        style.className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", style.dotClassName, style.pulse && "animate-pulse")}
        aria-hidden
      />
      {KYC_STATUS_LABEL[status]}
    </Badge>
  );
}

const PAYMENT_REQUEST_STATUS_LABEL: Record<PublicPaymentRequest["status"], string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  expired: "Expired",
  cancelled: "Cancelled",
};

const PAYMENT_REQUEST_STATUS_BADGE: Record<
  PublicPaymentRequest["status"],
  { className: string; dotClassName: string; pulse?: boolean }
> = {
  pending: {
    className: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300",
    dotClassName: "bg-amber-500",
    pulse: true,
  },
  paid: {
    className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
  },
  expired: {
    className: "border-muted-foreground/35 bg-muted/50 text-muted-foreground",
    dotClassName: "bg-muted-foreground/60",
  },
  cancelled: {
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
};

function PaymentRequestStatusBadge({ status }: { status: PublicPaymentRequest["status"] }) {
  const style = PAYMENT_REQUEST_STATUS_BADGE[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 border px-2.5 py-0 text-xs font-medium normal-case tracking-normal shadow-none",
        style.className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", style.dotClassName, style.pulse && "animate-pulse")}
        aria-hidden
      />
      {PAYMENT_REQUEST_STATUS_LABEL[status]}
    </Badge>
  );
}

const PAYMENT_REQUEST_TYPE_BADGE: Record<
  PublicPaymentRequest["type"],
  { label: string; className: string; dotClassName: string }
> = {
  "on-chain": {
    label: "Direct checkout",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-300",
    dotClassName: "bg-sky-500",
  },
  x402: {
    label: "x402",
    className: "border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-300",
    dotClassName: "bg-violet-500",
  },
};

function PaymentRequestTypeBadge({ type }: { type: PublicPaymentRequest["type"] }) {
  const cfg = PAYMENT_REQUEST_TYPE_BADGE[type];
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 border px-2 py-0 text-[11px] font-medium normal-case tracking-normal shadow-none",
        cfg.className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", cfg.dotClassName)} aria-hidden />
      {cfg.label}
    </Badge>
  );
}

function formatTokenWeiHuman(wei: string, decimals: number): string {
  try {
    const s = formatUnits(BigInt(wei), decimals);
    const n = Number.parseFloat(s);
    if (!Number.isFinite(n)) return wei;
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return n.toExponential(2);
    if (abs >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
    return n.toLocaleString(undefined, { maximumSignificantDigits: 6 });
  } catch {
    return wei;
  }
}

function chainIdFromPaymentNetwork(network: string): number | undefined {
  const m = /^eip155:(\d+)$/i.exec(network.trim());
  if (!m) return undefined;
  const id = Number.parseInt(m[1]!, 10);
  return Number.isFinite(id) ? id : undefined;
}

function tokenSymbolFromKnownAssets(assetTrimmed: string): string | undefined {
  const lower = assetTrimmed.toLowerCase();
  for (const t of BEAM_TOKENS.mainnet) {
    if (t.address.toLowerCase() === lower) return t.symbol;
  }
  for (const t of BEAM_TOKENS.testnet) {
    if (t.address.toLowerCase() === lower) return t.symbol;
  }
  return undefined;
}

function beamTxExplorerUrl(chainId: number, txHash: string): string | undefined {
  if (!/^0x[a-fA-F0-9]{64}$/i.test(txHash.trim())) return undefined;
  const tier = beamNetworkFromChainId(chainId);
  const h = txHash.trim();
  if (tier === "mainnet") return `https://chainscan.0g.ai/tx/${h}`;
  if (tier === "testnet") return `https://chainscan-testnet.0g.ai/tx/${h}`;
  return undefined;
}

function formatPaymentAmountDisplay(row: PublicPaymentRequest): string {
  const asset = row.asset.trim();
  const sym = tokenSymbolFromKnownAssets(asset);
  if (row.decimals != null && row.decimals >= 0) {
    try {
      const human = formatTokenWeiHuman(row.amount, row.decimals);
      if (sym) return `${human} ${sym}`;
      if (/^0x[a-fA-F0-9]{40}$/i.test(asset)) {
        return `${human} (${shortenHex(asset)})`;
      }
      return `${human} (${asset})`;
    } catch {
      /* fall through */
    }
  }
  if (sym) return `${row.amount} ${sym} (raw units)`;
  if (/^0x[a-fA-F0-9]{40}$/i.test(asset)) return `${row.amount} — token ${shortenHex(asset)}`;
  return `${row.amount} — ${asset}`;
}

function PaymentRequestMetaBlock({ row }: { row: PublicPaymentRequest }) {
  const chainId = chainIdFromPaymentNetwork(row.network);
  const networkName = chainId != null ? beamNetworkLabelFromChainId(chainId) : row.network;
  const caip2 = row.network.trim().startsWith("eip155:") ? row.network.trim() : null;
  const explorerUrl =
    chainId != null && row.txHash ? beamTxExplorerUrl(chainId, row.txHash) : undefined;
  const payToLabel = /^0x[a-fA-F0-9]{40}$/i.test(row.payTo.trim())
    ? shortenHex(row.payTo.trim())
    : row.payTo;

  return (
    <div className="mt-2 space-y-2 text-[11px] leading-snug">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded-md border border-border/60 bg-surface-elevated/50 px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Amount
          </div>
          <div className="mt-0.5 text-sm font-medium text-foreground">{formatPaymentAmountDisplay(row)}</div>
        </div>
        <div className="min-w-0 rounded-md border border-border/60 bg-surface-elevated/50 px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Network
          </div>
          <div className="mt-0.5 font-medium text-foreground">{networkName}</div>
          {caip2 ? (
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/90" title={caip2}>
              {caip2}
            </div>
          ) : null}
        </div>
      </div>
      <div className="rounded-md border border-border/60 bg-surface-elevated/50 px-2.5 py-2">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Pay to
        </div>
        <div className="mt-0.5 break-all font-mono text-foreground/95" title={row.payTo}>
          {payToLabel}
        </div>
      </div>
      {row.paidByWallet?.trim() ? (
        <div className="rounded-md border border-border/60 bg-surface-elevated/50 px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Payer wallet
          </div>
          <div
            className="mt-0.5 break-all font-mono text-foreground/95"
            title={row.paidByWallet.trim()}
          >
            {/^0x[a-fA-F0-9]{40}$/i.test(row.paidByWallet.trim())
              ? shortenHex(row.paidByWallet.trim())
              : row.paidByWallet.trim()}
          </div>
        </div>
      ) : null}
      {row.txHash?.trim() ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-border/60 bg-surface-elevated/50 px-2.5 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Settlement
          </span>
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-mono text-sm text-primary underline-offset-2 hover:underline"
              title={row.txHash.trim()}
            >
              {shortenHex(row.txHash.trim())}
              <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
            </a>
          ) : (
            <span className="font-mono text-sm text-foreground/90" title={row.txHash.trim()}>
              {shortenHex(row.txHash.trim())}
            </span>
          )}
          {explorerUrl ? (
            <span className="text-[10px] text-muted-foreground">View on 0G Chainscan</span>
          ) : null}
        </div>
      ) : null}
      {row.resourceUrl?.trim() ? (
        <div className="truncate rounded-md border border-border/60 bg-surface-elevated/50 px-2.5 py-2 text-muted-foreground">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Linked resource
          </span>
          <div className="mt-1 min-w-0">
            <a
              href={row.resourceUrl.trim()}
              className="text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer noopener"
              title={row.resourceUrl.trim()}
            >
              {row.resourceUrl.trim()}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function onRampBadgeVariant(
  s: OnRampRecord["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (s === "fulfilled") return "default";
  if (s === "failed") return "destructive";
  if (s === "canceled") return "outline";
  return "secondary";
}

const REVENUE_CHART_DAYS = 30;

function utcCalendarDayKey(daysBackFromToday: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysBackFromToday);
  return d.toISOString().slice(0, 10);
}

function buildPaymentLinkRevenueChartData(rows: FinancialSnapshotDailyRow[], dayCount: number) {
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const key = r.bucketStart.slice(0, 10);
    const v = r.spendByCategory.payment_link_revenue;
    if (typeof v === "number" && Number.isFinite(v)) {
      byDay.set(key, (byDay.get(key) ?? 0) + v);
    }
  }
  const out: { label: string; day: string; revenue: number }[] = [];
  for (let ago = dayCount - 1; ago >= 0; ago--) {
    const k = utcCalendarDayKey(ago);
    const revenue = byDay.get(k) ?? 0;
    const m = Number(k.slice(5, 7));
    const day = Number(k.slice(8, 10));
    out.push({
      day: k,
      label: `${m}/${day}`,
      revenue,
    });
  }
  return out;
}

function PaymentLinkRevenueChart({ enabled }: { enabled: boolean }) {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.beamHttp.financialSnapshots(REVENUE_CHART_DAYS),
    queryFn: () => fetchStardormFinancialSnapshots({ days: REVENUE_CHART_DAYS }),
    enabled,
  });

  const chartData = React.useMemo(
    () => buildPaymentLinkRevenueChartData(data?.items ?? [], REVENUE_CHART_DAYS),
    [data?.items],
  );

  const total = React.useMemo(() => chartData.reduce((s, x) => s + x.revenue, 0), [chartData]);

  const chartConfig = React.useMemo(
    () =>
      ({
        revenue: {
          label: "Payment links (USDC.e)",
          color: "hsl(var(--primary))",
        },
      }) satisfies ChartConfig,
    [],
  );

  if (!enabled) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Sign in with your wallet (Beam API session) to view payment-link revenue.
      </p>
    );
  }

  if (isError) {
    return <p className="mt-3 text-sm text-destructive">Could not load revenue chart.</p>;
  }

  if (isPending) {
    return (
      <div className="mt-4">
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          Bars show token amounts credited to your payee address (shown as ~USD while settlement is USDC.e).
          New activity appears after checkout is marked paid.
        </span>
        <span className="font-mono text-foreground">
          Σ {total.toLocaleString(undefined, { maximumFractionDigits: 6 })}
        </span>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
        <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v)
            }
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted) / 0.15)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as { day?: string; revenue?: number };
              return (
                <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-md">
                  <div className="font-medium text-muted-foreground">{row.day}</div>
                  <div className="font-mono tabular-nums text-foreground">
                    {(row.revenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC.e
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

const PAYMENT_REQUESTS_PAGE_SIZE = 10;

/** Compact numbered pager with ellipsis gaps when there are many pages. */
function paymentRequestsPagerEntries(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const candidates = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...candidates].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push("gap");
    out.push(p);
  }
  return out;
}

function DashboardPaymentRequests({ enabled }: { enabled: boolean; }) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.beamHttp.paymentRequests(PAYMENT_REQUESTS_PAGE_SIZE, page),
    queryFn: () =>
      fetchStardormPaymentRequests({ limit: PAYMENT_REQUESTS_PAGE_SIZE, page }),
    enabled,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAYMENT_REQUESTS_PAGE_SIZE)) : 1;

  React.useEffect(() => {
    if (!enabled) setPage(1);
  }, [enabled]);

  React.useEffect(() => {
    if (!data) return;
    if (page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const pagerEntries = React.useMemo(
    () => paymentRequestsPagerEntries(page, totalPages),
    [page, totalPages],
  );

  const showPager = Boolean(data && data.total > 0 && totalPages > 1);
  const rangeStart = data && data.total > 0 ? (page - 1) * PAYMENT_REQUESTS_PAGE_SIZE + 1 : 0;
  const rangeEnd =
    data && data.total > 0 ? Math.min(page * PAYMENT_REQUESTS_PAGE_SIZE, data.total) : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Checkout and x402</div>
          <p className="text-[11px] text-muted-foreground">
            Checkouts and payment links for your wallet. Human-readable amounts and network below; open the
            checkout or copy the link while a request is still pending.
          </p>
        </div>
        {enabled ? (
          <Button type="button" size="sm" className="shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create payment link
          </Button>
        ) : null}
      </div>
      <CreatePaymentLinkDialog open={createOpen} onOpenChange={setCreateOpen} />
      {!enabled ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with your wallet (Beam API session) to load payment activity.
        </p>
      ) : isError ? (
        <p className="mt-3 text-sm text-destructive">Could not load payment requests.</p>
      ) : isPending ? (
        <DashboardPaymentRequestsSkeleton rows={4} />
      ) : !data || data.total === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={Receipt}
            title="No saved checkouts yet"
            description="Create a payment link above, or use chat with an agent that offers x402 checkouts. Completed payments show up here."
          />
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.items.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.title}</span>
                    <PaymentRequestStatusBadge status={row.status} />
                    <PaymentRequestTypeBadge type={row.type} />
                  </div>
                  <PaymentRequestMetaBlock row={row} />
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end sm:max-w-md">
                  {row.status === "pending" ? (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link to="/pay/$id" params={{ id: row.id }}>
                        Open checkout
                      </Link>
                    </Button>
                  ) : null}
                  {row.type === "x402" && row.status === "pending" ? (
                    <X402PaymentLinkCopyButtons
                      paymentRequestId={row.id}
                      payPath={`/pay/${row.id}`}
                      apiBase={getStardormApiBase() ?? undefined}
                      className="sm:justify-end"
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {showPager ? (
            <div className="mt-4 flex flex-col items-stretch gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-[11px] text-muted-foreground sm:text-left">
                Showing {rangeStart}–{rangeEnd} of {data.total}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                {pagerEntries.map((entry, idx) =>
                  entry === "gap" ? (
                    <span
                      key={`gap-${idx}`}
                      className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={entry}
                      type="button"
                      variant={page === entry ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 min-w-8 px-2"
                      onClick={() => setPage(entry)}
                    >
                      {entry}
                    </Button>
                  ),
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function DashboardKyc({ enabled }: { enabled: boolean; }) {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.beamHttp.kycStatus(),
    queryFn: () => fetchStardormKycStatus(),
    enabled,
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
      <div className="font-medium text-foreground">Identity verification (KYC)</div>
      <p className="mt-2">
        Start verification from chat with the Passport agent (Stripe Identity). This panel reflects the
        latest status stored for your Beam account.
      </p>
      {!enabled ? (
        <p className="mt-3">Sign in with your wallet (Beam API session) to view KYC status.</p>
      ) : isError ? (
        <p className="mt-3 text-destructive">Could not load KYC status.</p>
      ) : isPending ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-56" />
        </div>
      ) : data ? (
        <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface-elevated p-4 text-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-foreground">Status</span>
            <KycStatusBadge status={data.status} />
          </div>
          {data.stripeVerificationSessionId ? (
            <div className="text-[11px] text-muted-foreground">
              Stripe session: <span className="font-mono">{data.stripeVerificationSessionId}</span>
            </div>
          ) : null}
          {data.lastStripeEventType ? (
            <div className="text-[11px] text-muted-foreground">Last event: {data.lastStripeEventType}</div>
          ) : null}
          {data.lastError ? (
            <div className="text-[11px] text-destructive">Last error: {data.lastError}</div>
          ) : null}
          {data.updatedAt ? (
            <div className="text-[11px] text-muted-foreground">
              Updated {new Date(data.updatedAt).toLocaleString()}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DashboardOnRamps({ enabled }: { enabled: boolean; }) {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.beamHttp.onRamps(),
    queryFn: () => fetchStardormOnRamps({ limit: 25 }),
    enabled,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">On Ramp</div>
        <p className="mt-2">
          Card-to-token checkouts you started from chat (Ramp agent). Status updates when Stripe and the
          treasury transfer complete.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="text-sm font-semibold">Your on-ramps</div>
        {!enabled ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in with your wallet (Beam API session) to load on-ramp history.
          </p>
        ) : isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load on-ramps.</p>
        ) : isPending ? (
          <DashboardOnRampsListSkeleton rows={4} />
        ) : !data?.items.length ? (
          <div className="mt-3">
            <EmptyState
              icon={Landmark}
              title="No on-ramp orders yet"
              description="Open chat with the Ramp agent and create a Stripe checkout when you are ready to buy tokens. Status updates when settlement completes."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.items.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={onRampBadgeVariant(row.status)} className="text-[10px] uppercase">
                    {row.status.replaceAll("_", " ")}
                  </Badge>
                  <span className="font-medium">
                    {row.tokenSymbol}{" "}
                    <span className="text-muted-foreground">
                      {formatTokenWeiHuman(row.tokenAmountWei, row.tokenDecimals)} to{" "}
                      {shortenHex(row.recipientWallet)}
                    </span>
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {(row.usdAmountCents / 100).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}{" "}
                  charged · {row.network}
                </div>
                {row.fulfillmentTxHash ? (
                  <div className="text-[11px] text-muted-foreground">
                    Fulfillment tx <span className="font-mono">{row.fulfillmentTxHash}</span>
                  </div>
                ) : null}
                {row.errorMessage ? (
                  <div className="text-[11px] text-destructive">{row.errorMessage}</div>
                ) : null}
                {row.createdAt ? (
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function dollarsToCents(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return cents > 0 ? cents : null;
}

function CreditCardsPanel({ stardormSession }: { stardormSession: boolean; }) {
  const qc = useQueryClient();
  const api = Boolean(getStardormApiBase());
  const { address } = useAccount();
  const walletChainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.beamHttp.creditCards(),
    queryFn: () => fetchStardormCreditCards(),
    enabled: Boolean(api && stardormSession),
  });

  const fundMut = useMutation({
    mutationFn: async ({ id, dollars }: { id: string; dollars: string; }) => {
      const cents = dollarsToCents(dollars);
      if (cents == null) throw new Error("Enter a positive dollar amount.");
      const quote = await fetchCreditCardFundQuote(cents);
      if ("error" in quote) throw new Error(quote.error);
      if (quote.onchainFundingRequired) {
        throw new Error(
          "Native 0G card funding is not supported in this app build. Configure x402 USDC.e funding on the server.",
        );
      }
      if (!address) throw new Error("Connect your wallet to fund with USDC.e.");
      if (!walletClient) {
        throw new Error("Wallet client unavailable. Refresh and try again.");
      }
      const chainId = BEAM_CHAIN_IDS.mainnet;
      if (walletChainId !== chainId) {
        if (!switchChainAsync) {
          throw new Error("Switch your wallet to 0G mainnet, then try again.");
        }
        await switchChainAsync({ chainId });
      }
      const funded = await fundStardormCreditCardViaX402({
        cardId: id,
        amountCents: cents,
        walletClient,
        publicClient: publicClient ?? null,
        chainId,
      });
      if ("error" in funded) throw new Error(funded.error);
      return funded;
    },
    onSuccess: (_data, vars) => {
      toast.success("Funds added to card");
      void qc.invalidateQueries({ queryKey: queryKeys.beamHttp.creditCards() });
      void qc.invalidateQueries({
        queryKey: queryKeys.beamHttp.creditCardSensitive(vars.id),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const withdrawMut = useMutation({
    mutationFn: async ({ id, dollars }: { id: string; dollars: string; }) => {
      const cents = dollarsToCents(dollars);
      if (cents == null) throw new Error("Enter a positive dollar amount.");
      const r = await withdrawStardormCreditCard(id, cents);
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onSuccess: (data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.beamHttp.creditCards() });
      void qc.invalidateQueries({
        queryKey: queryKeys.beamHttp.creditCardSensitive(vars.id),
      });
      if (data.lastWithdrawTxHash) {
        toast.success("Native 0G sent to your wallet", {
          description: shortenHex(data.lastWithdrawTxHash),
        });
      } else {
        toast.success("Funds removed from card");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div id="credit-cards" className="mt-6 scroll-mt-24 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-primary" />
            Virtual payment cards
          </div>
          <p className="text-[11px] text-muted-foreground">
            USD spend balance on cards from the Capita agent. Add funds with USDC.e on 0G mainnet (1:1 USD).
          </p>
        </div>
      </div>
      {!api ? (
        <p className="mt-3 text-sm text-muted-foreground">Connect the Stardorm API to manage cards.</p>
      ) : !stardormSession ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with your wallet (Beam API session) to load and manage cards.
        </p>
      ) : isError ? (
        <p className="mt-3 text-sm text-destructive">Could not load cards.</p>
      ) : isPending ? (
        <VirtualCardsPanelSkeleton />
      ) : !data?.cards.length ? (
        <div className="mt-3">
          <EmptyState
            icon={CreditCard}
            title="No virtual cards yet"
            description={
              <>
                Hire the <span className="font-medium text-foreground">Capita</span> agent in the marketplace,
                open chat, and tap <span className="font-medium text-foreground">Create virtual card</span> after
                confirming your billing details.
              </>
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {data.cards.map((c) => (
              <CreditCardRow
                key={c.id}
                card={c}
                funding={fundMut.isPending && fundMut.variables?.id === c.id}
                withdrawing={withdrawMut.isPending && withdrawMut.variables?.id === c.id}
                onFund={(dollars) => fundMut.mutateAsync({ id: c.id, dollars })}
                onWithdraw={(dollars) => withdrawMut.mutateAsync({ id: c.id, dollars })}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CreditCardRow({
  card,
  onFund,
  onWithdraw,
  funding,
  withdrawing,
}: {
  card: CreditCardPublic;
  onFund: (dollars: string) => Promise<unknown>;
  onWithdraw: (dollars: string) => Promise<unknown>;
  funding: boolean;
  withdrawing: boolean;
}) {
  const [fundOpen, setFundOpen] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const qc = useQueryClient();
  const [cardDetailsRevealed, setCardDetailsRevealed] = React.useState(false);
  const sensitiveQ = useQuery({
    queryKey: queryKeys.beamHttp.creditCardSensitive(card.id),
    queryFn: async () => {
      const r = await fetchStardormCreditCardSensitiveDetails(card.id);
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    enabled: cardDetailsRevealed,
    staleTime: 60_000,
  });
  const handleToggleReveal = () => {
    if (cardDetailsRevealed) {
      setCardDetailsRevealed(false);
      void qc.removeQueries({ queryKey: queryKeys.beamHttp.creditCardSensitive(card.id) });
    } else {
      setCardDetailsRevealed(true);
    }
  };

  return (
    <li className="min-w-0 rounded-xl border border-border bg-surface-elevated/40 p-4 sm:p-5">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-4">
        <VirtualCreditCard
          card={card}
          revealed={cardDetailsRevealed && Boolean(sensitiveQ.data)}
          revealLoading={cardDetailsRevealed && sensitiveQ.isPending}
          sensitive={sensitiveQ.data ?? null}
          onToggleReveal={handleToggleReveal}
        />
        {cardDetailsRevealed && sensitiveQ.isError ? (
          <p className="text-[11px] text-destructive">
            {sensitiveQ.error instanceof Error ? sensitiveQ.error.message : "Could not load card details."}
          </p>
        ) : null}
        <VirtualCardFundsActions
          funding={funding}
          withdrawing={withdrawing}
          onAddFunds={() => setFundOpen(true)}
          onRemoveFunds={() => setWithdrawOpen(true)}
          onMoreInfo={() => setInfoOpen(true)}
        />
      </div>

      <VirtualCardFundsDialog
        open={fundOpen}
        onOpenChange={setFundOpen}
        mode="fund"
        card={card}
        loading={funding}
        onSubmit={async (dollars) => {
          await onFund(dollars);
          setFundOpen(false);
        }}
      />
      <VirtualCardFundsDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        mode="withdraw"
        card={card}
        loading={withdrawing}
        onSubmit={async (dollars) => {
          await onWithdraw(dollars);
          setWithdrawOpen(false);
        }}
      />
      <VirtualCardBillingDialog open={infoOpen} onOpenChange={setInfoOpen} card={card} />
    </li>
  );
}

function Kpi({
  label,
  value,
  icon,
  delta,
  up,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  delta?: string;
  up?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="rounded-md bg-surface-elevated p-1">{icon}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {delta != null && delta !== "" ? (
        <div
          className={`mt-1 text-[11px] ${up === undefined ? "text-muted-foreground" : up ? "text-success" : "text-destructive"
            }`}
        >
          {delta}
        </div>
      ) : null}
    </div>
  );
}
