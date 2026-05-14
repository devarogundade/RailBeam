import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Star, Users, Zap, ArrowLeft, ShieldCheck, ClipboardList } from "lucide-react";
import { AgentOnchainFeedback } from "@/components/agent-onchain-feedback";
import { CloneDialog, HireDialog, FireDialog } from "@/components/agent-dialogs";
import { resolveCatalogAgentByParamId } from "@/lib/resolve-catalog-agent";
import { readStoredBeamPreferredChainId } from "@/lib/beam-network-storage";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { isBeamConfiguredChainId } from "@/lib/beam-chain-config";
import { stardormClientChainIdRef } from "@/lib/stardorm-client-chain";
import { getStardormSubgraphUrlForChain } from "@/lib/stardorm-subgraph-config";
import { useStardormValidationsForAgent } from "@/lib/hooks/use-stardorm-subgraph";
import { CLONED_AGENT_AVATAR_RING_CLASS } from "@/lib/cloned-agent-avatar";
import {
  agentPortfolioAddCta,
  agentPortfolioRemoveCta,
  canUserCloneCatalogAgent,
  isRegistryTokenIdOneAgent,
  isViewerOwnedClone,
  REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
} from "@/lib/registry-token-one-agent";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";
import { useChainId, useConnection, usePublicClient, useWriteContract } from "wagmi";
import { getAddress, isAddress } from "viem";
import { waitForWriteContractReceipt } from "@/lib/wait-write-contract-receipt";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { queryKeys } from "@/lib/query-keys";
import {
  getIdentityRegistryAddressForChain,
  identityRegistryAbi,
} from "@/lib/web3/identity-registry";
import {
  mergeDisplayFieldsIntoRegistrationUri,
  parseAgentUriFromString,
} from "@/lib/agent-uri-metadata";
import { EmptyState } from "@/components/empty-state";
import { PageRoutePending, ValidationsListSkeleton } from "@/components/page-shimmer";

export const Route = createFileRoute("/agents/$agentId")({
  loader: async ({ context, params }) => {
    const beamCh = stardormClientChainIdRef.current ?? readStoredBeamPreferredChainId();
    const agent = await resolveCatalogAgentByParamId(
      context.queryClient,
      beamCh,
      params.agentId,
    );
    if (!agent) throw notFound();
    return { agent };
  },
  component: AgentDetail,
  pendingComponent: () => <PageRoutePending variant="default" />,
  notFoundComponent: () => (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Agent not found.
    </div>
  ),
});

