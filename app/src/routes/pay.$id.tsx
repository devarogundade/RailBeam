import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useChainId,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { publicPaymentRequestSchema } from "@beam/stardorm-api-contract";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { resolvePaymentChainId } from "@/lib/payment-chain";
import { zeroGTestnet } from "viem/chains";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/icons";
import { toast } from "sonner";

export const Route = createFileRoute("/pay/$id")({
  component: PayCheckoutPage,
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
  const { sendTransactionAsync, isPending: sendingNative } = useSendTransaction();
  const { writeContractAsync, isPending: sendingErc20 } = useWriteContract();

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

  const onPay = async () => {
    if (!payment || !address || targetChainId == null) return;
    try {
      if (chainId !== targetChainId && switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
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
      await confirmPay.mutateAsync({
        txHash: hash,
        payerAddress: address,
      });
      toast.success("Payment recorded", { description: hash });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      toast.error(msg);
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
            <p className="text-sm text-muted-foreground">Loading payment…</p>
          ) : q.isError ? (
            <p className="text-sm text-destructive">
              {q.error instanceof Error ? q.error.message : "Could not load payment."}
            </p>
          ) : payment == null ? (
            <p className="text-sm text-muted-foreground">This payment link is invalid or expired.</p>
          ) : (
            <>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {payment.type === "x402" ? "x402 checkout" : "On-chain payment"}
              </div>
              <h1 className="mt-1 text-xl font-bold">{payment.title}</h1>
              {payment.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{payment.description}</p>
              ) : null}
              <dl className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-mono text-right">{payment.amount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Asset</dt>
                  <dd className="break-all text-right font-mono">{payment.asset}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Pay to</dt>
                  <dd className="break-all text-right font-mono">{payment.payTo}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Network</dt>
                  <dd className="text-right">{payment.network}</dd>
                </div>
                {payment.expiresAt ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Expires</dt>
                    <dd className="text-right">{new Date(payment.expiresAt).toLocaleString()}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="text-right capitalize">{payment.status}</dd>
                </div>
                {payment.txHash ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Tx</dt>
                    <dd className="break-all text-right font-mono text-xs">{payment.txHash}</dd>
                  </div>
                ) : null}
                {payment.paidByWallet ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Paid from</dt>
                    <dd className="break-all text-right font-mono text-xs">{payment.paidByWallet}</dd>
                  </div>
                ) : null}
              </dl>

              {payment.status !== "pending" ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  This request is {payment.status}. On-chain settlement is only available while status
                  is pending.
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
                  <summary className="cursor-pointer text-muted-foreground">x402 payload</summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-background/80 p-2 font-mono">
                    {JSON.stringify(payment.x402Payload, null, 2)}
                  </pre>
                </details>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
