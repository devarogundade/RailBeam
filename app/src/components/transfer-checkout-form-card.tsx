import * as React from "react";
import type { StardormChatRichBlock } from "@railbeam/stardorm-api-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { useBeamEffectiveCaip2Network } from "@/lib/beam-network-context";
import { BeamCurrentNetworkNote } from "@/components/beam-current-network-note";

type TransferFormRich = Extract<StardormChatRichBlock, { type: "transfer_checkout_form" }>;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export function TransferCheckoutFormCard({
  rich,
  disabled,
  onConfirmTransfer,
}: {
  rich: TransferFormRich;
  disabled?: boolean;
  onConfirmTransfer: (params: Record<string, unknown>) => void | Promise<void>;
}) {
  const { networkId } = useBeamEffectiveCaip2Network();

  const [assetAddr, setAssetAddr] = React.useState(
    () => rich.supportedAssets[0]?.address ?? "",
  );
  const [recipient, setRecipient] = React.useState(() => rich.defaultTo ?? "");
  const [amountHuman, setAmountHuman] = React.useState("");

  React.useEffect(() => {
    if (!rich.supportedAssets.some((a) => a.address === assetAddr)) {
      setAssetAddr(rich.supportedAssets[0]?.address ?? "");
    }
  }, [rich.supportedAssets, assetAddr]);

  React.useEffect(() => {
    if (rich.defaultTo && ADDR_RE.test(rich.defaultTo)) {
      setRecipient(rich.defaultTo);
    }
  }, [rich.defaultTo]);

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
    const human = amountHuman.trim();
    if (!human) {
      toast.error("Enter an amount to send");
      return;
    }
    let amountWei: string;
    try {
      amountWei = parseUnits(human, selected.decimals).toString();
    } catch {
      toast.error("Invalid amount for this token’s decimals");
      return;
    }
    void onConfirmTransfer({
      network: networkId,
      token: selected.address.trim().toLowerCase(),
      tokenDecimals: selected.decimals,
      tokenSymbol: selected.symbol.trim(),
      to: rec.toLowerCase(),
      amountWei,
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-3 overflow-hidden rounded-xl border border-border bg-surface-elevated p-3.5"
    >
      <TransferFormHeader rich={rich} />
      <div className="space-y-1.5">
        <Label className="text-xs">Token</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={assetAddr}
          disabled={disabled}
          onChange={(e) => setAssetAddr(e.target.value)}
        >
          {rich.supportedAssets.map((a) => (
            <option key={a.address} value={a.address}>
              {a.symbol} · {a.address.slice(0, 6)}…{a.address.slice(-4)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="transfer-to" className="text-xs">
          Recipient
        </Label>
        <Input
          id="transfer-to"
          placeholder="0x…"
          value={recipient}
          disabled={disabled}
          onChange={(e) => setRecipient(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="transfer-amount" className="text-xs">
          Amount{selected ? ` (${selected.symbol})` : ""}
        </Label>
        <Input
          id="transfer-amount"
          inputMode="decimal"
          placeholder="0.01"
          value={amountHuman}
          disabled={disabled}
          onChange={(e) => setAmountHuman(e.target.value)}
        />
      </div>
      <BeamCurrentNetworkNote />
      <Button type="submit" size="sm" className="w-full" loading={disabled} disabled={disabled}>
        Confirm transfer draft
      </Button>
    </form>
  );
}

function TransferFormHeader({ rich }: { rich: TransferFormRich }) {
  return (
    <div className="border-b border-border pb-2">
      <h3 className="text-sm font-semibold">{rich.title}</h3>
      {rich.intro ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rich.intro}</p>
      ) : null}
    </div>
  );
}
