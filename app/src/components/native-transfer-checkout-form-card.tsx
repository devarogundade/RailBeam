import * as React from "react";
import type { StardormChatRichBlock } from "@railbeam/stardorm-api-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { useBeamEffectiveCaip2Network } from "@/lib/beam-network-context";
import { BeamCurrentNetworkNote } from "@/components/beam-current-network-note";

type NativeFormRich = Extract<StardormChatRichBlock, { type: "native_transfer_checkout_form" }>;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

const NATIVE_DECIMALS = 18;

export function NativeTransferCheckoutFormCard({
  rich,
  disabled,
  onConfirmNativeTransfer,
}: {
  rich: NativeFormRich;
  disabled?: boolean;
  onConfirmNativeTransfer: (params: Record<string, unknown>) => void | Promise<void>;
}) {
  const { networkId: hookCaip2 } = useBeamEffectiveCaip2Network();
  const netOpts = rich.networks?.length ? rich.networks : [{ id: hookCaip2, label: hookCaip2 }];

  const [network, setNetwork] = React.useState(() => {
    if (rich.networks?.some((n) => n.id === hookCaip2)) return hookCaip2;
    return netOpts[0]?.id ?? hookCaip2;
  });
  const [recipient, setRecipient] = React.useState(() => rich.defaultTo ?? "");
  const [amountHuman, setAmountHuman] = React.useState("");

  React.useEffect(() => {
    if (rich.defaultTo && ADDR_RE.test(rich.defaultTo)) {
      setRecipient(rich.defaultTo);
    }
  }, [rich.defaultTo]);

  React.useEffect(() => {
    if (!netOpts.some((n) => n.id === network)) {
      setNetwork(netOpts[0]?.id ?? hookCaip2);
    }
  }, [netOpts, network, hookCaip2]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rec = recipient.trim();
    if (!ADDR_RE.test(rec)) {
      toast.error("Recipient must be a 0x…40 address");
      return;
    }
    const human = amountHuman.trim();
    if (!human) {
      toast.error("Enter an amount");
      return;
    }
    let valueWei: string;
    try {
      valueWei = parseUnits(human, NATIVE_DECIMALS).toString();
    } catch {
      toast.error("Invalid amount");
      return;
    }
    if (!/^[1-9]\d*$/.test(valueWei)) {
      toast.error("Amount must be greater than zero");
      return;
    }
    void onConfirmNativeTransfer({
      network,
      to: rec.toLowerCase(),
      valueWei,
    });
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
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Network</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={network}
          disabled={disabled}
          onChange={(e) => setNetwork(e.target.value)}
        >
          {netOpts.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="native-to" className="text-xs">
          Recipient
        </Label>
        <Input
          id="native-to"
          placeholder="0x…"
          value={recipient}
          disabled={disabled}
          onChange={(e) => setRecipient(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="native-amount" className="text-xs">
          Amount (native token, decimal)
        </Label>
        <Input
          id="native-amount"
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
