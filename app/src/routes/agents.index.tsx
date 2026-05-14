import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FireDialog } from "@/components/agent-dialogs";
import type { Agent } from "@/lib/types";
import { CLONED_AGENT_AVATAR_RING_CLASS } from "@/lib/cloned-agent-avatar";
import {
  agentPortfolioRemoveCta,
  isRegistryTokenIdOneAgent,
  REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
} from "@/lib/registry-token-one-agent";
import { cn } from "@/lib/utils";
import { MessageSquare, Trash2, Users, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageRoutePending } from "@/components/page-shimmer";

export const Route = createFileRoute("/agents/")({
  component: MyAgents,
  pendingComponent: () => <PageRoutePending variant="default" />,
});

function AgentTableRows({
  rows,
  allowFire,
  onFire,
}: {
  rows: Agent[];
  allowFire: boolean;
  onFire: (a: Agent) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-6 md:p-8">
        <EmptyState
          icon={Users}
          title={allowFire ? "No hired agents yet" : "No clones in this wallet"}
          description={
            allowFire
              ? "Hire specialized agents from the marketplace. They land here for chat, billing, and portfolio management."
              : "When you mint a clone from the marketplace, it appears in this tab with on-chain controls."
          }
        >
          {allowFire ? (
            <Button asChild>
              <Link to="/marketplace">Browse marketplace</Link>
            </Button>
          ) : null}
        </EmptyState>
      </div>
    );
  }
  return (
    <>
      {rows.map((a) => (
        <div
          key={a.id}
          className="grid grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-0"
        >
          <div className="col-span-5 flex items-center gap-3">
            <div className="relative">
              <img
                src={a.avatar}
                alt=""
                className={cn(
                  "h-9 w-9 rounded-full bg-pill",
                  isRegistryTokenIdOneAgent(a) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
                  a.isCloned && CLONED_AGENT_AVATAR_RING_CLASS,
                )}
              />
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
            {allowFire && !isRegistryTokenIdOneAgent(a) && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onFire(a)}
                aria-label={agentPortfolioRemoveCta(a)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function MyAgents() {
  const { hired, ownedClones, address } = useApp();
  const [fireTarget, setFireTarget] = React.useState<Agent | null>(null);
  const [tab, setTab] = React.useState<"hired" | "clones">("hired");

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
              <span>
                {hired.length} hired · {ownedClones.length} cloned
              </span>
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as "hired" | "clones")} className="mt-6">
          <TabsList>
            <TabsTrigger value="hired">Hired</TabsTrigger>
            <TabsTrigger value="clones">Cloned</TabsTrigger>
          </TabsList>

          <TabsContent value="hired" className="mt-3">
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface-elevated px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Agent</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Reputation</div>
                <div className="col-span-2">Cost</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              <AgentTableRows rows={hired} allowFire onFire={setFireTarget} />
            </div>
          </TabsContent>

          <TabsContent value="clones" className="mt-3">
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface-elevated px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Agent</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Reputation</div>
                <div className="col-span-2">Cost</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              {!address ? (
                <div className="p-6 md:p-8">
                  <EmptyState
                    icon={Wallet}
                    title="Connect your wallet"
                    description="Registry clones are tied to your address. Connect the wallet that holds your agent NFTs to see them here."
                  />
                </div>
              ) : (
                <AgentTableRows rows={ownedClones} allowFire={false} onFire={setFireTarget} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <FireDialog
        agent={fireTarget}
        open={!!fireTarget}
        onOpenChange={(o) => !o && setFireTarget(null)}
      />
    </div>
  );
}
