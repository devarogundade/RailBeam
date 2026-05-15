import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import {
  useChainId,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { formatUnits } from "viem";
import { publicPaymentRequestSchema } from "@railbeam/stardorm-api-contract";
import type { PublicPaymentRequest } from "@railbeam/stardorm-api-contract";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { waitForWriteContractReceipt } from "@/lib/wait-write-contract-receipt";
import { paymentNetworkLabel, resolvePaymentChainId } from "@/lib/payment-chain";
import {
  isBeamUsdcEAddress,
  settleX402CheckoutViaAccess,
} from "@/lib/x402-checkout";
import { useApp } from "@/lib/app-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageRoutePending } from "@/components/page-shimmer";
import {
  PayCheckoutView,
  type PayCheckoutAmountPresentation,
  type PayCheckoutStatusPresentation,
} from "@/components/pay-checkout-view";
import { queryKeys } from "@/lib/query-keys";
import { invalidateBeamHttpDashboardLists } from "@/lib/query-invalidation";

type PayOutcome =
  | { kind: "success"; txHash: string; resourceUrl?: string }
  | { kind: "error"; message: string };

export const Route = createFileRoute("/pay/$id")({
  component: PayCheckoutPage,
  pendingComponent: () => <PageRoutePending variant="pay" />,
});

const erc20TransferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

function isNativeAsset(asset: string): boolean {
  const a = asset.trim().toLowerCase();
  return (
    a === "native" ||
    a === "a0gi" ||
    a === "eth" ||
    a === `0x${"0".repeat(40)}`
  );
}

function isEvmAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

function stripTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  let out = s.replace(/(\.\d*?)0+$/, "$1");
  if (out.endsWith(".")) out = out.slice(0, -1);
  return out;
}

function shortenMiddle(value: string, headChars = 6, tailChars = 4): string {
  const v = value.trim();
  if (v.length <= headChars + tailChars + 1) return v;
  return `${v.slice(0, headChars)}…${v.slice(-tailChars)}`;
}

function formatBaseUnitsInteger(amountStr: string): string {
  try {
    return BigInt(amountStr.trim()).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  } catch {
    return amountStr;
  }
}

function formatCheckoutAmountLine(
  amountStr: string,
  decimals: number | undefined,
): PayCheckoutAmountPresentation {
  try {
    const n = BigInt(amountStr.trim());
    if (decimals != null && decimals >= 0 && decimals <= 80) {
      return { primary: stripTrailingZeros(formatUnits(n, decimals)) };
    }
  } catch {
    return { primary: amountStr };
  }
  return {
    primary: formatBaseUnitsInteger(amountStr),
    hint: "Smallest units on the token (wei / base units). The seller did not specify decimals for display.",
  };
}

function checkoutTypeLabel(type: PublicPaymentRequest["type"]): string {
  return type === "x402" ? "API access (x402)" : "Direct wallet payment";
}

function statusDisplay(status: PublicPaymentRequest["status"]): PayCheckoutStatusPresentation {
  switch (status) {
    case "pending":
      return { label: "Awaiting payment", className: "text-warning" };
    case "paid":
      return { label: "Paid", className: "text-success" };
    case "expired":
      return { label: "Expired", className: "text-muted-foreground" };
    case "cancelled":
      return { label: "Cancelled", className: "text-destructive" };
    default:
      return { label: status, className: "text-muted-foreground" };
  }
}

function formatExpires(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const abs = d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const rel = formatDistanceToNowStrict(d, { addSuffix: true });
  return `${abs} (${rel})`;
}

async function fetchPublicPayment(id: string) {
  const base = getStardormApiBase();
  if (!base) throw new Error("VITE_STARDORM_API_URL is not set");
  const url = `${base.replace(/\/$/, "")}/payments/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load payment (${res.status})`);
  const json: unknown = await res.json();
  return publicPaymentRequestSchema.parse(json);
}

