import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildX402PaymentLinks } from "@/lib/x402-payment-links";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () =>
      toast.error("Could not copy", {
        description: "Clipboard permission denied or unavailable.",
      }),
  );
}

function LinkRow({
  label,
  description,
  url,
  onCopy,
}: {
  label: string;
  description: string;
  url: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <LinkRowHeader label={label} description={description} onCopy={onCopy} />
      <p className="mt-2 break-all font-mono text-xs text-foreground">{url}</p>
    </div>
  );
}

function LinkRowHeader({
  label,
  description,
  onCopy,
}: {
  label: string;
  description: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 px-2" onClick={onCopy}>
        <Copy className="h-3.5 w-3.5" />
        <span className="sr-only">Copy {label}</span>
      </Button>
    </div>
  );
}

/** Inline copy buttons for list rows (dashboard). */
export function X402PaymentLinkCopyButtons({
  paymentRequestId,
  payPath,
  apiBase,
  className,
}: {
  paymentRequestId: string;
  payPath?: string;
  apiBase?: string;
  className?: string;
}) {
  const resolvedApiBase = apiBase ?? getStardormApiBase() ?? undefined;
  const { humanCheckoutUrl, agentApiUrl } = buildX402PaymentLinks({
    paymentRequestId,
    payPath,
    apiBase: resolvedApiBase,
  });

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => copyText("Checkout link", humanCheckoutUrl)}
      >
        <Copy className="mr-1 h-3.5 w-3.5" />
        Copy checkout
      </Button>
      {agentApiUrl ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => copyText("x402 API link", agentApiUrl)}
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          Copy x402 API
        </Button>
      ) : null}
    </div>
  );
}

export function X402PaymentLinkActions({
  paymentRequestId,
  payPath,
  apiBase,
  showOpenCheckout = true,
  className,
}: {
  paymentRequestId: string;
  payPath?: string;
  apiBase?: string;
  showOpenCheckout?: boolean;
  className?: string;
}) {
  const resolvedApiBase = apiBase ?? getStardormApiBase() ?? undefined;
  const { humanCheckoutUrl, agentApiUrl } = buildX402PaymentLinks({
    paymentRequestId,
    payPath,
    apiBase: resolvedApiBase,
  });

  return (
    <div className={cn("space-y-3", className)}>
      <LinkRow
        label="Human checkout"
        description="Share with payers — opens the Beam wallet checkout page."
        url={humanCheckoutUrl}
        onCopy={() => copyText("Checkout link", humanCheckoutUrl)}
      />
      {agentApiUrl ? (
        <LinkRow
          label="Agent / x402 API"
          description="For agents and backends — GET returns payment requirements (x402Payload)."
          url={agentApiUrl}
          onCopy={() => copyText("x402 API link", agentApiUrl)}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          Set <code className="text-foreground">VITE_STARDORM_API_URL</code> to copy the x402 API link (
          <code className="text-foreground">GET /payments/:id</code>).
        </p>
      )}
      {showOpenCheckout ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => window.open(humanCheckoutUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Open checkout
          </Button>
        </div>
      ) : null}
    </div>
  );
}
