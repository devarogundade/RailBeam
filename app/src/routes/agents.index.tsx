import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FireDialog } from "@/components/agent-dialogs";
import type { Agent } from "@/lib/types";
import { MessageSquare, Trash2 } from "lucide-react";

export const Route = createFileRoute("/agents/")({
  component: MyAgents,
});

function MyAgents() {
  const { hired } = useApp();
  const [fireTarget, setFireTarget] = React.useState<Agent | null>(null);
  const totalMonthly = hired.reduce((s, a) => {
    const p = a.pricePerMonth;
    return p != null && Number.isFinite(p) ? s + p : s;
  }, 0);
  const anyMonthlyPrice = hired.some((a) => a.pricePerMonth != null);

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-wider text-muted-foreground">
              Portfolio
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">My Agents</h1>
            <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
              <span>{hired.length} active ·</span>
              <span className="inline-flex items-center gap-1">
                <CoinIcon className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {anyMonthlyPrice ? (
                    <>{totalMonthly} 0G monthly (estimate from listings)</>
                  ) : (
                    <>No monthly price on file for hired agents</>
                  )}
                </span>
              </span>
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/marketplace">Browse marketplace</Link>
          </Button>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface-elevated px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="col-span-5">Agent</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Reputation</div>
            <div className="col-span-2">Cost</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {hired.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="relative">
                  <img src={a.avatar} alt="" className="h-9 w-9 rounded-full bg-pill" />
                  {a.online === true && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-surface" />
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    to="/agents/$agentId"
                    params={{ agentId: a.id }}
                    className="truncate font-medium hover:underline"
                  >
                    {a.name}
                  </Link>
                  <div className="truncate text-sm text-muted-foreground">@{a.handle}</div>
                </div>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">{a.category}</div>
              <div className="col-span-2 text-sm">
                {a.reputation != null ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-pill">
                      <div className="h-full bg-primary" style={{ width: `${a.reputation}%` }} />
                    </div>
                    {a.reputation}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-1 text-sm">
                {a.pricePerMonth != null ? (
                  <>
                    <CoinIcon className="h-3.5 w-3.5" /> {a.pricePerMonth}
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                <Button asChild size="icon" variant="ghost" aria-label="Chat">
                  <Link to="/">
                    <MessageSquare className="h-4 w-4" />
                  </Link>
                </Button>
                {a.id !== "beam-default" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setFireTarget(a)}
                    aria-label="Fire"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <FireDialog
        agent={fireTarget}
        open={!!fireTarget}
        onOpenChange={(o) => !o && setFireTarget(null)}
      />
    </div>
  );
}