function AgentDetail() {
  const { agent } = Route.useLoaderData();
  const { effectiveChainId } = useBeamNetwork();
  const { address, isHired, ownedClones, setActiveAgentId } = useApp();
  const hired = isHired(agent.id);
  const [hireOpen, setHireOpen] = React.useState(false);
  const [fireOpen, setFireOpen] = React.useState(false);
  const [cloneOpen, setCloneOpen] = React.useState(false);

  const ownedCloneIds = React.useMemo(
    () => new Set(ownedClones.map((a) => a.id)),
    [ownedClones],
  );
  const isOwnedClone = isViewerOwnedClone(agent, address, ownedCloneIds);
  /** Registry token #1 (Beam) is available to everyone without a hire; see `registry-token-one-agent`. */
  const canUseChat = hired || isOwnedClone || isRegistryTokenIdOneAgent(agent);

  const subgraphOn = Boolean(
    isBeamConfiguredChainId(effectiveChainId) && getStardormSubgraphUrlForChain(effectiveChainId),
  );
  const showClone = subgraphOn && canUserCloneCatalogAgent(agent);
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
                  {!hired && !isOwnedClone && !isRegistryTokenIdOneAgent(agent) ? (
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
                  {!isOwnedClone ? (
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
              )}
            </div>
          </div>
        </div>

        {isOwnedClone ? (
          <div className="mt-6 space-y-6">
            <CloneOwnerUriPanel agent={agent} beamChainId={effectiveChainId} />
            <CloneOwnerTokenActions agent={agent} beamChainId={effectiveChainId} />
          </div>
        ) : null}

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
                <ValidationsListSkeleton />
              ) : validations.isError ? (
                <p className="mt-3 text-sm text-destructive">
                  Could not load validation history. Try again later.
                </p>
              ) : !validations.data?.length ? (
                <div className="mt-3">
                  <EmptyState
                    icon={ClipboardList}
                    title="No validation events yet"
                    description="When this agent completes verification flows on-chain, the latest checks will show up in this timeline."
                  />
                </div>
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

const REGISTRY_ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function CloneOwnerTokenActions({ agent, beamChainId }: { agent: Agent; beamChainId: number }) {
  const navigate = useNavigate();
  const { address } = useConnection();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const registry = getIdentityRegistryAddressForChain(chainId);
  const qc = useQueryClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [newOwnerRaw, setNewOwnerRaw] = React.useState("");
  const [burnDialogOpen, setBurnDialogOpen] = React.useState(false);

  const tokenId = agent.chainAgentId;
  const walletLower = address?.toLowerCase();
  const canManageOnChain =
    Boolean(
      agent.isCloned &&
        walletLower &&
        agent.ownerAddress &&
        agent.ownerAddress === walletLower,
    ) && tokenId != null;

  const invalidateCatalog = () => {
    void qc.invalidateQueries({
      queryKey: [...queryKeys.agents.all, "catalog", beamChainId],
      exact: false,
    });
  };

  const onTransferOwnership = async () => {
    if (!registry || !address || tokenId == null) {
      toast.error("Wallet or registry not available");
      return;
    }
    const trimmed = newOwnerRaw.trim();
    if (!isAddress(trimmed)) {
      toast.error("Enter a valid 0x recipient address");
      return;
    }
    let recipient: `0x${string}`;
    try {
      recipient = getAddress(trimmed);
    } catch {
      toast.error("Invalid address");
      return;
    }
    if (recipient.toLowerCase() === address.toLowerCase()) {
      toast.error("That recipient is already you");
      return;
    }
    if (recipient === REGISTRY_ZERO_ADDRESS) {
      toast.error('Use "Burn this clone" to destroy the token');
      return;
    }
    try {
      if (!publicClient) {
        toast.error("Wallet client unavailable", {
          description: "Refresh the page and try again.",
        });
        return;
      }
      const hash = await writeContractAsync({
        address: registry,
        abi: identityRegistryAbi,
        functionName: "transferFrom",
        args: [address, recipient, BigInt(tokenId)],
      });
      await waitForWriteContractReceipt(publicClient, hash);
      setNewOwnerRaw("");
      invalidateCatalog();
      toast.success("Ownership transferred", {
        description: `Token #${tokenId} now belongs to ${recipient.slice(0, 6)}…${recipient.slice(-4)}.`,
      });
      void navigate({ to: "/agents" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Transfer failed", { description: msg });
    }
  };

  const onBurnToken = async () => {
    if (!registry || !address || tokenId == null) {
      toast.error("Wallet or registry not available");
      return;
    }
    try {
      if (!publicClient) {
        toast.error("Wallet client unavailable", {
          description: "Refresh the page and try again.",
        });
        return;
      }
      const hash = await writeContractAsync({
        address: registry,
        abi: identityRegistryAbi,
        functionName: "transferFrom",
        args: [address, REGISTRY_ZERO_ADDRESS, BigInt(tokenId)],
      });
      await waitForWriteContractReceipt(publicClient, hash);
      setBurnDialogOpen(false);
      invalidateCatalog();
      toast.success("Clone burned", {
        description: `Registry token #${tokenId} was destroyed (sent to the zero address).`,
      });
      void navigate({ to: "/agents" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Burn failed", { description: msg });
    }
  };

  if (!canManageOnChain) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Registry token</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Connect the wallet that owns this clone to transfer or burn it.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Registry token</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Transfer full ERC-721 ownership to another wallet, or burn this clone by transferring it
          to the zero address (cannot be undone).
        </p>

        <div className="mt-4 space-y-2">
          <Label htmlFor="clone-transfer-recipient">New owner address</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="clone-transfer-recipient"
              className="font-mono text-xs sm:flex-1"
              placeholder="0x…"
              value={newOwnerRaw}
              onChange={(e) => setNewOwnerRaw(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || !newOwnerRaw.trim()}
              onClick={() => void onTransferOwnership()}
            >
              {isPending ? "Waiting…" : "Transfer ownership"}
            </Button>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => setBurnDialogOpen(true)}
          >
            Burn this clone
          </Button>
        </div>
      </div>

      <AlertDialog open={burnDialogOpen} onOpenChange={setBurnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Burn this clone?</AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              This sends registry token #{tokenId} to the zero address, which destroys the NFT on
              this network. You cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => void onBurnToken()}
            >
              {isPending ? "Confirm in wallet…" : "Burn permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
      if (!publicClient) {
        toast.error("Wallet client unavailable", {
          description: "Refresh the page and try again.",
        });
        return;
      }
      const hash = await writeContractAsync({
        address: registry,
        abi: identityRegistryAbi,
        functionName: "setAgentURI",
        args: [BigInt(agent.chainAgentId), nextUri],
      });
      await waitForWriteContractReceipt(publicClient, hash);
      toast.success("Listing updated", {
        description: "Name, description, and image are saved on-chain.",
      });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.agents.all, "catalog", beamChainId],
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
