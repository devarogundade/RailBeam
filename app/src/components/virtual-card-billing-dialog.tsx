import { Info } from "lucide-react";
import type { CreditCardPublic } from "@railbeam/stardorm-api-contract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VirtualCreditCard } from "@/components/virtual-credit-card";
import { cn } from "@/lib/utils";

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  if (!value.trim()) return null;
  return (
    <div className={cn("grid gap-0.5", className)}>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function formatStatus(status: CreditCardPublic["status"]): string {
  return status === "frozen" ? "Frozen" : "Active";
}

export function VirtualCardBillingDialog({
  open,
  onOpenChange,
  card,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCardPublic;
}) {
  const holder = `${card.firstName} ${card.lastName}`.trim();
  const cityLine = [card.city, card.region, card.postalCode].filter(Boolean).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b border-border bg-surface-elevated/40 px-6 pb-4 pt-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Info className="h-4 w-4" />
              </span>
              Card details
            </DialogTitle>
            <DialogDescription>
              Billing address and card metadata for checkout. Use the eye icon on the card to reveal PAN,
              expiry, and CVV.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex justify-center">
            <VirtualCreditCard card={card} compact className="pointer-events-none shadow-lg" />
          </div>
        </div>

        <dl className="space-y-5 px-6 py-5">
          <section className="space-y-3">
            <p className="text-xs font-semibold text-foreground">Card</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Cardholder" value={holder} />
              {card.cardLabel?.trim() ? (
                <DetailRow label="Label" value={card.cardLabel.trim()} />
              ) : null}
              <DetailRow label="Network" value={card.networkBrand} />
              <DetailRow label="Last four" value={`•••• ${card.last4}`} />
              <DetailRow label="Status" value={formatStatus(card.status)} />
              <DetailRow
                label="Balance"
                value={`${card.currency} ${(card.balanceCents / 100).toFixed(2)}`}
              />
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <p className="text-xs font-semibold text-foreground">Billing address</p>
            <div className="grid gap-3">
              <DetailRow label="Street" value={card.line1} />
              {card.line2?.trim() ? <DetailRow label="Apt / suite" value={card.line2} /> : null}
              <DetailRow label="City" value={cityLine} />
              <DetailRow label="Country" value={card.countryCode.toUpperCase()} />
            </div>
          </section>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
