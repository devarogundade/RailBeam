import * as React from "react";
import { ArrowDownToLine, Plus } from "lucide-react";
import type { CreditCardPublic } from "@railbeam/stardorm-api-contract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VirtualCreditCard } from "@/components/virtual-credit-card";
import { cn } from "@/lib/utils";

export type VirtualCardFundsMode = "fund" | "withdraw";

const QUICK_AMOUNTS = [10, 25, 50, 100] as const;

function dollarsToCents(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return cents > 0 ? cents : null;
}

function centsToDollarsString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function cardTitle(card: CreditCardPublic): string {
  return card.cardLabel ?? "Virtual card";
}

function formatBalance(card: CreditCardPublic): string {
  return `${card.currency} ${(card.balanceCents / 100).toFixed(2)}`;
}

export function VirtualCardFundsDialog({
  open,
  onOpenChange,
  mode,
  card,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: VirtualCardFundsMode;
  card: CreditCardPublic;
  loading: boolean;
  onSubmit: (dollars: string) => void | Promise<void>;
}) {
  const [amount, setAmount] = React.useState("");
  const isFund = mode === "fund";

  React.useEffect(() => {
    if (!open) setAmount("");
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dollarsToCents(amount) == null) return;
    await onSubmit(amount);
  };

  const invalidAmount = amount.trim() !== "" && dollarsToCents(amount) == null;
  const maxWithdrawCents = card.balanceCents;

  const quickOptions = React.useMemo(() => {
    const presets = QUICK_AMOUNTS.map((d) => d * 100);
    if (!isFund && maxWithdrawCents > 0) {
      const maxUnique = !presets.includes(maxWithdrawCents);
      return maxUnique ? [...presets, maxWithdrawCents] : presets;
    }
    return presets;
  }, [isFund, maxWithdrawCents]);

  const pickQuick = (cents: number) => {
    if (!isFund && cents > maxWithdrawCents) return;
    setAmount(centsToDollarsString(Math.min(cents, maxWithdrawCents || cents)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="border-b border-border bg-surface-elevated/40 px-6 pb-4 pt-6">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2">
                {isFund ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Plus className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ArrowDownToLine className="h-4 w-4" />
                  </span>
                )}
                {isFund ? "Add funds" : "Remove funds"}
              </DialogTitle>
              <DialogDescription>
                {cardTitle(card)} · •••• {card.last4}. Balance{" "}
                <span className="font-medium text-foreground">{formatBalance(card)}</span>.
                {isFund ? (
                  <> Pay with USDC.e on 0G mainnet (1:1 USD).</>
                ) : (
                  <> Sent to your connected wallet when treasury payout is configured.</>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex justify-center">
              <VirtualCreditCard card={card} compact className="pointer-events-none shadow-lg" />
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-2">
              <Label htmlFor={`card-${mode}-amount`}>Amount (USD)</Label>
              <Input
                id={`card-${mode}-amount`}
                type="text"
                inputMode="decimal"
                placeholder="e.g. 25.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                disabled={loading}
                className="text-base tabular-nums"
              />
              {invalidAmount ? (
                <p className="text-[11px] text-destructive">Enter a positive dollar amount.</p>
              ) : !isFund && maxWithdrawCents <= 0 ? (
                <p className="text-[11px] text-muted-foreground">No balance available to withdraw.</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {quickOptions.map((cents) => {
                const isMax = !isFund && cents === maxWithdrawCents;
                const overMax = !isFund && cents > maxWithdrawCents;
                const selected = dollarsToCents(amount) === cents;
                return (
                  <button
                    key={cents}
                    type="button"
                    disabled={loading || overMax}
                    onClick={() => pickQuick(cents)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-40",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface hover:bg-surface-elevated",
                    )}
                  >
                    {isMax ? "Max" : `$${cents / 100}`}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-surface-elevated/30 px-6 py-4 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isFund ? "default" : "outline"}
              loading={loading}
              disabled={
                loading ||
                dollarsToCents(amount) == null ||
                (!isFund && maxWithdrawCents <= 0)
              }
            >
              {isFund ? "Pay with USDC.e" : "Remove funds"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
