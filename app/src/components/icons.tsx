import coin0g from "@/assets/0g.png";
import { resolvePaymentTokenIcon } from "@/lib/payment-token-icon";
import { cn } from "@/lib/utils";

/** 0G token mark — uses the official coin artwork everywhere balances and prices appear. */
export function CoinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <img
      src={coin0g}
      alt=""
      className={cn("aspect-square shrink-0 rounded-full object-cover", className)}
      aria-hidden
    />
  );
}

/** Checkout / payment asset mark — resolves icon from native, symbol, or contract address. */
export function PaymentTokenIcon({
  asset,
  className = "h-4 w-4",
}: {
  asset: string;
  className?: string;
}) {
  const src = resolvePaymentTokenIcon(asset);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className={cn("aspect-square shrink-0 rounded-full object-cover", className)}
      aria-hidden
    />
  );
}

export function BeamLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <div
      className={`${className} grid place-items-center rounded-md bg-pill text-pill-foreground`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M5 4h9a4 4 0 0 1 0 8H8m0 0h7a4 4 0 0 1 0 8H5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
