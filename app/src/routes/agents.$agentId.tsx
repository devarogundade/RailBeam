import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import * as React from "react";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Star, Users, Zap, ArrowLeft, ShieldCheck } from "lucide-react";
import { AgentOnchainFeedback } from "@/components/agent-onchain-feedback";
import { CloneDialog, HireDialog, FireDialog } from "@/components/agent-dialogs";
import { resolveCatalogAgentByParamId } from "@/lib/resolve-catalog-agent";
import { readStoredBeamPreferredChainId } from "@/lib/beam-network-storage";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { getStardormSubgraphUrl, getStardormSubgraphUrlForChain } from "@/lib/stardorm-subgraph-config";
import { useStardormValidationsForAgent } from "@/lib/hooks/use-stardorm-subgraph";
import { CLONED_AGENT_AVATAR_RING_CLASS } from "@/lib/cloned-agent-avatar";
import {
  agentPortfolioAddCta,
  agentPortfolioRemoveCta,
  isRegistryTokenIdOneAgent,
  REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
} from "@/lib/registry-token-one-agent";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";
import { useChainId, usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getIdentityRegistryAddressForChain,
  identityRegistryAbi,
} from "@/lib/web3/identity-registry";
import {
  mergeDisplayFieldsIntoRegistrationUri,
  parseAgentUriFromString,
} from "@/lib/agent-uri-metadata";

export const Route = createFileRoute("/agents/$agentId")({
  loader: async ({ context, params }) => {
    const beamCh = readStoredBeamPreferredChainId();
    const agent = await resolveCatalogAgentByParamId(
      context.queryClient,
      beamCh,
      params.agentId,
    );
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
  const { address, isHired, setActiveAgentId } = useApp();
  const hired = isHired(agent.id);
  const [hireOpen, setHireOpen] = React.useState(false);
  const [fireOpen, setFireOpen] = React.useState(false);
  const [cloneOpen, setCloneOpen] = React.useState(false);

  const isOwnedClone = Boolean(
    agent.isCloned &&
      address &&
      agent.ownerAddress &&
      agent.ownerAddress === address.toLowerCase(),
  );
  const canUseChat = hired || isOwnedClone;

  const subgraphOn = Boolean(
    getStardormSubgraphUrl() && getStardormSubgraphUrlForChain(effectiveChainId),
  );
  const showClone =
    subgraphOn &&
    !agent.isCloned &&
    agent.chainAgentId != null &&
    agent.id !== "beam-default" &&
    !isRegistryTokenIdOneAgent(agent);
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
        label: "Employers",
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
            <img
              src={agent.avatar}
              alt=""
              className={cn(
                "h-24 w-24 rounded-2xl bg-pill",
                isRegistryTokenIdOneAgent(agent) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
                agent.isCloned && CLONED_AGENT_AVATAR_RING_CLASS,
              )}
            />
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
              {agent.isCloned ? (
                <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  Clone
                </span>
              ) : null}
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
              {canUseChat ? (
                <>
                  <Button asChild onClick={() => setActiveAgentId(agent.id)}>
                    <Link to="/">Chat with {agent.name}</Link>
                  </Button>
                  {hired && !isRegistryTokenIdOneAgent(agent) ? (
                    <Button variant="outline" onClick={() => setFireOpen(true)}>
                      {agentPortfolioRemoveCta(agent)}
                    </Button>
                  ) : null}
                  {!hired && !agent.isCloned ? (
                    <Button onClick={() => setHireOpen(true)}>
                      {agentPortfolioAddCta(agent, agent.name)}
                    </Button>
                  ) : null}
                  {showClone ? (
                    <Button variant="outline" onClick={() => setCloneOpen(true)}>
                      Clone to my wallet
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link to="/marketplace">Browse marketplace</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setHireOpen(true)}>
                    {agentPortfolioAddCta(agent, agent.name)}
                  </Button>
                  {showClone ? (
                    <Button variant="outline" onClick={() => setCloneOpen(true)}>
                      Clone to my wallet
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link to="/marketplace">Browse marketplace</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {isOwnedClone ? <CloneOwnerUriPanel agent={agent} beamChainId={effectiveChainId} /> : null}

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
      <CloneDialog agent={agent} open={cloneOpen} onOpenChange={setCloneOpen} />
    </div>
  );
}

function CloneOwnerUriPanel({ agent, beamChainId }: { agent: Agent; beamChainId: number }) {
  const parsed = React.useMemo(
    () => parseAgentUriFromString(agent.registrationUriRaw ?? null),
    [agent.registrationUriRaw],
  );
  const [name, setName] = React.useState(agent.name);
  const [description, setDescription] = React.useState(agent.description);
  const [imageUrl, setImageUrl] = React.useState(
    () => (parsed?.imageUrl?.trim() ? parsed.imageUrl.trim() : agent.avatar),
  );

  React.useEffect(() => {
    setName(agent.name);
    setDescription(agent.description);
    setImageUrl(parsed?.imageUrl?.trim() ? parsed.imageUrl.trim() : agent.avatar);
  }, [agent.id, agent.name, agent.description, agent.avatar, parsed?.imageUrl]);

  const chainId = useChainId();
  const publicClient = usePublicClient();
  const qc = useQueryClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const registry = getIdentityRegistryAddressForChain(chainId);

  const onSave = async () => {
    if (!registry || agent.chainAgentId == null) {
      toast.error("Registry not available on this network");
      return;
    }
    const nextUri = mergeDisplayFieldsIntoRegistrationUri(agent.registrationUriRaw, {
      name,
      description,
      imageUrl,
    });
    try {
      await writeContractAsync({
        address: registry,
        abi: identityRegistryAbi,
        functionName: "setAgentURI",
        args: [BigInt(agent.chainAgentId), nextUri],
      });
      toast.success("Listing updated", {
        description: "Name, description, and image are saved on-chain.",
      });
      void qc.invalidateQueries({
        queryKey: ["agents", "catalog", beamChainId],
        exact: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Could not update listing", { description: msg });
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Your clone listing</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Update how this agent appears on-chain (name, description, image). Callable skills and
        services stay tied to the original registration and cannot be edited here.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clone-uri-name">Display name</Label>
          <Input
            id="clone-uri-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clone-uri-image">Image URL</Label>
          <Input
            id="clone-uri-image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Label htmlFor="clone-uri-desc">Description</Label>
        <textarea
          id="clone-uri-desc"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[88px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" disabled={isPending || !publicClient} onClick={() => void onSave()}>
          {isPending ? "Saving…" : "Save on-chain"}
        </Button>
      </div>
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
