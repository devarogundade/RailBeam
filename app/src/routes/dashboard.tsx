import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import { ArrowUpRight, Zap, CreditCard } from "lucide-react";
import {
  useMyActiveSubscribedChainAgentIds,
  useStardormRecentSubscriptions,
} from "@/lib/hooks/use-stardorm-subgraph";
import { useBeamNetwork } from "@/lib/beam-network-context";
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
import {
  fetchStardormCreditCards,
  fundStardormCreditCard,
  withdrawStardormCreditCard,
} from "@/lib/stardorm-api";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import type { CreditCardPublic } from "@beam/stardorm-api-contract";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
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

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
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

        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Paid subscriptions</div>
              <p className="text-[11px] text-muted-foreground">
                Recent paid subscriptions from the live registry.
              </p>
              {subgraphUrl && address ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Active subscriptions for this wallet:{" "}
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
              <span className="text-sm text-muted-foreground">Live data</span>
            </div>
          </div>

          {!subgraphUrl ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Subscription history is not available in this version of the app.
            </p>
          ) : subsError ? (
            <p className="mt-3 text-sm text-destructive">
              Could not load subscription history. Try again later.
            </p>
          ) : subsPending ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : !subscriptions?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">No subscription activity yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {subscriptions.map((row) => {
                const paid = formatCompactFromBaseUnits(row.paidAmount, tokenDecimals);
                const rel = formatSubgraphRelativeTime(row.blockTimestamp);
                const abs = formatSubgraphDateTime(row.blockTimestamp);
                const agentLabel = `Agent #${row.agentId}`;
                return (
                  <li key={row.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium">Subscription · {agentLabel}</div>
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

        <CreditCardsPanel address={walletKey} />
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

function CreditCardsPanel({ address }: { address: `0x${string}` | null }) {
  const qc = useQueryClient();
  const api = Boolean(getStardormApiBase());
  const { data, isPending, isError } = useQuery({
    queryKey: ["creditCards", address],
    queryFn: () => fetchStardormCreditCards(),
    enabled: Boolean(api && address),
  });

  const fundMut = useMutation({
    mutationFn: async ({ id, dollars }: { id: string; dollars: string }) => {
      const cents = dollarsToCents(dollars);
      if (cents == null) throw new Error("Enter a positive dollar amount.");
      const r = await fundStardormCreditCard(id, cents);
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      toast.success("Funds added to card");
      void qc.invalidateQueries({ queryKey: ["creditCards", address] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const withdrawMut = useMutation({
    mutationFn: async ({ id, dollars }: { id: string; dollars: string }) => {
      const cents = dollarsToCents(dollars);
      if (cents == null) throw new Error("Enter a positive dollar amount.");
      const r = await withdrawStardormCreditCard(id, cents);
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      toast.success("Funds removed from card");
      void qc.invalidateQueries({ queryKey: ["creditCards", address] });
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
            Cards issued by the Capita agent hold a spend balance. Fund or withdraw in whole cents (USD-style
            amounts).
          </p>
        </div>
      </div>
      {!api ? (
        <p className="mt-3 text-sm text-muted-foreground">Connect the Stardorm API to manage cards.</p>
      ) : !address ? (
        <p className="mt-3 text-sm text-muted-foreground">Connect a wallet to load your cards.</p>
      ) : isError ? (
        <p className="mt-3 text-sm text-destructive">Could not load cards.</p>
      ) : isPending ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : !data?.cards.length ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No cards yet. Hire the Capita agent in the marketplace, open chat, and tap{" "}
          <span className="font-medium text-foreground">Create virtual card</span> after confirming your billing
          details.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {data.cards.map((c) => (
            <CreditCardRow
              key={c.id}
              card={c}
              funding={fundMut.isPending && fundMut.variables?.id === c.id}
              withdrawing={withdrawMut.isPending && withdrawMut.variables?.id === c.id}
              onFund={(dollars) => fundMut.mutate({ id: c.id, dollars })}
              onWithdraw={(dollars) => withdrawMut.mutate({ id: c.id, dollars })}
            />
          ))}
        </ul>
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
  onFund: (dollars: string) => void;
  onWithdraw: (dollars: string) => void;
  funding: boolean;
  withdrawing: boolean;
}) {
  const [fundAmt, setFundAmt] = React.useState("");
  const [wdAmt, setWdAmt] = React.useState("");
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-elevated p-3">
          <Label className="text-xs">Add funds (USD)</Label>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="e.g. 25.00"
              value={fundAmt}
              onChange={(e) => setFundAmt(e.target.value)}
              className="h-9"
            />
            <Button
              type="button"
              size="sm"
              disabled={funding}
              onClick={() => {
                onFund(fundAmt);
                setFundAmt("");
              }}
            >
              {funding ? "…" : "Fund"}
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
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={withdrawing}
              onClick={() => {
                onWithdraw(wdAmt);
                setWdAmt("");
              }}
            >
              {withdrawing ? "…" : "Remove"}
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
