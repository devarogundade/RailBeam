import * as React from "react";
import { Eye, EyeOff, Loader2, Snowflake } from "lucide-react";
import type {
  CreditCardPublic,
  CreditCardSensitiveDetails,
} from "@railbeam/stardorm-api-contract";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function formatPanGroups(pan: string): string {
  return pan.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function padExpiryMonth(n: number): string {
  return String(n).padStart(2, "0");
}

function maskedPan(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}

type CardNetworkTheme = {
  gradient: string;
  accent: string;
  logo: React.ReactNode;
};

function NetworkLogo({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  if (b.includes("visa")) {
    return (
      <span className="text-[1.35rem] font-bold italic tracking-tight text-white/95">VISA</span>
    );
  }
  if (b.includes("master")) {
    return (
      <div className="flex items-center" aria-hidden>
        <span className="h-7 w-7 rounded-full bg-[#eb001b] opacity-95" />
        <span className="-ml-3 h-7 w-7 rounded-full bg-[#f79e1b] opacity-95" />
      </div>
    );
  }
  if (b.includes("amex") || b.includes("american")) {
    return (
      <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white/95">
        AMEX
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
      {brand}
    </span>
  );
}

function themeForBrand(networkBrand: string): CardNetworkTheme {
  const b = networkBrand.toLowerCase();
  if (b.includes("visa")) {
    return {
      gradient:
        "from-[#0d1f4a] via-[#143d8c] to-[#1a5fbf]",
      accent: "bg-[#f7b600]/25",
      logo: <NetworkLogo brand="visa" />,
    };
  }
  if (b.includes("master")) {
    return {
      gradient: "from-[#1a1a1f] via-[#2d2d35] to-[#141418]",
      accent: "bg-[#eb001b]/10",
      logo: <NetworkLogo brand="mastercard" />,
    };
  }
  if (b.includes("amex") || b.includes("american")) {
    return {
      gradient: "from-[#0f3d4a] via-[#0d5c6e] to-[#127a8f]",
      accent: "bg-white/10",
      logo: <NetworkLogo brand="amex" />,
    };
  }
  return {
    gradient: "from-[#1c1917] via-[#292524] to-[#1a1a1a]",
    accent: "bg-primary/20",
    logo: <NetworkLogo brand={networkBrand} />,
  };
}

function CardChip() {
  return (
    <div
      className="relative h-9 w-12 overflow-hidden rounded-md border border-white/20 bg-linear-to-br from-[#d4af37] via-[#f0e6a8] to-[#b8962e] shadow-sm"
      aria-hidden
    >
      <div className="absolute inset-0 grid grid-cols-2 gap-px p-1 opacity-40">
        <div className="rounded-sm border border-[#8a7020]/50" />
        <div className="rounded-sm border border-[#8a7020]/50" />
      </div>
    </div>
  );
}

function ContactlessMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-white/55"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M8.5 12.5a4 4 0 0 1 5.5 0" strokeLinecap="round" />
      <path d="M6 10a7.5 7.5 0 0 1 10 0" strokeLinecap="round" />
      <path d="M3.5 7.5a11 11 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}

export type VirtualCreditCardProps = {
  card: CreditCardPublic;
  className?: string;
  revealed?: boolean;
  revealLoading?: boolean;
  sensitive?: CreditCardSensitiveDetails | null;
  onToggleReveal?: () => void;
  compact?: boolean;
};

export function VirtualCreditCard({
  card,
  className,
  revealed = false,
  revealLoading = false,
  sensitive,
  onToggleReveal,
  compact = false,
}: VirtualCreditCardProps) {
  const theme = themeForBrand(card.networkBrand);
  const holder = `${card.firstName} ${card.lastName}`.trim().toUpperCase();
  const balance = `${card.currency} ${(card.balanceCents / 100).toFixed(2)}`;
  const label = card.cardLabel?.trim() || "Virtual card";
  const frozen = card.status === "frozen";

  const panDisplay =
    revealed && sensitive
      ? formatPanGroups(sensitive.pan)
      : maskedPan(card.last4);

  const expiryDisplay =
    revealed && sensitive
      ? `${padExpiryMonth(sensitive.expiryMonth)}/${String(sensitive.expiryYear).slice(-2)}`
      : "••/••";

  const cvvDisplay = revealed && sensitive ? sensitive.cvv : "•••";

  return (
    <div
      className={cn(
        "relative w-full select-none",
        compact ? "max-w-[320px]" : "max-w-[400px]",
        className,
      )}
    >
      <div
        className={cn(
          "relative aspect-[1.586/1] overflow-hidden rounded-2xl border border-white/10 shadow-xl",
          "bg-linear-to-br",
          theme.gradient,
          frozen && "opacity-75 saturate-50",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-2xl",
            theme.accent,
          )}
        />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-36 w-36 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
                {label}
              </p>
              <p className="mt-0.5 text-xs font-medium text-white/80">Beam · Virtual</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onToggleReveal ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full bg-black/20 text-white hover:bg-black/30 hover:text-white"
                  disabled={revealLoading}
                  onClick={onToggleReveal}
                  aria-label={revealed ? "Hide card details" : "Reveal card details"}
                >
                  {revealLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : revealed ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              ) : null}
              <div className="pt-0.5">{theme.logo}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CardChip />
            <ContactlessMark />
          </div>

          <div>
            <p
              className={cn(
                "font-mono tracking-[0.12em] text-white",
                compact ? "text-base sm:text-lg" : "text-lg sm:text-xl",
                !revealed && "text-white/90",
              )}
            >
              {panDisplay}
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-widest text-white/45">
                  Cardholder
                </p>
                <p
                  className={cn(
                    "truncate font-medium tracking-wide text-white/95",
                    compact ? "text-xs" : "text-sm",
                  )}
                >
                  {holder || "—"}
                </p>
              </div>
              <div className="flex shrink-0 gap-5">
                <div>
                  <p className="text-[9px] font-medium uppercase tracking-widest text-white/45">
                    Expires
                  </p>
                  <p className="font-mono text-sm text-white/95">{expiryDisplay}</p>
                </div>
                <div>
                  <p className="text-[9px] font-medium uppercase tracking-widest text-white/45">
                    CVV
                  </p>
                  <p className="font-mono text-sm text-white/95">{cvvDisplay}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 border-t border-white/10 pt-3">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-widest text-white/45">
                Available
              </p>
              <p className={cn("font-semibold tabular-nums text-white", compact ? "text-sm" : "text-base")}>
                {balance}
              </p>
            </div>
            <p className="text-[10px] text-white/40">Debit · {card.currency}</p>
          </div>
        </div>

        {frozen ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              <Snowflake className="h-3.5 w-3.5" />
              Frozen
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function VirtualCreditCardSkeleton({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "aspect-[1.586/1] w-full animate-pulse rounded-2xl bg-muted/60",
        compact ? "max-w-[320px]" : "max-w-[400px]",
        className,
      )}
      aria-hidden
    />
  );
}
