import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import * as React from "react";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Star, Users, Zap, ArrowLeft, ShieldCheck } from "lucide-react";
import { AgentOnchainFeedback } from "@/components/agent-onchain-feedback";
import { HireDialog, FireDialog } from "@/components/agent-dialogs";
import { fetchStardormCatalog } from "@/lib/stardorm-catalog";
import { queryKeys } from "@/lib/query-keys";
import { readStoredBeamPreferredChainId } from "@/lib/beam-network-storage";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { getStardormSubgraphUrl, getStardormSubgraphUrlForChain } from "@/lib/stardorm-subgraph-config";
import { useStardormValidationsForAgent } from "@/lib/hooks/use-stardorm-subgraph";

export const Route = createFileRoute("/agents/$agentId")({
  loader: async ({ context, params }) => {
    const beamCh = readStoredBeamPreferredChainId();
    const data = await context.queryClient.ensureQueryData({
      queryKey: queryKeys.agents.catalog(beamCh),
      queryFn: () => fetchStardormCatalog(beamCh),
    });
    const agent = data.agents.find((a) => a.id === params.agentId);
    if (!agent) throw notFound();
    return { agent };
  },
  component: AgentDetail,
  notFoundComponent: () => (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Agent not found.
    </div>
  ),
});

function AgentDetail() {
  const { agent } = Route.useLoaderData();
  const { effectiveChainId } = useBeamNetwork();
  const { isHired, setActiveAgentId } = useApp();
  const hired = isHired(agent.id);
  const [hireOpen, setHireOpen] = React.useState(false);
  const [fireOpen, setFireOpen] = React.useState(false);

  const subgraphOn = Boolean(
    getStardormSubgraphUrl() && getStardormSubgraphUrlForChain(effectiveChainId),
  );
  const validations = useStardormValidationsForAgent(agent.chainAgentId, { first: 12, skip: 0 });
  const hasValidations =
    !validations.isPending && !validations.isError && (validations.data?.length ?? 0) > 0;

  const detailStats = React.useMemo(() => {
    const rows: Array<{ icon: React.ReactNode; label: string; value: string; }> = [];
    if (agent.rating != null) {
      rows.push({
        icon: <Star className="h-3.5 w-3.5 fill-primary text-primary" />,
        label: "Rating",
        value:
          agent.reviews != null
            ? `${agent.rating.toFixed(1)} (${agent.reviews})`
            : agent.rating.toFixed(1),
      });
    }
    if (agent.hires != null) {
      rows.push({
        icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />,
        label: "Subscriptions",
        value: agent.hires.toLocaleString(),
      });
    }
    if (agent.reputation != null) {
      rows.push({
        icon: <Zap className="h-3.5 w-3.5 text-primary" />,
        label: "Reputation",
        value: `${agent.reputation}/100`,
      });
    }
    if (agent.pricePerMonth != null) {
      rows.push({
        icon: <CoinIcon className="h-3.5 w-3.5" />,
        label: "Price",
        value: `${agent.pricePerMonth} 0G/mo`,
      });
    }
    return rows;
  }, [agent]);

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to marketplace
        </Link>

        <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 md:flex-row">
          <div className="relative">
            <img src={agent.avatar} alt="" className="h-24 w-24 rounded-2xl bg-pill" />
            {agent.online === true && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-success ring-2 ring-surface">
                <span className="h-1.5 w-1.5 rounded-full bg-success-foreground" />
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <span className="rounded-full bg-pill px-2 py-0.5 text-[11px] text-pill-foreground">
                {agent.category}
              </span>
              {subgraphOn && agent.chainAgentId != null && hasValidations ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-primary" /> Verified
                </span>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground">
              @{agent.handle} · by {agent.creator}
            </div>
            <p className="mt-3 text-sm text-foreground/90">{agent.description}</p>

            {detailStats.length > 0 ? (
              <div
                className={`mt-4 grid gap-3 ${detailStats.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : detailStats.length === 3 ? "grid-cols-1 sm:grid-cols-3" : detailStats.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:max-w-xs"}`}
              >
                {detailStats.map((s) => (
                  <Stat key={s.label} icon={s.icon} label={s.label} value={s.value} />
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {agent.skills.map((s: string) => (
                <span
                  key={s}
                  className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>

            {Array.isArray(agent.skillHandles) && agent.skillHandles.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-medium text-muted-foreground">Callable skills</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {agent.skillHandles.map((h) => (
                    <span
                      key={h.handle}
                      title={h.label}
                      className="rounded-md border border-dashed border-border bg-surface-elevated px-2 py-0.5 font-mono text-[10px] text-foreground/90"
                    >
                      @{h.handle}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  In chat, prefix a skill with @ (for example @generate_pdf) when live chat is
                  enabled.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {hired ? (
                <>
                  <Button asChild onClick={() => setActiveAgentId(agent.id)}>
                    <Link to="/">Chat with {agent.name}</Link>
                  </Button>
                  {agent.id !== "beam-default" && (
                    <Button variant="outline" onClick={() => setFireOpen(true)}>
                      Fire agent
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button onClick={() => setHireOpen(true)}>Hire {agent.name}</Button>
                  <Button asChild variant="outline">
                    <Link to="/marketplace">Browse marketplace</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {subgraphOn && agent.chainAgentId != null ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold">Registry details</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Token ID</dt>
                  <dd className="font-mono">{agent.chainAgentId}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold">Validation history</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Recent verification results for this agent.
              </p>
              {validations.isPending ? (
                <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
              ) : validations.isError ? (
                <p className="mt-3 text-sm text-destructive">
                  Could not load validation history. Try again later.
                </p>
              ) : !validations.data?.length ? (
                <p className="mt-3 text-sm text-muted-foreground">No validation events yet.</p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                  {validations.data.map((v) => (
                    <li
                      key={v.id}
                      className="rounded-md border border-border bg-surface-elevated p-2 font-mono text-[11px]"
                    >
                      <div className="truncate text-muted-foreground">{v.requestHash}</div>
                      <div className="mt-1 text-foreground/90">
                        response {v.response == null ? "—" : String(v.response)}
                        {v.tag ? ` · ${v.tag}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        <AgentOnchainFeedback agent={agent} />
      </div>

      <HireDialog agent={agent} open={hireOpen} onOpenChange={setHireOpen} />
      <FireDialog agent={agent} open={fireOpen} onOpenChange={setFireOpen} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string; }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
