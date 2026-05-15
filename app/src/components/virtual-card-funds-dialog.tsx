import * as React from "react";
import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";
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

export type VirtualCardFundsMode = "fund" | "withdraw";

function dollarsToCents(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return cents > 0 ? cents : null;
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
  withdrawDisabled,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: VirtualCardFundsMode;
  card: CreditCardPublic;
  loading: boolean;
  withdrawDisabled?: boolean;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isFund ? (
                <ArrowUpToLine className="h-4 w-4 text-primary" />
              ) : (
                <ArrowDownToLine className="h-4 w-4 text-primary" />
              )}
              {isFund ? "Add funds" : "Remove funds"}
            </DialogTitle>
            <DialogDescription>
              {cardTitle(card)} · •••• {card.last4}. Current balance{" "}
              <span className="font-medium text-foreground">{formatBalance(card)}</span>.
              {isFund ? (
                <> Pay with USDC.e on 0G mainnet (1:1 USD).</>
              ) : withdrawDisabled ? (
                <>
                  {" "}
                  Withdrawing card balance is disabled on 0G mainnet. Switch to testnet to
                  withdraw.
                </>
              ) : (
                <> Funds return to your connected wallet when configured.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor={`card-${mode}-amount`}>Amount (USD)</Label>
            <Input
              id={`card-${mode}-amount`}
              type="text"
              inputMode="decimal"
              placeholder="e.g. 25.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              disabled={loading || (!isFund && withdrawDisabled)}
            />
            {invalidAmount ? (
              <p className="text-[11px] text-destructive">Enter a positive dollar amount.</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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
                (!isFund && withdrawDisabled)
              }
            >
              {isFund ? "Add funds" : "Remove funds"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
