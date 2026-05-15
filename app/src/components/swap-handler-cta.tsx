import * as React from "react";
import {
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { maxUint256 } from "viem";
import { toast } from "sonner";
import type { ChatHandlerResult } from "@railbeam/stardorm-api-contract";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { waitForWriteContractReceipt } from "@/lib/wait-write-contract-receipt";
import {
  BEAM_MAINNET_CAIP2,
  BEAM_MAINNET_SWAP_ROUTER,
  isSwapNetworkBlocked,
} from "@/lib/beam-swap-config";
import { erc20ApproveAbi, uniswapV3SwapRouterAbi } from "@/lib/web3/uniswap-v3-swap-router.abi";

function parseCaip2Eip155ChainId(network: unknown): number | null {
  if (typeof network !== "string") return null;
  const m = /^eip155:(\d+)$/.exec(network.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isEvmAddress20(s: unknown): s is `0x${string}` {
  return typeof s === "string" && /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function isTokenSwapHandler(h: string): h is "draft_token_swap" {
  return h === "draft_token_swap";
}

export function SwapHandlerCtaRow({
  messageId,
  params,
  label,
  txConfirmed,
  onPersistResult,
}: {
  messageId: string;
  params: Record<string, unknown>;
  label: string;
  txConfirmed?: boolean;
  onPersistResult?: (result: ChatHandlerResult) => void | Promise<void>;
}) {
  const { address, connect } = useApp();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [lastHash, setLastHash] = React.useState<`0x${string}` | null>(null);
  const [step, setStep] = React.useState<"idle" | "approve" | "swap">("idle");

  React.useEffect(() => {
    setLastHash(null);
    setStep("idle");
  }, [messageId]);

  const onSwap = async () => {
    if (!address) {
      const opened = connect();
      if (opened) {
        toast.message("Wallet required", {
          description: "Connect in the modal, then tap swap again.",
        });
      }
      return;
    }

    const network = typeof params.network === "string" ? params.network : "";
    const blocked = isSwapNetworkBlocked(network);
    if (blocked) {
      toast.error("Network not supported", { description: blocked });
      return;
    }

    const targetChainId = parseCaip2Eip155ChainId(network);
    if (targetChainId == null) {
      toast.error("Invalid network", { description: "Expected CAIP-2 `eip155:<chainId>`." });
      return;
    }

    if (!isEvmAddress20(params.tokenIn) || !isEvmAddress20(params.tokenOut)) {
      toast.error("Invalid tokens on the swap draft.");
      return;
    }

    const amountInRaw = params.amountInWei;
    if (typeof amountInRaw !== "string" || !/^[1-9]\d*$/.test(amountInRaw.trim())) {
      toast.error("Invalid amountInWei on the draft.");
      return;
    }
    const amountIn = BigInt(amountInRaw.trim());

    const minOutRaw = params.amountOutMinimumWei;
    const amountOutMinimum =
      typeof minOutRaw === "string" && /^\d+$/.test(minOutRaw.trim())
        ? BigInt(minOutRaw.trim())
        : 0n;

    const poolFee = params.poolFee;
    const fee =
      poolFee === 500 || poolFee === 3000 || poolFee === 10000 ? poolFee : 3000;

    const router = (
      isEvmAddress20(params.router) ? params.router.trim() : BEAM_MAINNET_SWAP_ROUTER
    ).toLowerCase() as `0x${string}`;

    const deadlineRaw = params.deadlineUnix;
    const deadline =
      typeof deadlineRaw === "number" && Number.isFinite(deadlineRaw) && deadlineRaw > 0
        ? BigInt(Math.floor(deadlineRaw))
        : BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

    const tokenIn = params.tokenIn.trim().toLowerCase() as `0x${string}`;
    const tokenOut = params.tokenOut.trim().toLowerCase() as `0x${string}`;
    const recipient = address.toLowerCase() as `0x${string}`;

    try {
      if (chainId !== targetChainId && switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      }
      if (!publicClient) {
        throw new Error("Wallet RPC client unavailable. Refresh and try again.");
      }

      const allowance = await publicClient.readContract({
        address: tokenIn,
        abi: erc20ApproveAbi,
        functionName: "allowance",
        args: [recipient, router],
      });

      if (allowance < amountIn) {
        setStep("approve");
        const approveHash = await writeContractAsync({
          chainId: targetChainId,
          address: tokenIn,
          abi: erc20ApproveAbi,
          functionName: "approve",
          args: [router, maxUint256],
        });
        await waitForWriteContractReceipt(publicClient, approveHash);
      }

      setStep("swap");
      const swapHash = await writeContractAsync({
        chainId: targetChainId,
        address: router,
        abi: uniswapV3SwapRouterAbi,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn,
            tokenOut,
            fee,
            recipient,
            deadline,
            amountIn,
            amountOutMinimum,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
      await waitForWriteContractReceipt(publicClient, swapHash);
      setLastHash(swapHash);
      const network = typeof params.network === "string" ? params.network.trim() : undefined;
      await onPersistResult?.({
        kind: "wallet_tx",
        status: "confirmed",
        txHash: swapHash,
        network,
        chainId: targetChainId,
        handler: "draft_token_swap",
        updatedAt: Date.now(),
      });
      toast.success("Swap submitted", { description: swapHash });
    } catch (e) {
      const network = typeof params.network === "string" ? params.network.trim() : undefined;
      void onPersistResult?.({
        kind: "wallet_tx",
        status: "failed",
        error: errMsg(e),
        network,
        chainId: targetChainId,
        handler: "draft_token_swap",
        updatedAt: Date.now(),
      });
      toast.error(step === "approve" ? "Approve failed" : "Swap failed", {
        description: errMsg(e),
      });
    } finally {
      setStep("idle");
    }
  };

  const busy = writing || step !== "idle";
  const busyLabel =
    step === "approve" ? "Approving…" : step === "swap" ? "Swapping…" : label;

  return (
    <div className="flex flex-col gap-2 px-0.5">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={busy}
        disabled={busy || txConfirmed === true}
        onClick={() => void onSwap()}
      >
        {busy ? busyLabel : label}
      </Button>
      {lastHash ? (
        <p className="text-[11px] text-muted-foreground font-mono break-all">{lastHash}</p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        Router on {BEAM_MAINNET_CAIP2}. Testnet swaps are blocked.
      </p>
    </div>
  );
}
