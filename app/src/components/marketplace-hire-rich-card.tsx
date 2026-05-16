import type { StardormChatRichBlock } from "@railbeam/stardorm-api-contract";
import { resolveStardormChainAgentId } from "@railbeam/stardorm-api-contract";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, UserRound } from "lucide-react";

type MarketplaceHireRich = Extract<StardormChatRichBlock, { type: "marketplace_hire" }>;

function agentProfileRouteParam(rich: MarketplaceHireRich): string | undefined {
  const key = rich.specialistAgentKey?.trim();
  if (key) {
    const chainId = resolveStardormChainAgentId(key);
    if (chainId != null && chainId > 1) return `chain-${chainId}`;
    if (/^chain-\d+$/i.test(key)) return key.toLowerCase();
  }
  const path = rich.agentProfilePath?.trim();
  if (!path?.startsWith("/agents/")) return undefined;
  const segment = path.slice("/agents/".length).split("/")[0]?.trim();
  if (!segment || segment.toLowerCase() === "beam-default") return undefined;
  const chainFromPath = resolveStardormChainAgentId(segment);
  if (chainFromPath != null && chainFromPath > 1) return `chain-${chainFromPath}`;
  return segment;
}

export function MarketplaceHireRichCard({ rich }: { rich: MarketplaceHireRich }) {
  const marketplaceTo = rich.marketplacePath?.startsWith("/")
    ? rich.marketplacePath
    : "/marketplace";
  const profileAgentId = agentProfileRouteParam(rich);

  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-primary/25 bg-surface-elevated">
      <MarketplaceHireCardHeader rich={rich} />
      <div className="space-y-2 px-3.5 py-3 text-sm">
        {rich.userTask ? (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Your request: </span>
            {rich.userTask}
          </p>
        ) : null}
        {rich.capability ? (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">They provide: </span>
            {rich.capability}
          </p>
        ) : null}
        {rich.requiredHandler ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            After hire, ask again for action: {rich.requiredHandler}
          </p>
        ) : null}
        <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
          <li>Open the marketplace and hire {rich.specialistName}</li>
          <li>Switch this chat’s active agent to {rich.specialistName}</li>
          <li>Repeat your request for the one-tap action</li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant="default" asChild>
            <Link to={marketplaceTo}>Browse marketplace</Link>
          </Button>
          {profileAgentId ? (
            <Button type="button" size="sm" variant="secondary" asChild>
              <Link to="/agents/$agentId" params={{ agentId: profileAgentId }}>
                <UserRound className="mr-1 h-3.5 w-3.5" />
                View {rich.specialistName}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MarketplaceHireCardHeader({ rich }: { rich: MarketplaceHireRich }) {
  return (
    <div className="flex items-start gap-2 border-b border-border px-3.5 py-2.5">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{rich.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {rich.specialistName}
          {rich.category ? ` · ${rich.category}` : ""}
          {rich.specialistAgentKey ? ` · \`${rich.specialistAgentKey}\`` : ""}
        </p>
        {rich.intro ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{rich.intro}</p>
        ) : null}
      </div>
    </div>
  );
}
