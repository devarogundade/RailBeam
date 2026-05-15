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

function AgentTableHeader() {
  return (
    <div className="hidden border-b border-border bg-surface-elevated px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-12 md:gap-2">
      <div className="md:col-span-5">Agent</div>
      <div className="md:col-span-2">Category</div>
      <div className="md:col-span-2">Reputation</div>
      <div className="md:col-span-2">Cost</div>
      <div className="md:col-span-1 text-right">Actions</div>
    </div>
  );
}

function AgentReputation({ reputation }: { reputation: number | null | undefined }) {
  if (reputation == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-pill sm:w-20">
        <div className="h-full bg-primary" style={{ width: `${reputation}%` }} />
      </div>
      <span>{reputation}</span>
    </div>
  );
}

function AgentMonthlyCost({ pricePerMonth }: { pricePerMonth: number | null | undefined }) {
  if (pricePerMonth == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <CoinIcon className="h-3.5 w-3.5 shrink-0" />
      {pricePerMonth}
      <span className="text-muted-foreground">/mo</span>
    </span>
  );
}

function AgentRowActions({
  agent,
  allowFire,
  onFire,
}: {
  agent: Agent;
  allowFire: boolean;
  onFire: (a: Agent) => void;
}) {
  return (
    <>
      <Button asChild size="icon" variant="ghost" aria-label="Chat">
        <Link to="/">
          <MessageSquare className="h-4 w-4" />
        </Link>
      </Button>
      {allowFire && !isRegistryTokenIdOneAgent(agent) && (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onFire(agent)}
          aria-label={agentPortfolioRemoveCta(agent)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </>
  );
}

function AgentRow({
  agent,
  allowFire,
  onFire,
}: {
  agent: Agent;
  allowFire: boolean;
  onFire: (a: Agent) => void;
}) {
  return (
    <div className="border-b border-border px-4 py-3 text-sm last:border-0 md:grid md:grid-cols-12 md:items-center md:gap-2">
      <div className="flex items-center justify-between gap-2 md:col-span-5 md:justify-start">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={agent.avatar}
              alt=""
              className={cn(
                "h-9 w-9 rounded-full bg-pill",
                isRegistryTokenIdOneAgent(agent) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
                agent.isCloned && CLONED_AGENT_AVATAR_RING_CLASS,
              )}
            />
            {agent.online === true && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-surface" />
            )}
          </div>
          <div className="min-w-0">
            <Link
              to="/agents/$agentId"
              params={{ agentId: agent.id }}
              className="truncate font-medium hover:underline"
            >
              {agent.name}
            </Link>
            <div className="truncate text-muted-foreground">@{agent.handle}</div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 md:hidden">
          <AgentRowActions agent={agent} allowFire={allowFire} onFire={onFire} />
        </div>
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs md:hidden">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</dt>
          <dd className="mt-0.5 text-foreground">{agent.category}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Reputation</dt>
          <dd className="mt-0.5">
            <AgentReputation reputation={agent.reputation} />
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost</dt>
          <dd className="mt-0.5">
            <AgentMonthlyCost pricePerMonth={agent.pricePerMonth} />
          </dd>
        </div>
      </dl>

      <div className="hidden text-muted-foreground md:col-span-2 md:block">{agent.category}</div>
      <div className="hidden md:col-span-2 md:block">
        <AgentReputation reputation={agent.reputation} />
      </div>
      <div className="hidden md:col-span-2 md:block">
        <AgentMonthlyCost pricePerMonth={agent.pricePerMonth} />
      </div>
      <div className="hidden justify-end gap-1 md:col-span-1 md:flex">
        <AgentRowActions agent={agent} allowFire={allowFire} onFire={onFire} />
      </div>
    </div>
  );
}

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
        <AgentRow key={a.id} agent={a} allowFire={allowFire} onFire={onFire} />
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
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
          <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
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
              <AgentTableHeader />
              <AgentTableRows rows={hired} allowFire onFire={setFireTarget} />
            </div>
          </TabsContent>

          <TabsContent value="clones" className="mt-3">
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <AgentTableHeader />
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
