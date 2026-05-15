import * as React from "react";
import type { StardormChatRichBlock } from "@railbeam/stardorm-api-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import { useBeamEffectiveCaip2Network } from "@/lib/beam-network-context";
import { toast } from "sonner";
import { BeamCurrentNetworkNote } from "@/components/beam-current-network-note";

type OnRampFormRich = Extract<StardormChatRichBlock, { type: "on_ramp_checkout_form" }>;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export function OnRampCheckoutFormCard({
  rich,
  disabled,
  onCreateCheckout,
}: {
  rich: OnRampFormRich;
  disabled?: boolean;
  onCreateCheckout: (params: Record<string, unknown>) => void | Promise<void>;
}) {
  const { networkId } = useBeamEffectiveCaip2Network();
  const { address: connectedWallet } = useAccount();

  const [assetAddr, setAssetAddr] = React.useState(
    () => rich.supportedAssets[0]?.address ?? "",
  );
  const [recipient, setRecipient] = React.useState("");
  const [usdHuman, setUsdHuman] = React.useState("");

  React.useEffect(() => {
    if (
      connectedWallet &&
      ADDR_RE.test(connectedWallet.trim()) &&
      recipient.trim() === ""
    ) {
      setRecipient(connectedWallet.trim().toLowerCase());
    }
  }, [connectedWallet, recipient]);

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
    const rec = recipient.trim();
    if (!ADDR_RE.test(rec)) {
      toast.error("Recipient must be a 0x…40 address");
      return;
    }
    const usdRaw = usdHuman.trim();
    const usdNum = Number.parseFloat(usdRaw);
    if (!Number.isFinite(usdNum) || usdNum < 1) {
      toast.error("Enter USD to charge (minimum $1.00)");
      return;
    }
    const usdAmountCents = Math.round(usdNum * 100);
    if (!Number.isFinite(usdAmountCents) || usdAmountCents < 100) {
      toast.error("USD charge too small");
      return;
    }
    const params: Record<string, unknown> = {
      recipientWallet: rec.toLowerCase(),
      network: networkId,
      tokenAddress: selected.address.trim().toLowerCase(),
      tokenDecimals: selected.decimals,
      tokenSymbol: selected.symbol.trim(),
      usdAmountCents,
    };
    if (selected.usdValue != null) {
      params.usdValue = selected.usdValue;
    }
    void onCreateCheckout(params);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-3 overflow-hidden rounded-xl border border-border bg-surface-elevated p-3.5"
    >
      <div className="border-b border-border pb-2">
        <h3 className="text-sm font-semibold">{rich.title}</h3>
        {rich.intro ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rich.intro}</p>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pick a USD-pegged asset and the USD amount to charge on your card (Stripe). The same dollar value is credited on-chain (1:1). After payment settles, tokens are sent from the Beam on-ramp treasury.
          </p>
        )}
        <BeamCurrentNetworkNote className="mt-2" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Asset</Label>
        <RadioGroup value={assetAddr} onValueChange={setAssetAddr} className="grid gap-2">
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
              <RadioGroupItem value={a.address} id={`onramp-asset-${a.address}`} />
              <img src={a.icon} alt="" className="h-8 w-8 rounded-full bg-pill object-cover" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {a.name} <span className="text-muted-foreground">({a.symbol})</span>
                </div>
                {a.usdValue != null ? (
                  <div className="text-[11px] text-muted-foreground">
                    Spot hint ≈ ${a.usdValue.toFixed(4)} USD
                  </div>
                ) : null}
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onramp-usd" className="text-xs">
          Card charge (USD, minimum $1)
        </Label>
        <Input
          id="onramp-usd"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 25.00"
          value={usdHuman}
          onChange={(e) => setUsdHuman(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="onramp-recipient" className="text-xs">
          Recipient wallet (0x…)
        </Label>
        <Input
          id="onramp-recipient"
          spellCheck={false}
          autoComplete="off"
          placeholder="0x…"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          disabled={disabled}
        />
      </div>

      <Button type="submit" size="sm" className="w-full font-semibold" loading={disabled} disabled={disabled}>
        {disabled ? "Creating…" : "Create Stripe checkout"}
      </Button>
    </form>
  );
}
