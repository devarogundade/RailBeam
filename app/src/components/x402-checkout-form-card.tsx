import * as React from "react";
import type { StardormChatRichBlock } from "@railbeam/stardorm-api-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { parseUnits } from "viem";
import { cn } from "@/lib/utils";
import { useBeamEffectiveCaip2Network } from "@/lib/beam-network-context";
import { toast } from "sonner";
import { BeamCurrentNetworkNote } from "@/components/beam-current-network-note";

type X402FormRich = Extract<StardormChatRichBlock, { type: "x402_checkout_form" }>;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export function X402CheckoutFormCard({
  rich,
  disabled,
  onCreateLink,
}: {
  rich: X402FormRich;
  disabled?: boolean;
  onCreateLink: (params: Record<string, unknown>) => void | Promise<void>;
}) {
  const { networkId } = useBeamEffectiveCaip2Network();

  const [assetAddr, setAssetAddr] = React.useState(
    () => rich.supportedAssets[0]?.address ?? "",
  );
  const [amountHuman, setAmountHuman] = React.useState("");
  const [payTo, setPayTo] = React.useState("");
  const [title, setTitle] = React.useState("");

  React.useEffect(() => {
    if (!rich.supportedAssets.some((a) => a.address === assetAddr)) {
      setAssetAddr(rich.supportedAssets[0]?.address ?? "");
    }
  }, [rich.supportedAssets, assetAddr]);

  const selected = rich.supportedAssets.find((a) => a.address === assetAddr);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error("Pick a token");
      return;
    }
    const pt = payTo.trim();
    if (!ADDR_RE.test(pt)) {
      toast.error("Recipient must be a 0x…40 address");
      return;
    }
    const human = amountHuman.trim();
    if (!human) {
      toast.error("Enter an amount");
      return;
    }
    let amountWei: string;
    try {
      amountWei = parseUnits(human, selected.decimals).toString();
    } catch {
      toast.error("Invalid amount for this token’s decimals");
      return;
    }
    const id = crypto.randomUUID();
    const params: Record<string, unknown> = {
      id,
      amount: amountWei,
      currency: selected.address.trim().toLowerCase(),
      network: networkId,
      payTo: pt.toLowerCase(),
      decimals: selected.decimals,
    };
    const t = title.trim();
    if (t) params.title = t;
    const ru = rich.resourceUrl?.trim();
    if (ru) params.resourceUrl = ru;
    void onCreateLink(params);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-3 overflow-hidden rounded-xl border border-border bg-surface-elevated p-3.5"
    >
      <div className="border-b border-border pb-2">
        <h3 className="text-sm font-semibold">{rich.title}</h3>
        {rich.intro ? (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{rich.intro}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Enter the amount in token units and paste the wallet that should receive the payment.
            Then create the link to share with your payer.
          </p>
        )}
        <BeamCurrentNetworkNote className="mt-2" />
        {rich.resourceUrl ? (
          <p className="mt-2 text-xs">
            <span className="text-muted-foreground">Resource: </span>
            <a
              href={rich.resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline break-all"
            >
              {rich.resourceUrl}
            </a>
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Asset</Label>
        <RadioGroup
          value={assetAddr}
          onValueChange={setAssetAddr}
          className="grid gap-2"
        >
          {rich.supportedAssets.map((a) => (
            <label
              key={a.address}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-2.5 py-2 text-sm transition-colors",
                assetAddr === a.address
                  ? "border-(--border-medium) bg-(--btn-item-active)"
                  : "hover:bg-(--btn-secondary-bg)",
              )}
            >
              <RadioGroupItem value={a.address} id={`asset-${a.address}`} />
              <img
                src={a.icon}
                alt=""
                className="h-8 w-8 rounded-full bg-pill object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {a.name}{" "}
                  <span className="text-muted-foreground">({a.symbol})</span>
                </div>
                {a.usdValue != null && (
                  <div className="text-[11px] text-muted-foreground">
                    ≈ ${a.usdValue.toFixed(4)} USD
                  </div>
                )}
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="x402-amt" className="text-xs">
          Amount ({selected?.symbol ?? "token"} units, not wei)
        </Label>
        <Input
          id="x402-amt"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 0.25"
          value={amountHuman}
          onChange={(e) => setAmountHuman(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="x402-payto" className="text-xs">
          Pay to (0x…)
        </Label>
        <Input
          id="x402-payto"
          spellCheck={false}
          autoComplete="off"
          placeholder="0x…"
          value={payTo}
          onChange={(e) => setPayTo(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="x402-title" className="text-xs">
          Title (optional)
        </Label>
        <Input
          id="x402-title"
          placeholder="Payment for services"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
        />
      </div>

      <Button type="submit" size="sm" className="w-full font-semibold" loading={disabled} disabled={disabled}>
        {disabled ? "Creating…" : "Create payment link"}
      </Button>
    </form>
  );
}
