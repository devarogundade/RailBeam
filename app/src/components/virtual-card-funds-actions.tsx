import type { ReactNode } from "react";
import { ArrowDownToLine, ArrowUpToLine, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionTileProps = {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
};

function ActionTile({
  title,
  description,
  icon,
  onClick,
  disabled,
  loading,
  variant = "secondary",
  className,
}: ActionTileProps) {
  const primary = variant === "primary";
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "group flex min-w-0 flex-1 items-start gap-3 rounded-xl border p-3 text-left transition-colors",
        className,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        primary
          ? "border-primary/25 bg-primary/5 hover:border-primary/40 hover:bg-primary/10"
          : "border-border bg-surface hover:border-border/80 hover:bg-surface-elevated/60",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          primary ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground",
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

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
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <ActionTile
        variant="primary"
        title="Add funds"
        description="Pay with USDC.e on 0G · 1:1 USD"
        icon={<ArrowUpToLine className="h-4 w-4" />}
        onClick={onAddFunds}
        disabled={withdrawing}
        loading={funding}
      />
      <ActionTile
        title="Remove funds"
        description="Withdraw balance to your wallet"
        icon={<ArrowDownToLine className="h-4 w-4" />}
        onClick={onRemoveFunds}
        disabled={funding}
        loading={withdrawing}
      />
      {onMoreInfo ? (
        <ActionTile
          title="More info"
          description="Billing address and card details"
          icon={<Info className="h-4 w-4" />}
          onClick={onMoreInfo}
          disabled={funding || withdrawing}
          className="sm:col-span-2"
        />
      ) : null}
    </div>
  );
}
