import { Link } from "@tanstack/react-router";
import type { Agent } from "@/lib/types";
import { useApp } from "@/lib/app-state";
import { CLONED_AGENT_AVATAR_RING_CLASS } from "@/lib/cloned-agent-avatar";
import {
  agentPortfolioAddedBadge,
  agentPortfolioAddVerb,
  isRegistryTokenIdOneAgent,
  REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
} from "@/lib/registry-token-one-agent";
import { cn } from "@/lib/utils";
import { CoinIcon } from "./icons";
import { Star, Users } from "lucide-react";
import { Button } from "./ui/button";
import { formatEther } from "viem";

const DAYS_PER_MONTH = 30n;

function monthlyPriceLabel(agent: Agent): string | null {
  if (agent.feePerDayWei) {
    try {
      const monthlyWei = BigInt(agent.feePerDayWei) * DAYS_PER_MONTH;
      return formatEther(monthlyWei);
    } catch {
      // Fall back to the catalog estimate below.
    }
  }
  return agent.pricePerMonth != null ? String(agent.pricePerMonth) : null;
}

export function AgentCard({
  agent,
  hired,
  onHire,
}: {
  agent: Agent;
  hired: boolean;
  onHire: (a: Agent) => void;
}) {
  const { setActiveAgentId } = useApp();
  const priceLabel = monthlyPriceLabel(agent);
  const skills = agent.skills.slice(0, 3);
  const skillHandles = (agent.skillHandles ?? []).slice(0, 5);

  return (
    <div className="group hover-lift relative flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <img
            src={agent.avatar}
            alt=""
            className={cn(
              "h-12 w-12 rounded-full bg-pill",
              isRegistryTokenIdOneAgent(agent) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
              agent.isCloned && CLONED_AGENT_AVATAR_RING_CLASS,
            )}
          />
          {agent.online === true && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to="/agents/$agentId"
              params={{ agentId: agent.id }}
              className="truncate text-sm font-semibold hover:underline"
            >
              {agent.name}
            </Link>
            <span className="shrink-0 rounded-full bg-pill px-1.5 py-0.5 text-[10px] text-pill-foreground">
              {agent.category}
            </span>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">@{agent.handle}</div>
        </div>
        <div className="flex h-5 shrink-0 items-center gap-1 text-sm text-muted-foreground">
          {agent.rating != null ? (
            <>
              <Star className="h-3 w-3 fill-primary text-primary" />
              {agent.rating.toFixed(1)}
            </>
          ) : null}
        </div>
      </div>

      <p className="line-clamp-2 min-h-[2.25rem] text-xs text-muted-foreground">
        {agent.tagline}
      </p>

      <div className="flex min-h-[1.5rem] flex-wrap gap-1 overflow-hidden">
        {skills.map((s) => (
          <span
            key={s}
            className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="flex min-h-[1.25rem] flex-wrap gap-1 overflow-hidden">
        {skillHandles.map((h) => (
          <span
            key={h.handle}
            title={h.label}
            className="rounded-md border border-dashed border-border/80 bg-surface-elevated px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
          >
            @{h.handle}
          </span>
        ))}
      </div>

      <div
        className={cn(
          "mt-auto flex items-center gap-3 border-t border-border pt-3 text-sm",
          agent.isCloned ? "justify-end" : "justify-between",
        )}
      >
        {!agent.isCloned ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            {agent.hires != null ? agent.hires.toLocaleString() : "—"}
          </span>
        ) : null}
        <span className="flex items-center gap-1 text-foreground">
          <CoinIcon className="h-3.5 w-3.5" />
          <span className="font-medium">{priceLabel ?? "—"}</span>
          <span className="text-muted-foreground">/mo</span>
        </span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link to="/agents/$agentId" params={{ agentId: agent.id }}>
            View
          </Link>
        </Button>
        {hired ? (
          isRegistryTokenIdOneAgent(agent) ? (
            <Button size="sm" variant="secondary" className="flex-1" asChild>
              <Link to="/" onClick={() => setActiveAgentId(agent.id)}>
                {agentPortfolioAddedBadge(agent)}
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="secondary" disabled className="flex-1">
              {agentPortfolioAddedBadge(agent)}
            </Button>
          )
        ) : isRegistryTokenIdOneAgent(agent) ? (
          <Button size="sm" className="flex-1" asChild>
            <Link to="/" onClick={() => setActiveAgentId(agent.id)}>
              {agentPortfolioAddVerb(agent)}
            </Link>
          </Button>
        ) : (
          <Button size="sm" className="flex-1" onClick={() => onHire(agent)}>
            {agentPortfolioAddVerb(agent)}
          </Button>
        )}
      </div>
    </div>
  );
}
