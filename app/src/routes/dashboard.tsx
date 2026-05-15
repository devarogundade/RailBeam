import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useChainId, usePublicClient, useSendTransaction, useSwitchChain } from "wagmi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import {
  ArrowUpRight,
  Zap,
  CreditCard,
  Eye,
  EyeOff,
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
import { beamNetworkFromChainId } from "@/lib/beam-chain-config";
import { getStardormSubgraphUrlForChain, getStardormPaymentTokenDecimals } from "@/lib/stardorm-subgraph-config";
import {
  formatCompactFromBaseUnits,
  formatSubgraphDateTime,
  formatSubgraphRelativeTime,
  shortenHex,
} from "@/lib/format-subgraph";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchStardormCreditCards,
  fetchStardormCreditCardSensitiveDetails,
  fetchCreditCardFundQuote,
  fetchStardormKycStatus,
  fetchStardormOnRamps,
  fetchStardormPaymentRequests,
  fundStardormCreditCard,
  isStardormInferenceEnabled,
  withdrawStardormCreditCard,
} from "@/lib/stardorm-api";
import { waitForWriteContractReceipt } from "@/lib/wait-write-contract-receipt";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { Badge } from "@/components/ui/badge";
import type {
  CreditCardFundBody,
  CreditCardPublic,
  OnRampRecord,
  PublicPaymentRequest,
  UserKycStatus,
} from "@railbeam/stardorm-api-contract";
import { toast } from "sonner";
import { parseAgentUriFromString } from "@/lib/agent-uri-metadata";
import { EmptyState } from "@/components/empty-state";
import { queryKeys } from "@/lib/query-keys";
import {
  DashboardListSkeleton,
  PageRoutePending,
  VirtualCardsPanelSkeleton,
} from "@/components/page-shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePaymentLinkDialog } from "@/components/create-payment-link-dialog";
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
                <p className="mt-2">
                  No revenue feed is connected yet. When treasury or invoicing totals are available, they
                  can be charted here.
                </p>
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

