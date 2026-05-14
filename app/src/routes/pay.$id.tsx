import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { Copy, ExternalLink, FileText, ShoppingBag } from "lucide-react";
import {
  useChainId,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { formatUnits } from "viem";
import { zeroGMainnet, zeroGTestnet } from "viem/chains";
import { publicPaymentRequestSchema } from "@beam/stardorm-api-contract";
import type { PublicPaymentRequest } from "@beam/stardorm-api-contract";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { waitForWriteContractReceipt } from "@/lib/wait-write-contract-receipt";
import { resolvePaymentChainId } from "@/lib/payment-chain";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { CoinIcon } from "@/components/icons";
import { StorageFile } from "@/components/storage-file";
import { StorageImage } from "@/components/storage-image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageRoutePending, PayCheckoutCardSkeleton } from "@/components/page-shimmer";

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
): { primary: string; hint?: string } {
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

function networkLabel(networkRaw: string, chainId: number | null): string {
  if (chainId === zeroGTestnet.id) return zeroGTestnet.name;
  if (chainId === zeroGMainnet.id) return zeroGMainnet.name;
  if (chainId != null) return `Chain ${chainId}`;
  const n = networkRaw.trim();
  if (n) return n;
  return "Unknown network";
}

function checkoutTypeLabel(type: PublicPaymentRequest["type"]): string {
  return type === "x402" ? "API access (x402)" : "Direct wallet payment";
}

function statusDisplay(status: PublicPaymentRequest["status"]): { label: string; className: string } {
  switch (status) {
    case "pending":
      return { label: "Awaiting payment", className: "text-amber-600 dark:text-amber-400" };
    case "paid":
      return { label: "Paid", className: "text-emerald-600 dark:text-emerald-400" };
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
  const { sendTransactionAsync, isPending: sendingNative } = useSendTransaction();
  const { writeContractAsync, isPending: sendingErc20 } = useWriteContract();

  const [payOutcome, setPayOutcome] = useState<PayOutcome | null>(null);

  const q = useQuery({
    queryKey: ["public-payment", id],
    queryFn: () => fetchPublicPayment(id),
    retry: 1,
  });

  const confirmPay = useMutation({
    mutationFn: (vars: { txHash: string; payerAddress?: string }) =>
      postPaymentSettlement(id, vars),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["public-payment", id] });
    },
  });

  const payment = q.data ?? undefined;
  const targetChainId = payment
    ? resolvePaymentChainId(payment.network)
    : null;

  const payDisabled =
    !payment ||
    payment.status !== "pending" ||
    !address ||
    targetChainId == null ||
    q.isPending ||
    confirmPay.isPending;

  const amountPresentation =
    payment != null
      ? formatCheckoutAmountLine(payment.amount, payment.decimals)
      : null;
  const statusPresentation =
    payment != null ? statusDisplay(payment.status) : null;
  const friendlyNetwork =
    payment != null ? networkLabel(payment.network, targetChainId) : "";
  const apiBaseResolved = getStardormApiBase()?.replace(/\/$/, "") ?? "";

  const onPay = async () => {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setPayOutcome({ kind: "error", message: msg });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CoinIcon className="h-5 w-5" />
          Beam
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const opened = connect();
            if (opened) toast.message("Wallet", { description: "Choose a wallet to connect." });
          }}
        >
          {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet"}
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {!getStardormApiBase() ? (
            <p className="text-sm text-muted-foreground">
              Set <code className="text-foreground">VITE_STARDORM_API_URL</code> to load this payment.
            </p>
          ) : q.isPending ? (
            <PayCheckoutCardSkeleton />
          ) : q.isError ? (
            <p className="text-sm text-destructive">
              {q.error instanceof Error ? q.error.message : "Could not load payment."}
            </p>
          ) : payment == null ? (
            <EmptyState
              icon={ShoppingBag}
              title="This checkout is unavailable"
              description="The link may be wrong, the payment was removed, or it already expired. Ask the sender for a fresh checkout link."
            >
              <Link
                to="/"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
              >
                Back to Beam
              </Link>
            </EmptyState>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {checkoutTypeLabel(payment.type)}
                </span>
                {statusPresentation ? (
                  <span
                    className={cn(
                      "rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium",
                      statusPresentation.className,
                    )}
                  >
                    {statusPresentation.label}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 text-xl font-bold leading-tight">{payment.title}</h1>
              {payment.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{payment.description}</p>
              ) : null}

              {amountPresentation ? (
                <div className="mt-6 rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Amount</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                    {amountPresentation.primary}
                  </p>
                  {amountPresentation.hint ? (
                    <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                      {amountPresentation.hint}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {payment.attachment ? (
                <div className="mt-6 overflow-hidden rounded-xl border border-border bg-background/80">
                  <div className="border-b border-border px-4 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">Included with this payment</p>
                    <p
                      className="mt-0.5 truncate text-sm font-medium text-foreground"
                      title={payment.attachment.name}
                    >
                      {payment.attachment.name}
                    </p>
                    {payment.attachment.size ? (
                      <p className="text-xs text-muted-foreground">{payment.attachment.size}</p>
                    ) : null}
                  </div>
                  {payment.attachment.mimeType.startsWith("image/") ? (
                    <>
                      <StorageImage
                        rootHash={payment.attachment.hash}
                        alt=""
                        className="max-h-56 w-full object-cover"
                      />
                      {apiBaseResolved ? (
                        <div className="flex justify-end border-t border-border px-4 py-2">
                          <StorageFile
                            apiBase={apiBaseResolved}
                            rootHash={payment.attachment.hash}
                            fileName={payment.attachment.name}
                            className="text-sm font-medium text-primary hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download
                          </StorageFile>
                        </div>
                      ) : (
                        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                          Set <code className="text-foreground">VITE_STARDORM_API_URL</code> to download this
                          file.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                        {payment.attachment.mimeType}
                      </span>
                      {apiBaseResolved ? (
                        <StorageFile
                          apiBase={apiBaseResolved}
                          rootHash={payment.attachment.hash}
                          fileName={payment.attachment.name}
                          className="shrink-0 text-sm font-medium text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download
                        </StorageFile>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">API URL required</span>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <dt className="shrink-0 text-muted-foreground">Recipient address</dt>
                  <dd className="flex flex-col items-stretch gap-2 sm:items-end">
                    <span
                      className="font-mono text-xs leading-relaxed text-foreground sm:text-right"
                      title={payment.payTo}
                    >
                      {shortenMiddle(payment.payTo, 8, 6)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1 self-start sm:self-end"
                      onClick={() =>
                        void navigator.clipboard.writeText(payment.payTo).then(
                          () => toast.success("Address copied"),
                          () =>
                            toast.error("Could not copy", {
                              description: "Clipboard permission denied or unavailable.",
                            }),
                        )
                      }
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy full address
                    </Button>
                  </dd>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <dt className="shrink-0 text-muted-foreground">Token</dt>
                  <dd className="text-right sm:max-w-[18rem]">
                    <div className="font-medium text-foreground">
                      {isNativeAsset(payment.asset)
                        ? "Native token"
                        : isEvmAddress(payment.asset)
                          ? "ERC-20 token"
                          : "Token"}
                    </div>
                    {!isNativeAsset(payment.asset) ? (
                      <div
                        className="mt-0.5 break-all font-mono text-xs text-muted-foreground"
                        title={payment.asset}
                      >
                        {isEvmAddress(payment.asset)
                          ? shortenMiddle(payment.asset, 10, 8)
                          : payment.asset}
                      </div>
                    ) : null}
                  </dd>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <dt className="shrink-0 text-muted-foreground">Network</dt>
                  <dd className="text-right">
                    <div className="font-medium text-foreground">{friendlyNetwork}</div>
                    {payment.network.trim() &&
                    friendlyNetwork !== payment.network.trim() ? (
                      <div
                        className="mt-0.5 font-mono text-xs text-muted-foreground"
                        title={payment.network}
                      >
                        {payment.network}
                      </div>
                    ) : null}
                  </dd>
                </div>

                {payment.expiresAt ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <dt className="shrink-0 text-muted-foreground">Expires</dt>
                    <dd className="text-right text-sm leading-snug text-foreground">
                      {formatExpires(payment.expiresAt)}
                    </dd>
                  </div>
                ) : null}

                {payment.resourceUrl ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <dt className="shrink-0 text-muted-foreground">Related resource</dt>
                    <dd className="min-w-0 text-right">
                      <a
                        href={payment.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Open link
                      </a>
                    </dd>
                  </div>
                ) : null}

                {payment.txHash ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <dt className="shrink-0 text-muted-foreground">Transaction</dt>
                    <dd className="flex flex-col items-stretch gap-2 sm:items-end">
                      <span className="font-mono text-xs text-foreground" title={payment.txHash}>
                        {shortenMiddle(payment.txHash, 12, 10)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() =>
                          void navigator.clipboard.writeText(payment.txHash!).then(
                            () => toast.success("Transaction hash copied"),
                            () => toast.error("Could not copy"),
                          )
                        }
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy hash
                      </Button>
                    </dd>
                  </div>
                ) : null}

                {payment.paidByWallet ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <dt className="shrink-0 text-muted-foreground">Paid from wallet</dt>
                    <dd
                      className="font-mono text-xs text-foreground sm:text-right"
                      title={payment.paidByWallet}
                    >
                      {shortenMiddle(payment.paidByWallet, 8, 6)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {payment.status !== "pending" ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  {statusPresentation?.label ?? payment.status}. Sending funds from your wallet is only
                  available while this request is awaiting payment.
                </p>
              ) : targetChainId == null ? (
                <p className="mt-6 text-sm text-destructive">
                  Unknown network &quot;{payment.network}&quot;. Add a numeric chain id (e.g.{" "}
                  {String(zeroGTestnet.id)} for 0G testnet) so your wallet can switch correctly.
                </p>
              ) : (
                <Button
                  className="mt-8 w-full font-semibold"
                  disabled={payDisabled || switching || sendingNative || sendingErc20}
                  onClick={() => void onPay()}
                >
                  {confirmPay.isPending
                    ? "Recording payment…"
                    : switching || sendingNative || sendingErc20
                      ? "Confirm in wallet…"
                      : isNativeAsset(payment.asset)
                        ? "Send native token"
                        : "Send ERC-20"}
                </Button>
              )}

              {payment.type === "x402" && payment.x402Payload ? (
                <details className="mt-6 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Technical details (x402 protocol)
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-background/80 p-2 font-mono">
                    {JSON.stringify(payment.x402Payload, null, 2)}
                  </pre>
                </details>
              ) : null}
            </>
          )}
        </div>
      </main>

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
    </div>
  );
}
