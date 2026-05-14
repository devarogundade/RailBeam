import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useChainId,
  useConnection,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";
import type { Agent } from "@/lib/types";
import type { AgentOnchainFeedbackItem } from "@beam/stardorm-api-contract";
import { useAgentFeedbacksInfinite } from "@/lib/hooks/use-agent-feedbacks";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { isBeamConfiguredChainId } from "@/lib/beam-chain-config";
import { getStardormSubgraphUrlForChain } from "@/lib/stardorm-subgraph-config";
import {
  getIdentityRegistryAddressForChain,
  identityRegistryAbi,
} from "@/lib/web3/identity-registry";
import {
  buildBeamFeedbackPayload,
  getReputationRegistryAddressForChain,
  reputationRegistryAbi,
} from "@/lib/web3/reputation-registry";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { waitForWriteContractReceipt } from "@/lib/wait-write-contract-receipt";
import { invalidateSubgraphChain } from "@/lib/query-invalidation";
import { useChainConfirmationLoading } from "@/lib/use-chain-confirmation-loading";
import { isRegistryTokenIdOneAgent } from "@/lib/registry-token-one-agent";
import { Loader2, MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ValidationsListSkeleton } from "@/components/page-shimmer";

function txToastDescription(err: unknown): string {
  if (err && typeof err === "object" && "shortMessage" in err) {
    const m = (err as { shortMessage?: unknown; }).shortMessage;
    if (typeof m === "string" && m.length > 0) return m;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function scoreFromFeedback(f: AgentOnchainFeedbackItem): string {
  try {
    const v = BigInt(f.value);
    const d = f.valueDecimals;
    if (d <= 0) return v.toString();
    const neg = v < 0n;
    const abs = neg ? -v : v;
    const scaled = Number(abs) / 10 ** d;
    const s = scaled.toFixed(Math.min(d, 4));
    return neg ? `-${s}` : s;
  } catch {
    return f.value;
  }
}

function parseBeamFeedbackUri(uri: string): { stars?: number; comment?: string; } {
  try {
    const o = JSON.parse(uri) as { schema?: string; stars?: number; comment?: string; };
    if (o.schema === "beam.feedback/v1" && typeof o.stars === "number") {
      return {
        stars: o.stars,
        comment: typeof o.comment === "string" ? o.comment : undefined,
      };
    }
  } catch {
    void 0;
  }
  return {};
}

function shortAddr(a: string) {
  if (!a.startsWith("0x") || a.length < 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function AgentOnchainFeedback({ agent }: { agent: Agent; }) {
  const chainId = useChainId();
  const { effectiveChainId } = useBeamNetwork();
  const subgraphConfigured = Boolean(
    isBeamConfiguredChainId(effectiveChainId) && getStardormSubgraphUrlForChain(effectiveChainId),
  );
  const PAGE_SIZE = 15;
  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAgentFeedbacksInfinite(agent.id, agent.chainAgentId, PAGE_SIZE);
  const { address } = useConnection();
  const queryClient = useQueryClient();
  const reputation = React.useMemo(() => getReputationRegistryAddressForChain(chainId), [chainId]);
  const identity = React.useMemo(() => getIdentityRegistryAddressForChain(chainId), [chainId]);
  const chainAgentId = agent.chainAgentId;

  const { data: tokenOwner } = useReadContract({
    address: identity,
    abi: identityRegistryAbi,
    functionName: "ownerOf",
    args: [BigInt(chainAgentId ?? 0)],
    query: {
      enabled: Boolean(identity && chainAgentId != null),
    },
  });

  const isAgentOwner =
    Boolean(address && tokenOwner) &&
    address!.toLowerCase() === (tokenOwner as `0x${string}`).toLowerCase();

  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: wagmiWritePending } = useWriteContract();
  const {
    busy: feedbackTxBusy,
    awaitingReceiptOnly: feedbackAwaitingReceipt,
    withReceiptWait: withFeedbackReceiptWait,
  } = useChainConfirmationLoading(wagmiWritePending);
  const [stars, setStars] = React.useState(5);
  const [comment, setComment] = React.useState("");

  const canSubmitOnchain =
    Boolean(reputation && chainAgentId != null && address && !isAgentOwner);

  const onSubmitFeedback = async () => {
    if (!reputation || chainAgentId == null || !address) return;
    if (isAgentOwner) {
      toast.error("Cannot submit feedback", {
        description: "The agent owner cannot leave feedback on their own agent.",
      });
      return;
    }
    const payload = buildBeamFeedbackPayload(stars, comment);
    try {
      if (!publicClient) {
        toast.error("Wallet client unavailable", {
          description: "Refresh the page and try again.",
        });
        return;
      }
      await withFeedbackReceiptWait(async () => {
        const hash = await writeContractAsync({
          address: reputation,
          abi: reputationRegistryAbi,
          functionName: "giveFeedback",
          args: [
            BigInt(chainAgentId),
            BigInt(stars),
            0,
            "beam",
            `stars:${stars}`,
            typeof window !== "undefined" ? window.location.origin : "https://railbeam.xyz",
            payload.feedbackURI,
            payload.feedbackHash,
          ],
        });
        await waitForWriteContractReceipt(publicClient, hash);
      });
      toast.success("Review submitted");
      setComment("");
      void invalidateSubgraphChain(queryClient, effectiveChainId);
    } catch (e) {
      toast.error("Transaction failed", { description: txToastDescription(e) });
    }
  };

  const merged = React.useMemo(
    () => data?.pages.flatMap((p) => p.feedbacks) ?? [],
    [data?.pages],
  );

  const scrollRootRef = React.useRef<HTMLDivElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const root = scrollRootRef.current;
    const el = sentinelRef.current;
    if (!root || !el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: "80px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, merged.length]);

  if (!subgraphConfigured) {
    return (
      <div className="mt-10 rounded-xl border border-border bg-surface-elevated p-4 text-sm text-muted-foreground">
        Reviews are not available in this version of the app.
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reviews</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isRegistryTokenIdOneAgent(agent)
            ? "Ratings and comments from people who use this agent. New reviews may take a short time to appear."
            : "Ratings and comments from people who hired this agent. New reviews may take a short time to appear."}
        </p>
      </div>

      {chainAgentId != null && !reputation ? (
        <p className="rounded-xl border border-dashed border-border bg-surface-elevated p-3 text-sm text-muted-foreground">
          Posting reviews is not set up for this app yet. Check back after the next update.
        </p>
      ) : null}

      {reputation && chainAgentId != null ? (
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <h3 className="text-sm font-medium">Leave feedback</h3>
          {!address ? (
            <p className="mt-2 text-sm text-muted-foreground">Connect a wallet to submit feedback.</p>
          ) : isAgentOwner ? (
            <p className="mt-2 text-sm text-muted-foreground">
              You own this agent listing, so you cannot leave a review for it.
            </p>
          ) : (
            <>
              <div className="mt-3 space-y-2">
                <Label className="text-sm text-muted-foreground">Rating (1–5)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStars(n)}
                      className={cn(
                        "h-9 w-9 rounded-md border text-sm font-medium transition-colors",
                        stars === n
                          ? "border-(--border-medium) bg-pill text-pill-foreground"
                          : "border-border bg-surface hover:bg-(--bg-hover)",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="fb-comment" className="text-sm text-muted-foreground">
                  Comment (optional)
                </Label>
                <Textarea
                  id="fb-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="What worked well or what could improve?"
                  className="resize-none text-sm"
                  maxLength={2000}
                />
              </div>
              <Button
                className="mt-4"
                loading={feedbackTxBusy}
                disabled={!canSubmitOnchain || feedbackTxBusy}
                onClick={() => void onSubmitFeedback()}
              >
                {feedbackTxBusy
                  ? feedbackAwaitingReceipt
                    ? "Confirming on-chain…"
                    : "Confirm in wallet…"
                  : "Submit review"}
              </Button>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This agent is not on the registry yet. Reviews are available for published agents.
        </p>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-medium">Recent feedback</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          More entries load as you scroll.
        </p>
        {chainAgentId == null ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Reviews could not be loaded for this agent.
          </p>
        ) : isPending ? (
          <ValidationsListSkeleton />
        ) : isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load reviews. Try again later.</p>
        ) : merged.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={MessageSquareText}
              title="No on-chain reviews yet"
              description="Be the first to leave feedback once this agent is published on the registry. Reviews are stored on-chain and show up here for everyone."
            />
          </div>
        ) : (
          <div
            ref={(el) => {
              scrollRootRef.current = el;
            }}
            className="mt-3 max-h-[min(28rem,55vh)] overflow-y-auto pr-1"
          >
            <ul className="space-y-3">
              {merged.map((f) => {
                const parsed = parseBeamFeedbackUri(f.feedbackURI);
                const displayScore =
                  parsed.stars != null ? String(parsed.stars) : scoreFromFeedback(f);
                return (
                  <li
                    key={f.id}
                    className={cn(
                      "rounded-lg border border-border bg-surface-elevated p-3 text-sm",
                      f.revoked && "opacity-50 line-through",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono">{shortAddr(f.clientAddress)}</span>
                      <span>·</span>
                      <span>score {displayScore}</span>
                      {f.revoked && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                          Revoked
                        </span>
                      )}
                    </div>
                    {parsed.comment ? (
                      <p className="mt-2 text-foreground/90">{parsed.comment}</p>
                    ) : f.tag1 || f.tag2 ? (
                      <p className="mt-2 text-muted-foreground">
                        {f.tag1}
                        {f.tag2 ? ` · ${f.tag2}` : ""}
                      </p>
                    ) : null}
                    {f.endpoint ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">via {f.endpoint}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <div
              ref={sentinelRef}
              className="flex h-10 items-center justify-center text-muted-foreground"
            >
              {isFetchingNextPage ? (
                <span className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
                </span>
              ) : hasNextPage ? (
                <span className="text-[11px]">Scroll for more</span>
              ) : (
                <span className="text-[11px]">End of list</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