function paymentBadgeVariant(
  s: PublicPaymentRequest["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (s === "paid") return "default";
  if (s === "pending") return "secondary";
  if (s === "expired") return "outline";
  return "destructive";
}

function onRampBadgeVariant(
  s: OnRampRecord["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (s === "fulfilled") return "default";
  if (s === "failed") return "destructive";
  if (s === "canceled") return "outline";
  return "secondary";
}

function DashboardPaymentRequests({ enabled }: { enabled: boolean; }) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.beamHttp.paymentRequests(),
    queryFn: () => fetchStardormPaymentRequests({ limit: 25 }),
    enabled,
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Checkout and x402</div>
          <p className="text-[11px] text-muted-foreground">
            Payment requests you created or settled, stored by the Beam API.
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
        <DashboardListSkeleton rows={4} />
      ) : !data?.items.length ? (
        <div className="mt-3">
          <EmptyState
            icon={Receipt}
            title="No saved checkouts yet"
            description="Create a payment link above, or use chat with an agent that offers x402 checkouts. Completed payments show up here."
          />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {data.items.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.title}</span>
                  <Badge variant={paymentBadgeVariant(row.status)} className="text-[10px] uppercase">
                    {row.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{row.type}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {row.network} · {shortenHex(row.payTo)} · amount {row.amount} ({row.asset}
                  {row.decimals != null ? `, ${row.decimals} decimals` : ""})
                </div>
                {row.txHash ? (
                  <div className="text-[11px] text-muted-foreground">Tx {shortenHex(row.txHash)}</div>
                ) : null}
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
          <DashboardListSkeleton rows={4} />
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

function formatPanGroups(pan: string): string {
  return pan.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function CreditCardsPanel({ stardormSession }: { stardormSession: boolean; }) {
  const qc = useQueryClient();
  const api = Boolean(getStardormApiBase());
  const { address } = useAccount();
  const walletChainId = useChainId();
  const publicClient = usePublicClient();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { effectiveChainId } = useBeamNetwork();
  const mainnetVirtualCardFundsDisabled =
    beamNetworkFromChainId(effectiveChainId) === "mainnet";
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

      let fundBody: CreditCardFundBody = { amountCents: cents };

      if (quote.onchainFundingRequired) {
        if (!address) throw new Error("Connect your wallet to pay in native 0G.");
        if (walletChainId !== quote.chainId) {
          if (!switchChainAsync) {
            throw new Error("Switch your wallet to the correct 0G network, then try again.");
          }
          await switchChainAsync({ chainId: quote.chainId });
        }
        if (!publicClient) {
          throw new Error("Wallet client unavailable. Refresh and try again.");
        }
        const hash = await sendTransactionAsync({
          chainId: quote.chainId,
          to: quote.recipient as `0x${string}`,
          value: BigInt(quote.minNativeWei),
        });
        await waitForWriteContractReceipt(publicClient, hash);
        fundBody = {
          ...fundBody,
          fundingTxHash: hash,
          fundingChainId: quote.chainId,
        };
      }

      const r = await fundStardormCreditCard(id, fundBody);
      if ("error" in r) throw new Error(r.error);
      return r;
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
            USD spend balance on cards from the Capita agent. Add or remove funds with native 0G.
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
          {mainnetVirtualCardFundsDisabled ? (
            <p className="mt-3 text-[11px] text-muted-foreground rounded-md border border-border bg-surface-elevated px-3 py-2">
              Adding or removing virtual card balance is disabled on 0G mainnet. Switch to testnet in the
              network menu to fund or withdraw.
            </p>
          ) : null}
          <ul className="mt-4 divide-y divide-border">
            {data.cards.map((c) => (
              <CreditCardRow
                key={c.id}
                card={c}
                mainnetFundsDisabled={mainnetVirtualCardFundsDisabled}
                funding={fundMut.isPending && fundMut.variables?.id === c.id}
                withdrawing={withdrawMut.isPending && withdrawMut.variables?.id === c.id}
                onFund={(dollars) => fundMut.mutate({ id: c.id, dollars })}
                onWithdraw={(dollars) => withdrawMut.mutate({ id: c.id, dollars })}
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
  mainnetFundsDisabled,
}: {
  card: CreditCardPublic;
  onFund: (dollars: string) => void;
  onWithdraw: (dollars: string) => void;
  funding: boolean;
  withdrawing: boolean;
  mainnetFundsDisabled: boolean;
}) {
  const [fundAmt, setFundAmt] = React.useState("");
  const [wdAmt, setWdAmt] = React.useState("");
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
  const bal = `${card.currency} ${(card.balanceCents / 100).toFixed(2)}`;
  const addr = [card.line1, card.line2, [card.city, card.region, card.postalCode].filter(Boolean).join(", "), card.countryCode]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="font-medium">
            {card.cardLabel ?? "Virtual card"} · {card.networkBrand} ·•••• {card.last4}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {card.firstName} {card.lastName}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{addr}</div>
        </div>
        <div className="shrink-0 text-right text-sm font-semibold tabular-nums">{bal}</div>
      </div>
      <div className="rounded-lg border border-border bg-surface-elevated p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium text-foreground">Card credentials</div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1.5"
            onClick={() => {
              if (cardDetailsRevealed) {
                setCardDetailsRevealed(false);
                void qc.removeQueries({ queryKey: queryKeys.beamHttp.creditCardSensitive(card.id) });
              } else {
                setCardDetailsRevealed(true);
              }
            }}
          >
            {cardDetailsRevealed ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide details
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Reveal details
              </>
            )}
          </Button>
        </div>
        {!cardDetailsRevealed ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Full card number, expiry, and CVV stay hidden until you choose to reveal them for checkout.
          </p>
        ) : sensitiveQ.isPending ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
          </div>
        ) : sensitiveQ.isError ? (
          <p className="mt-2 text-[11px] text-destructive">
            {sensitiveQ.error instanceof Error ? sensitiveQ.error.message : "Could not load card details."}
          </p>
        ) : sensitiveQ.data ? (
          <dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Number</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium tracking-wide text-foreground">
                {formatPanGroups(sensitiveQ.data.pan)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Expires</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium text-foreground">
                {pad2(sensitiveQ.data.expiryMonth)}/{String(sensitiveQ.data.expiryYear).slice(-2)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CVV</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium text-foreground">{sensitiveQ.data.cvv}</dd>
            </div>
          </dl>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-elevated p-3">
          <Label className="text-xs">Add funds (USD)</Label>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="e.g. 25.00"
              value={fundAmt}
              onChange={(e) => setFundAmt(e.target.value)}
              className="h-9"
              disabled={mainnetFundsDisabled}
            />
            <Button
              type="button"
              size="sm"
              loading={funding}
              disabled={funding || mainnetFundsDisabled}
              onClick={() => {
                onFund(fundAmt);
                setFundAmt("");
              }}
            >
              Fund
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated p-3">
          <Label className="text-xs">Remove funds (USD)</Label>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="e.g. 10.00"
              value={wdAmt}
              onChange={(e) => setWdAmt(e.target.value)}
              className="h-9"
              disabled={mainnetFundsDisabled}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={withdrawing}
              disabled={withdrawing || mainnetFundsDisabled}
              onClick={() => {
                onWithdraw(wdAmt);
                setWdAmt("");
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
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
