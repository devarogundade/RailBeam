import { ArrowDownToLine, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VirtualCardFundsActions({
  onAddFunds,
  onRemoveFunds,
  onMoreInfo,
  funding,
  withdrawing,
  className,
}: {
  onAddFunds: () => void;
  onRemoveFunds: () => void;
  onMoreInfo?: () => void;
  funding?: boolean;
  withdrawing?: boolean;
  className?: string;
}) {
  const busy = funding || withdrawing;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <Button
        type="button"
        className="h-10 w-full"
        loading={funding}
        disabled={busy && !funding}
        onClick={onAddFunds}
      >
        <Plus className="h-4 w-4" />
        Add funds
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          loading={withdrawing}
          disabled={busy && !withdrawing}
          onClick={onRemoveFunds}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Withdraw
        </Button>
        {onMoreInfo ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full"
            disabled={busy}
            onClick={onMoreInfo}
          >
            <Info className="h-4 w-4" />
            Details
          </Button>
        ) : null}
      </div>
      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        USDC.e on 0G mainnet · 1:1 USD
      </p>
    </div>
  );
}
