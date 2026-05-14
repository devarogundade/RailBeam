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
import { toast } from "sonner";
import { useWriteContract, useChainId } from "wagmi";
import { formatEther } from "viem";
import {
  getIdentityRegistryAddressForChain,
  identityRegistryAbi,
  IDENTITY_SUBSCRIBE_NUM_DAYS,
} from "@/lib/web3/identity-registry";

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
  const { address, balance, hire, connect } = useApp();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();
  const registry = getIdentityRegistryAddressForChain(chainId);

  if (!agent) return null;

  const value = subscribeValueWei(agent);
  const canHire = Boolean(registry && agent.chainAgentId != null && value !== undefined);
  const costLabel =
    value !== undefined
      ? `${formatEther(value)} 0G`
      : agent.pricePerMonth != null
        ? `${agent.pricePerMonth} 0G / mo`
        : "Not listed";

  const onHire = async () => {
    if (!address) {
      if (connect()) {
        toast.info("Connect your wallet", { description: "Then tap Hire again to finish." });
      }
      return;
    }
    if (!canHire || !registry || agent.chainAgentId == null || value === undefined) {
      toast.error("Cannot subscribe yet", {
        description: "This agent does not have live pricing yet.",
      });
      return;
    }
    try {
      await writeContractAsync({
        address: registry,
        abi: identityRegistryAbi,
        functionName: "subscribe",
        args: [BigInt(agent.chainAgentId), IDENTITY_SUBSCRIBE_NUM_DAYS],
        value,
      });
      hire(agent.id);
      toast.success(`${agent.name} hired`, {
        description: `${formatEther(value)} 0G · ${String(IDENTITY_SUBSCRIBE_NUM_DAYS)} days`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Subscription failed", { description: txError(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CoinIcon /> Hire {agent.name}
          </DialogTitle>
          <DialogDescription>
            Add this agent to your portfolio. You can fire it any time.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center gap-3">
            <img src={agent.avatar} alt="" className="h-12 w-12 rounded-full bg-pill" />
            <div>
              <div className="text-sm font-semibold">{agent.name}</div>
              <div className="text-sm text-muted-foreground">{agent.tagline}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border p-2">
              <div className="text-muted-foreground">Subscription price</div>
              <div className="mt-0.5 flex items-center gap-1 text-base font-semibold">
                <span className="break-all">{costLabel}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Subscription period · {String(IDENTITY_SUBSCRIBE_NUM_DAYS)} days
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
          <Button disabled={isPending || !canHire} onClick={() => void onHire()}>
            {isPending
              ? "Processing…"
              : !canHire
                ? "Pricing unavailable"
                : `Pay & subscribe (${String(IDENTITY_SUBSCRIBE_NUM_DAYS)}d)`}
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
  const { writeContractAsync, isPending } = useWriteContract();
  const registry = getIdentityRegistryAddressForChain(chainId);

  if (!agent) return null;

  const canUnsubscribe = Boolean(registry && agent.chainAgentId != null);

  const onFire = async () => {
    if (canUnsubscribe && registry && agent.chainAgentId != null) {
      try {
        await writeContractAsync({
          address: registry,
          abi: identityRegistryAbi,
          functionName: "unsubscribe",
          args: [BigInt(agent.chainAgentId)],
        });
      } catch (e) {
        toast.error("Could not end subscription", { description: txError(e) });
        return;
      }
    }
    fire(agent.id);
    toast(`${agent.name} fired`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Fire {agent.name}?</DialogTitle>
          <DialogDescription>
            {canUnsubscribe
              ? "This ends your paid subscription. Your portfolio updates after the transaction completes."
              : "This agent will be removed from your portfolio."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={() => void onFire()}>
            {isPending ? "Processing…" : "Fire agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
