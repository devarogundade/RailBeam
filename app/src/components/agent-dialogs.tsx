import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-state";
import { CoinIcon } from "@/components/icons";
import type { Agent } from "@/lib/types";
import { CLONED_AGENT_AVATAR_RING_CLASS } from "@/lib/cloned-agent-avatar";
import {
  agentPortfolioAddCta,
  agentPortfolioAddVerb,
  agentPortfolioRemoveCta,
  agentPortfolioRemoveDialogTitle,
  canUserCloneCatalogAgent,
  isRegistryTokenIdOneAgent,
  isViewerOwnedClone,
  REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
} from "@/lib/registry-token-one-agent";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWriteContract, useChainId, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { decodeEventLog } from "viem";
import { waitForWriteContractReceipt } from "@/lib/wait-write-contract-receipt";
import { useChainConfirmationLoading } from "@/lib/use-chain-confirmation-loading";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { invalidateAfterIdentityRegistryWrite } from "@/lib/query-invalidation";
import {
  getIdentityRegistryAddressForChain,
  identityRegistryAbi,
  IDENTITY_SUBSCRIBE_NUM_DAYS,
} from "@/lib/web3/identity-registry";

/** When true, clone UI stays visible but on-chain clone is blocked. */
const CLONING_RESTRICTED = true;

