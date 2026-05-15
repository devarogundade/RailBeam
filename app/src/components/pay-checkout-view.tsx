import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Lock,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type { PublicPaymentRequest } from "@railbeam/stardorm-api-contract";
import { Button, buttonVariants } from "@/components/ui/button";
import { CoinIcon } from "@/components/icons";
import { StorageFile } from "@/components/storage-file";
import { StorageImage } from "@/components/storage-image";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PayCheckoutAmountPresentation = {
  primary: string;
  hint?: string;
};

export type PayCheckoutStatusPresentation = {
  label: string;
  className: string;
};

type PayCheckoutViewProps = {
  address: string | undefined;
  onConnect: () => void;
  apiBase: string;
  loading: boolean;
  loadError: string | null;
  apiConfigured: boolean;
  payment: PublicPaymentRequest | undefined;
  amountPresentation: PayCheckoutAmountPresentation | null;
  statusPresentation: PayCheckoutStatusPresentation | null;
  friendlyNetwork: string;
  targetChainId: number | null;
  checkoutTypeLabel: string;
  formatExpires: (iso: string) => string;
  isNativeAsset: (asset: string) => boolean;
  isEvmAddress: (s: string) => boolean;
  shortenMiddle: (value: string, headChars?: number, tailChars?: number) => string;
  payDisabled: boolean;
  walletPayBusy: boolean;
  switching: boolean;
  sendingNative: boolean;
  sendingErc20: boolean;
  confirmPayPending: boolean;
  postSubmitSettling: boolean;
  onPay: () => void;
  /** When true, settlement uses x402 wallet authorization (not a manual transfer). */
  payUsesX402?: boolean;
  /** Wallet is connected but on a different chain than the payment requires. */
  needsNetworkSwitch?: boolean;
};

export function PayCheckoutView(props: PayCheckoutViewProps) {
  const {
    address,
    onConnect,
    apiBase,
    loading,
    loadError,
    apiConfigured,
    payment,
    amountPresentation,
    statusPresentation,
    friendlyNetwork,
    targetChainId,
    checkoutTypeLabel,
    formatExpires,
    isNativeAsset,
    isEvmAddress,
    shortenMiddle,
    payDisabled,
    walletPayBusy,
    switching,
    sendingNative,
    sendingErc20,
    confirmPayPending,
    postSubmitSettling,
    onPay,
    payUsesX402 = false,
    needsNetworkSwitch = false,
  } = props;

  const payButtonLabel = !address
    ? "Connect wallet"
    : confirmPayPending
      ? "Recording payment…"
      : postSubmitSettling
        ? payUsesX402
          ? "Authorizing x402 payment…"
          : "Confirming on-chain…"
        : switching
          ? "Confirm in wallet…"
          : needsNetworkSwitch
            ? `Switch to ${friendlyNetwork}`
            : sendingNative || sendingErc20
              ? "Confirm in wallet…"
              : "Pay now";

  return (
    <CheckoutShell>
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CoinIcon className="h-5 w-5" />
          Beam
        </Link>
        <WalletConnectChip address={address} onConnect={onConnect} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="relative flex flex-col bg-surface-elevated text-foreground lg:w-[min(100%,480px)] lg:shrink-0 xl:w-[42%]">
          <div className="hidden border-b border-border px-6 py-4 lg:block">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90 transition-colors hover:text-foreground"
            >
              <CoinIcon className="h-5 w-5" />
              Beam
            </Link>
          </div>

          <div className="flex flex-1 flex-col px-6 py-8 lg:px-10 lg:py-12">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            {!apiConfigured ? (
              <p className="text-sm text-muted-foreground">
                Set <code className="rounded bg-foreground/10 px-1 py-0.5">VITE_STARDORM_API_URL</code> to load
                this checkout.
              </p>
            ) : loading ? (
              <SummarySkeleton />
            ) : loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : payment == null ? (
              <div>
                <EmptyState
                  icon={ShoppingBag}
                  title="This checkout is unavailable"
                  description="The link may be wrong, expired, or removed. Ask the sender for a new link."
                >
                  <Link
                    to="/"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
                  >
                    Back to Beam
                  </Link>
                </EmptyState>
              </div>
            ) : (
              <CheckoutSummaryPanel
                payment={payment}
                amountPresentation={amountPresentation}
                statusPresentation={statusPresentation}
                checkoutTypeLabel={checkoutTypeLabel}
                friendlyNetwork={friendlyNetwork}
                apiBase={apiBase}
                formatExpires={formatExpires}
                isNativeAsset={isNativeAsset}
                isEvmAddress={isEvmAddress}
                shortenMiddle={shortenMiddle}
              />
            )}
          </div>

          <AsideFooter>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Secured checkout · Beam
            </span>
          </AsideFooter>
        </aside>

        <section className="flex flex-1 flex-col bg-background">
          <div className="hidden items-center justify-between border-b border-border px-10 py-4 lg:flex">
            <p className="text-sm font-medium text-foreground">Complete your payment</p>
            <WalletConnectChip address={address} onConnect={onConnect} />
          </div>

          <div className="flex flex-1 flex-col px-6 py-8 sm:px-10 sm:py-10 lg:max-w-xl lg:py-12">
            {!apiConfigured || loading || loadError || payment == null ? (
              <div className="flex flex-1 items-center justify-center">
                {loading || !apiConfigured ? <PaymentSkeleton /> : null}
              </div>
            ) : (
              <CheckoutPaymentPanel
                payment={payment}
                address={address}
                onConnect={onConnect}
                friendlyNetwork={friendlyNetwork}
                targetChainId={targetChainId}
                statusPresentation={statusPresentation}
                isNativeAsset={isNativeAsset}
                isEvmAddress={isEvmAddress}
                shortenMiddle={shortenMiddle}
                payDisabled={payDisabled}
                walletPayBusy={walletPayBusy}
                payButtonLabel={payButtonLabel}
                payUsesX402={payUsesX402}
                onPay={onPay}
              />
            )}
          </div>

          <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground sm:px-10">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Payments settle on-chain. Beam records your transaction after confirmation.
            </span>
          </footer>
        </section>
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">{children}</div>
  );
}

function AsideFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto hidden border-t border-border px-10 py-5 text-xs text-muted-foreground lg:block">
      {children}
    </div>
  );
}

function WalletConnectChip({
  address,
  onConnect,
}: {
  address: string | undefined;
  onConnect: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shadow-sm"
      onClick={onConnect}
    >
      <Wallet className="mr-1.5 h-3.5 w-3.5" />
      {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet"}
    </Button>
  );
}

function CheckoutSummaryPanel({
  payment,
  amountPresentation,
  statusPresentation,
  checkoutTypeLabel,
  friendlyNetwork,
  apiBase,
  formatExpires,
  isNativeAsset,
  isEvmAddress,
  shortenMiddle,
}: {
  payment: PublicPaymentRequest;
  amountPresentation: PayCheckoutAmountPresentation | null;
  statusPresentation: PayCheckoutStatusPresentation | null;
  checkoutTypeLabel: string;
  friendlyNetwork: string;
  apiBase: string;
  formatExpires: (iso: string) => string;
  isNativeAsset: (asset: string) => boolean;
  isEvmAddress: (s: string) => boolean;
  shortenMiddle: (value: string, headChars?: number, tailChars?: number) => string;
}) {
  const tokenLabel = isNativeAsset(payment.asset)
    ? "Native token"
    : isEvmAddress(payment.asset)
      ? "ERC-20"
      : payment.asset;

  return (
    <div className="flex flex-col">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{checkoutTypeLabel}</p>
      <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-[1.75rem]">
        {payment.title}
      </h1>
      {payment.description ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{payment.description}</p>
      ) : null}

      {statusPresentation ? (
        <div
          className={cn(
            "mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-foreground/5 px-3 py-1 text-xs font-medium",
            statusPresentation.className,
          )}
        >
          {payment.status === "paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {statusPresentation.label}
        </div>
      ) : null}

      {amountPresentation ? (
        <div className="mt-10 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">Total due</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight sm:text-[2.5rem]">
            {amountPresentation.primary}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {tokenLabel}
            {payment.decimals != null ? ` · ${payment.decimals} decimals` : ""}
            {" · "}
            {friendlyNetwork}
          </p>
          {amountPresentation.hint ? (
            <p className="mt-2 text-xs leading-snug text-muted-foreground/80">{amountPresentation.hint}</p>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-8 space-y-3 border-t border-border pt-6 text-sm">
        <SummaryLine label="Pay to" value={shortenMiddle(payment.payTo, 8, 6)} title={payment.payTo} />
        {!isNativeAsset(payment.asset) && isEvmAddress(payment.asset) ? (
          <SummaryLine label="Token" value={shortenMiddle(payment.asset, 10, 8)} title={payment.asset} />
        ) : null}
        {payment.expiresAt ? (
          <SummaryLine label="Expires" value={formatExpires(payment.expiresAt)} />
        ) : null}
        {payment.resourceUrl ? (
          <li className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">Resource</span>
            <a
              href={payment.resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="max-w-[14rem] truncate text-right font-medium underline-offset-2 hover:underline"
            >
              Open link
            </a>
          </li>
        ) : null}
      </ul>

      {payment.attachment ? (
        <AttachmentBlock payment={payment} apiBase={apiBase} />
      ) : null}
    </div>
  );
}

function SummaryLine({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <li className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground sm:text-sm" title={title}>
        {value}
      </span>
    </li>
  );
}

function AttachmentBlock({
  payment,
  apiBase,
}: {
  payment: PublicPaymentRequest;
  apiBase: string;
}) {
  const att = payment.attachment!;
  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-border bg-foreground/5">
      <div className="px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">Included</p>
        <p className="mt-0.5 truncate text-sm font-medium" title={att.name}>
          {att.name}
        </p>
      </div>
      {att.mimeType.startsWith("image/") ? (
        <>
          <StorageImage rootHash={att.hash} alt="" className="max-h-44 w-full object-cover" />
          {apiBase ? (
            <div className="flex justify-end border-t border-border px-4 py-2">
              <StorageFile
                apiBase={apiBase}
                rootHash={att.hash}
                fileName={att.name}
                className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Download
              </StorageFile>
            </div>
          ) : null}
        </>
      ) : (
        <AttachmentFileRow apiBase={apiBase} att={att} />
      )}
    </div>
  );
}

function AttachmentFileRow({
  apiBase,
  att,
}: {
  apiBase: string;
  att: NonNullable<PublicPaymentRequest["attachment"]>;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-3">
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      {apiBase ? (
        <StorageFile
          apiBase={apiBase}
          rootHash={att.hash}
          fileName={att.name}
          className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Download file
        </StorageFile>
      ) : (
        <span className="text-xs text-muted-foreground">{att.mimeType}</span>
      )}
    </div>
  );
}

function CheckoutPaymentPanel({
  payment,
  address,
  onConnect,
  friendlyNetwork,
  targetChainId,
  statusPresentation,
  isNativeAsset,
  isEvmAddress,
  shortenMiddle,
  payDisabled,
  walletPayBusy,
  payButtonLabel,
  payUsesX402,
  onPay,
}: {
  payment: PublicPaymentRequest;
  address: string | undefined;
  onConnect: () => void;
  friendlyNetwork: string;
  targetChainId: number | null;
  statusPresentation: PayCheckoutStatusPresentation | null;
  isNativeAsset: (asset: string) => boolean;
  isEvmAddress: (s: string) => boolean;
  shortenMiddle: (value: string, headChars?: number, tailChars?: number) => string;
  payDisabled: boolean;
  walletPayBusy: boolean;
  payButtonLabel: string;
  payUsesX402: boolean;
  onPay: () => void;
}) {
  const isPending = payment.status === "pending";
  const isPaid = payment.status === "paid";

  return (
    <div className="flex w-full flex-col">
      <div className="mb-6 lg:hidden">
        <WalletConnectChip address={address} onConnect={onConnect} />
      </div>

      <h2 className="text-lg font-semibold text-foreground">Pay with crypto wallet</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {payUsesX402
          ? `Connect a wallet on ${friendlyNetwork}, then sign the x402 payment authorization in your wallet. Settlement is recorded automatically.`
          : `Connect a wallet on ${friendlyNetwork}, then approve the transfer. We'll confirm once the transaction is on-chain.`}
      </p>

      <div className="mt-8 space-y-0 rounded-lg border border-border bg-surface p-5">
        <PaymentDetailRow
          label="Wallet"
          value={
            address ? (
              <span className="font-mono text-sm text-foreground">{shortenMiddle(address, 8, 6)}</span>
            ) : (
              <button
                type="button"
                onClick={onConnect}
                className="text-sm font-medium text-primary hover:underline"
              >
                Connect to continue
              </button>
            )
          }
        />
        <PaymentDetailRow label="Network" value={friendlyNetwork} />
        <PaymentDetailRow
          label="Asset"
          value={
            isNativeAsset(payment.asset)
              ? "Native token"
              : isEvmAddress(payment.asset)
                ? shortenMiddle(payment.asset, 10, 8)
                : payment.asset
          }
        />
        <PaymentDetailRow
          label="Recipient"
          value={
            <span className="font-mono text-sm" title={payment.payTo}>
              {shortenMiddle(payment.payTo, 8, 6)}
            </span>
          }
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              onClick={() =>
                void navigator.clipboard.writeText(payment.payTo).then(
                  () => toast.success("Address copied"),
                  () => toast.error("Could not copy"),
                )
              }
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          }
        />
      </div>

      {isPaid ? (
        <PaidBanner payment={payment} statusPresentation={statusPresentation} shortenMiddle={shortenMiddle} />
      ) : !isPending ? (
        <p className="mt-8 text-sm text-muted-foreground">
          This checkout is {statusPresentation?.label?.toLowerCase() ?? payment.status} and no longer
          accepts payment.
        </p>
      ) : targetChainId != null ? (
        <Button
          type="button"
          size="lg"
          className="mt-8 h-12 w-full text-base font-semibold"
          loading={walletPayBusy}
          disabled={payDisabled}
          onClick={() => void onPay()}
        >
          {payButtonLabel}
        </Button>
      ) : null}

      {payment.resourceUrl && isPaid ? (
        <Button type="button" variant="outline" className="mt-4 w-full" asChild>
          <a href={payment.resourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open resource
          </a>
        </Button>
      ) : null}

      {payment.type === "x402" && payment.x402Payload ? (
        <details className="mt-8 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">Technical details (x402)</summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-surface p-3 font-mono text-[11px] text-foreground/80">
            {JSON.stringify(payment.x402Payload, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function PaidBanner({
  payment,
  statusPresentation,
  shortenMiddle,
}: {
  payment: PublicPaymentRequest;
  statusPresentation: PayCheckoutStatusPresentation | null;
  shortenMiddle: (value: string, headChars?: number, tailChars?: number) => string;
}) {
  return (
    <div className="mt-8 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
      <p className="font-medium">Payment complete</p>
      <p className="mt-1 text-success/90">
        {statusPresentation?.label ?? "Paid"}. No further action is required.
      </p>
      {payment.txHash ? (
        <p className="mt-2 font-mono text-xs text-success/80" title={payment.txHash}>
          Tx {shortenMiddle(payment.txHash, 12, 10)}
        </p>
      ) : null}
    </div>
  );
}

function PaymentDetailRow({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 text-right">
        {typeof value === "string" ? (
          <span className="text-sm font-medium text-foreground">{value}</span>
        ) : (
          value
        )}
        {action}
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-3 w-24 bg-foreground/10" />
      <Skeleton className="h-8 w-3/4 max-w-xs bg-foreground/10" />
      <Skeleton className="h-4 w-full max-w-sm bg-foreground/8" />
      <Skeleton className="mt-6 h-12 w-40 bg-foreground/10" />
    </div>
  );
}

function PaymentSkeleton() {
  return (
    <div className="w-full max-w-md space-y-4" aria-hidden>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full max-w-sm" />
      <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}