async function postPaymentSettlement(
  id: string,
  body: { txHash: string; payerAddress?: string },
) {
  const base = getStardormApiBase();
  if (!base) throw new Error("VITE_STARDORM_API_URL is not set");
  const url = `${base.replace(/\/$/, "")}/payments/${encodeURIComponent(id)}/pay`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      txHash: body.txHash,
      ...(body.payerAddress ? { payerAddress: body.payerAddress } : {}),
    }),
  });
  if (!res.ok) {
    let detail = `Could not record payment (${res.status})`;
    try {
      const errJson: unknown = await res.json();
      if (errJson && typeof errJson === "object" && "message" in errJson) {
        const m = (errJson as { message: unknown }).message;
        if (typeof m === "string") detail = m;
        else if (m != null) detail = JSON.stringify(m);
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
  const json: unknown = await res.json();
  return publicPaymentRequestSchema.parse(json);
}

function PayCheckoutPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { address, connect } = useApp();
  const chainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { sendTransactionAsync, isPending: sendingNative } = useSendTransaction();
  const { writeContractAsync, isPending: sendingErc20 } = useWriteContract();

  const [payOutcome, setPayOutcome] = useState<PayOutcome | null>(null);
  const [postSubmitSettling, setPostSubmitSettling] = useState(false);
  const [x402Paying, setX402Paying] = useState(false);

  const q = useQuery({
    queryKey: queryKeys.beamHttp.publicPayment(id),
    queryFn: () => fetchPublicPayment(id),
    retry: 1,
  });

  const confirmPay = useMutation({
    mutationFn: (vars: { txHash: string; payerAddress?: string }) =>
      postPaymentSettlement(id, vars),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.beamHttp.publicPayment(id) });
      invalidateBeamHttpDashboardLists(queryClient);
    },
  });

  const payment = q.data ?? undefined;
  const targetChainId = payment ? resolvePaymentChainId(payment.network) : null;
  const useX402Facilitator =
    payment?.type === "x402" &&
    payment.facilitatorSettlement === true &&
    isBeamUsdcEAddress(payment.asset);

  const needsNetworkSwitch =
    Boolean(address) && targetChainId != null && chainId !== targetChainId;

  const payDisabled =
    !payment ||
    payment.status !== "pending" ||
    targetChainId == null ||
    q.isPending ||
    confirmPay.isPending ||
    postSubmitSettling ||
    x402Paying ||
    (useX402Facilitator && Boolean(address) && !walletClient);

  const walletPayBusy =
    switching ||
    sendingNative ||
    sendingErc20 ||
    postSubmitSettling ||
    x402Paying;

  const amountPresentation =
    payment != null ? formatCheckoutAmountLine(payment.amount, payment.decimals) : null;
  const statusPresentation = payment != null ? statusDisplay(payment.status) : null;
  const friendlyNetwork =
    payment != null ? paymentNetworkLabel(payment.network, targetChainId) : "";
  const apiBaseResolved = getStardormApiBase()?.replace(/\/$/, "") ?? "";

  const onConnect = () => {
    const opened = connect();
    if (opened) toast.message("Wallet", { description: "Choose a wallet to connect." });
  };

  const invalidateAfterPay = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.beamHttp.publicPayment(id) });
    invalidateBeamHttpDashboardLists(queryClient);
  };

  const onPayX402 = async () => {
    if (!payment || !address || targetChainId == null || !walletClient) return;
    const apiBase = getStardormApiBase();
    if (!apiBase) {
      toast.error("API not configured", {
        description: "Set VITE_STARDORM_API_URL for x402 checkout.",
      });
      return;
    }
    try {
      if (chainId !== targetChainId && switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      }
      setX402Paying(true);
      const settled = await settleX402CheckoutViaAccess({
        paymentId: id,
        walletClient,
        publicClient: publicClient ?? null,
        chainId: targetChainId,
        apiBase,
      });
      invalidateAfterPay();
      const resourceUrl =
        settled.resourceUrl?.trim() || payment.resourceUrl?.trim() || undefined;
      setPayOutcome({
        kind: "success",
        txHash: settled.txHash,
        ...(resourceUrl ? { resourceUrl } : {}),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setPayOutcome({ kind: "error", message: msg });
    } finally {
      setX402Paying(false);
    }
  };

  const onPayDirect = async () => {
    if (!payment || !address || targetChainId == null) return;
    try {
      if (chainId !== targetChainId && switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      }
      if (!publicClient) {
        throw new Error("Wallet client unavailable. Refresh and try again.");
      }
      const value = BigInt(payment.amount);
      const to = payment.payTo as `0x${string}`;
      let hash: `0x${string}`;
      if (isNativeAsset(payment.asset)) {
        hash = await sendTransactionAsync({
          chainId: targetChainId,
          to,
          value,
        });
      } else {
        if (!isEvmAddress(payment.asset)) {
          toast.error("Unsupported asset", {
            description:
              "Use a token contract address or native settlement. Symbol-only assets need a contract.",
          });
          return;
        }
        hash = await writeContractAsync({
          chainId: targetChainId,
          address: payment.asset as `0x${string}`,
          abi: erc20TransferAbi,
          functionName: "transfer",
          args: [to, value],
        });
      }
      setPostSubmitSettling(true);
      try {
        await waitForWriteContractReceipt(publicClient, hash);
        const updated = await confirmPay.mutateAsync({
          txHash: hash,
          payerAddress: address,
        });
        const resourceUrl =
          updated.resourceUrl?.trim() || payment.resourceUrl?.trim() || undefined;
        setPayOutcome({
          kind: "success",
          txHash: hash,
          ...(resourceUrl ? { resourceUrl } : {}),
        });
      } finally {
        setPostSubmitSettling(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setPayOutcome({ kind: "error", message: msg });
    }
  };

  const onPay = () => {
    if (!address) {
      onConnect();
      return;
    }
    if (!payment || targetChainId == null) return;
    if (payment.type === "x402" && !isBeamUsdcEAddress(payment.asset)) {
      toast.error("Unsupported asset", {
        description: "x402 checkout only supports USDC.e on 0G mainnet.",
      });
      return;
    }
    if (useX402Facilitator) {
      void onPayX402();
    } else {
      void onPayDirect();
    }
  };

  return (
    <>
      <PayCheckoutView
        address={address ?? undefined}
        onConnect={onConnect}
        apiBase={apiBaseResolved}
        loading={q.isPending}
        loadError={q.isError ? (q.error instanceof Error ? q.error.message : "Could not load payment.") : null}
        apiConfigured={Boolean(getStardormApiBase())}
        payment={payment}
        amountPresentation={amountPresentation}
        statusPresentation={statusPresentation}
        friendlyNetwork={friendlyNetwork}
        targetChainId={targetChainId}
        checkoutTypeLabel={payment ? checkoutTypeLabel(payment.type) : ""}
        formatExpires={formatExpires}
        isNativeAsset={isNativeAsset}
        isEvmAddress={isEvmAddress}
        shortenMiddle={shortenMiddle}
        payDisabled={payDisabled}
        walletPayBusy={walletPayBusy}
        switching={switching}
        sendingNative={sendingNative}
        sendingErc20={sendingErc20}
        confirmPayPending={confirmPay.isPending}
        postSubmitSettling={postSubmitSettling || x402Paying}
        onPay={onPay}
        payUsesX402={useX402Facilitator}
        needsNetworkSwitch={needsNetworkSwitch}
      />

      <AlertDialog
        open={payOutcome != null}
        onOpenChange={(open) => {
          if (!open) setPayOutcome(null);
        }}
      >
        <AlertDialogContent>
          {payOutcome?.kind === "success" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Payment successful</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-left">
                  <span className="block">Your on-chain payment was recorded. Thank you.</span>
                  <span
                    className="block font-mono text-xs text-muted-foreground"
                    title={payOutcome.txHash}
                  >
                    Transaction: {shortenMiddle(payOutcome.txHash, 14, 12)}
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-2">
                <AlertDialogCancel type="button">Close</AlertDialogCancel>
                {payOutcome.resourceUrl ? (
                  <AlertDialogAction asChild>
                    <a
                      href={payOutcome.resourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants()}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Open resource
                    </a>
                  </AlertDialogAction>
                ) : null}
              </AlertDialogFooter>
            </>
          ) : payOutcome?.kind === "error" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Payment could not be completed</AlertDialogTitle>
                <AlertDialogDescription className="text-left">
                  {payOutcome.message}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction type="button">OK</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