function txError(err: unknown): string {
  if (err && typeof err === "object" && "shortMessage" in err) {
    const m = (err as { shortMessage?: unknown }).shortMessage;
    if (typeof m === "string" && m.length > 0) return m;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Exact wei the wallet must send to `subscribe(agentId, IDENTITY_SUBSCRIBE_NUM_DAYS)` (no overpay).
 * Returns `undefined` when the subgraph has not given us a per-day rate.
 */
function subscribeValueWei(agent: Agent): bigint | undefined {
  if (!agent.feePerDayWei) return undefined;
  try {
    const perDay = BigInt(agent.feePerDayWei);
    if (perDay <= 0n) return undefined;
    return perDay * IDENTITY_SUBSCRIBE_NUM_DAYS;
  } catch {
    return undefined;
  }
}

export function HireDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { address, balance, hire, connect, ownedClones } = useApp();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { busy: hireBusy, awaitingReceiptOnly: hireAwaitingReceipt, withReceiptWait: withHireReceiptWait } =
    useChainConfirmationLoading(isPending);
  const registry = getIdentityRegistryAddressForChain(chainId);

  const ownedCloneIds = React.useMemo(
    () => new Set(ownedClones.map((a) => a.id)),
    [ownedClones],
  );

  if (!agent) return null;
  const isOwnClone = isViewerOwnedClone(agent, address, ownedCloneIds);

  const tokenOne = isRegistryTokenIdOneAgent(agent);
  const addVerb = agentPortfolioAddVerb(agent);
  const addCtaTitle = agentPortfolioAddCta(agent, agent.name);

  const value = subscribeValueWei(agent);
  const canHire = Boolean(
    registry && agent.chainAgentId != null && value !== undefined && !isOwnClone,
  );
  const costLabel =
    value !== undefined
      ? `${formatEther(value)} 0G`
      : agent.pricePerMonth != null
        ? `${agent.pricePerMonth} 0G / mo`
        : "Not listed";

  const onHire = async () => {
    if (!address) {
      if (connect()) {
        toast.info("Connect your wallet", {
          description: `Then tap ${addVerb} again to finish.`,
        });
      }
      return;
    }
    if (!canHire || !registry || agent.chainAgentId == null || value === undefined) {
      toast.error("Cannot hire yet", {
        description: "This agent does not have live pricing yet.",
      });
      return;
    }
    if (!publicClient) {
      toast.error("Wallet client unavailable", {
        description: "Refresh the page and try again.",
      });
      return;
    }
    if (isOwnClone) {
      toast.error("You cannot hire your own clone", {
        description: "You already own this registry token — open chat to use it.",
      });
      return;
    }
    const hireChainAgentId = agent.chainAgentId;
    if (hireChainAgentId == null) return;
    try {
      await withHireReceiptWait(async () => {
        const hash = await writeContractAsync({
          address: registry,
          abi: identityRegistryAbi,
          functionName: "subscribe",
          args: [BigInt(hireChainAgentId), IDENTITY_SUBSCRIBE_NUM_DAYS],
          value,
        });
        await waitForWriteContractReceipt(publicClient, hash);
      });
      hire(agent.id);
      toast.success(
        tokenOne ? `${agent.name} is available in chat` : `${agent.name} hired`,
        {
          description: `${formatEther(value)} 0G · ${String(IDENTITY_SUBSCRIBE_NUM_DAYS)} days`,
        },
      );
      onOpenChange(false);
    } catch (e) {
      toast.error("Hire failed", { description: txError(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CoinIcon /> {addCtaTitle}
          </DialogTitle>
          <DialogDescription>
            {tokenOne
              ? "Use this agent in conversation. You can remove it later."
              : "Add this agent to your portfolio. You can fire it any time."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center gap-3">
            <img
              src={agent.avatar}
              alt=""
              className={cn(
                "h-12 w-12 rounded-full bg-pill",
                isRegistryTokenIdOneAgent(agent) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
                agent.isCloned && CLONED_AGENT_AVATAR_RING_CLASS,
              )}
            />
            <div>
              <div className="text-sm font-semibold">{agent.name}</div>
              <div className="text-sm text-muted-foreground">{agent.tagline}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border p-2">
              <div className="text-muted-foreground">Employer payment</div>
              <div className="mt-0.5 flex items-center gap-1 text-base font-semibold">
                <span className="break-all">{costLabel}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Hire period · {String(IDENTITY_SUBSCRIBE_NUM_DAYS)} days
              </div>
            </div>
            <div className="rounded-md border border-border p-2">
              <div className="text-muted-foreground">Your balance</div>
              <div className="mt-0.5 flex items-center gap-1 text-base font-semibold">
                <CoinIcon className="h-3.5 w-3.5" /> {balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={hireBusy}
            disabled={hireBusy || !canHire}
            onClick={() => void onHire()}
          >
            {hireBusy
              ? hireAwaitingReceipt
                ? "Confirming on-chain…"
                : "Processing…"
              : isOwnClone
                ? "You own this clone"
                : !canHire
                  ? "Pricing unavailable"
                  : `Pay & hire (${String(IDENTITY_SUBSCRIBE_NUM_DAYS)}d)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FireDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { fire } = useApp();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { busy: fireBusy, awaitingReceiptOnly: fireAwaitingReceipt, withReceiptWait: withFireReceiptWait } =
    useChainConfirmationLoading(isPending);
  const registry = getIdentityRegistryAddressForChain(chainId);

  if (!agent) return null;

  const tokenOne = isRegistryTokenIdOneAgent(agent);
  const removeCta = agentPortfolioRemoveCta(agent);
  const removeTitle = agentPortfolioRemoveDialogTitle(agent, agent.name);

  const canUnsubscribe = Boolean(registry && agent.chainAgentId != null);

  const onFire = async () => {
    const fireChainAgentId = agent.chainAgentId;
    if (canUnsubscribe && registry && fireChainAgentId != null) {
      try {
        if (!publicClient) {
          toast.error("Wallet client unavailable", {
            description: "Refresh the page and try again.",
          });
          return;
        }
        await withFireReceiptWait(async () => {
          const hash = await writeContractAsync({
            address: registry,
            abi: identityRegistryAbi,
            functionName: "unsubscribe",
            args: [BigInt(fireChainAgentId)],
          });
          await waitForWriteContractReceipt(publicClient, hash);
        });
      } catch (e) {
        toast.error("Could not complete fire", { description: txError(e) });
        return;
      }
    }
    fire(agent.id);
    toast(tokenOne ? `${agent.name} removed from your workspace` : `${agent.name} fired`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{removeTitle}</DialogTitle>
          <DialogDescription>
            {tokenOne
              ? "This agent will be removed from your workspace."
              : canUnsubscribe
                ? "This ends your paid hire. Your portfolio updates after the transaction completes."
                : "This agent will be removed from your portfolio."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep
          </Button>
          <Button
            variant="destructive"
            loading={fireBusy}
            disabled={fireBusy}
            onClick={() => void onFire()}
          >
            {fireBusy ? (fireAwaitingReceipt ? "Confirming on-chain…" : "Processing…") : removeCta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CloneDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { address, connect } = useApp();
  const chainId = useChainId();
  const { effectiveChainId } = useBeamNetwork();
  const publicClient = usePublicClient();
  const qc = useQueryClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { busy: cloneBusy, awaitingReceiptOnly: cloneAwaitingReceipt, withReceiptWait: withCloneReceiptWait } =
    useChainConfirmationLoading(isPending);
  const registry = getIdentityRegistryAddressForChain(chainId);
  const [newTokenId, setNewTokenId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) setNewTokenId(null);
  }, [open]);

  if (!agent) return null;

  const registryReady = Boolean(
    registry && canUserCloneCatalogAgent(agent) && publicClient,
  );

  const onClone = async () => {
    if (CLONING_RESTRICTED) {
      toast.error("Cloning restricted", {
        description: "Cloning is restricted at the moment. Try hiring the agent instead.",
      });
      return;
    }
    if (!address) {
      if (connect()) {
        toast.info("Connect your wallet", { description: "Then confirm clone again." });
      }
      return;
    }
    if (!canUserCloneCatalogAgent(agent)) {
      toast.error("Cannot clone", {
        description: "The default Beam agent cannot be cloned.",
      });
      return;
    }
    if (!registryReady || !registry || !publicClient) {
      toast.error("Cannot clone", { description: "Check network and agent token id." });
      return;
    }
    const chainAgentId = agent.chainAgentId;
    if (chainAgentId == null) return;
    try {
      const receipt = await withCloneReceiptWait(async () => {
        const hash = await writeContractAsync({
          address: registry,
          abi: identityRegistryAbi,
          functionName: "clone",
          args: [
            address as `0x${string}`,
            BigInt(chainAgentId),
            "0x" as `0x${string}`,
            "0x" as `0x${string}`,
          ],
        });
        return waitForWriteContractReceipt(publicClient, hash);
      });
      let minted: number | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== registry.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: identityRegistryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "Cloned") {
            const args = decoded.args as { newTokenId: bigint };
            minted = Number(args.newTokenId);
            break;
          }
        } catch {
          /* not this log */
        }
      }
      if (minted != null) setNewTokenId(minted);
      invalidateAfterIdentityRegistryWrite(qc, effectiveChainId);
      toast.success("Clone minted", {
        description:
          minted != null
            ? `New registry token #${minted}. It appears under My Agents → Cloned after indexing.`
            : "Check My Agents → Cloned once the indexer catches up.",
      });
    } catch (e) {
      toast.error("Clone failed", { description: txError(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone {agent.name}</DialogTitle>
          <DialogDescription>
            Mint your own registry token with the same on-chain skills and capabilities as this
            agent. You can rename and rebrand your copy, but it will{" "}
            <span className="font-medium text-foreground">not</span> receive updates if the
            creator changes the original listing. To always use the live version with ongoing
            updates, hire the original agent instead.
          </DialogDescription>
        </DialogHeader>

        {CLONING_RESTRICTED ? (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-foreground/90">
            Cloning is restricted at the moment. Use{" "}
            <span className="font-medium">Hire</span> to add the original agent to your workspace
            instead.
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-foreground/90">
            On-chain <code className="text-[11px]">clone</code> succeeds only when your wallet is
            authorized to act for this token (owner or approved operator). If the transaction
            reverts, use <span className="font-medium">Hire</span> to add the original agent to your
            workspace.
          </div>
        )}

        {newTokenId != null ? (
          <div className="text-sm">
            <Button asChild variant="secondary" className="w-full">
              <Link
                to="/agents/$agentId"
                params={{ agentId: `chain-${newTokenId}` }}
                onClick={() => onOpenChange(false)}
              >
                Open your clone
              </Link>
            </Button>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={cloneBusy}
            disabled={cloneBusy || CLONING_RESTRICTED || !registryReady}
            onClick={() => void onClone()}
          >
            {cloneBusy
              ? cloneAwaitingReceipt
                ? "Confirming on-chain…"
                : "Confirm in wallet…"
              : "Clone on-chain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
