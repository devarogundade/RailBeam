import * as React from "react";
import type { StardormChatRichBlock } from "@railbeam/stardorm-api-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BEAM_MAINNET_CAIP2,
  BEAM_MAINNET_SWAP_ROUTER,
  isSwapNetworkBlocked,
} from "@/lib/beam-swap-config";

type SwapFormRich = Extract<StardormChatRichBlock, { type: "swap_checkout_form" }>;

const POOL_FEES = [500, 3000, 10000] as const;

export function SwapCheckoutFormCard({
  rich,
  disabled,
  onConfirmSwap,
}: {
  rich: SwapFormRich;
  disabled?: boolean;
  onConfirmSwap: (params: Record<string, unknown>) => void | Promise<void>;
}) {
  const networks = React.useMemo(
    () =>
      rich.networks?.length
        ? rich.networks
        : [{ id: BEAM_MAINNET_CAIP2, label: "0G Mainnet" }],
    [rich.networks],
  );

  const [tokenInAddr, setTokenInAddr] = React.useState(
    () => rich.supportedAssets[0]?.address ?? "",
  );
  const [tokenOutAddr, setTokenOutAddr] = React.useState(
    () => rich.supportedAssets[1]?.address ?? rich.supportedAssets[0]?.address ?? "",
  );
  const [networkId, setNetworkId] = React.useState(() => networks[0]?.id ?? BEAM_MAINNET_CAIP2);
  const [amountHuman, setAmountHuman] = React.useState("");
  const [minOutHuman, setMinOutHuman] = React.useState("");
  const [poolFee, setPoolFee] = React.useState(String(rich.defaultPoolFee ?? 3000));

  const tokenIn = rich.supportedAssets.find((a) => a.address === tokenInAddr);
  const tokenOut = rich.supportedAssets.find((a) => a.address === tokenOutAddr);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const net = networkId.trim();
    const blocked = isSwapNetworkBlocked(net);
    if (blocked) {
      toast.error("Network not supported", { description: blocked });
      return;
    }
    if (!tokenIn || !tokenOut) {
      toast.error("Pick supported tokens");
      return;
    }
    if (tokenIn.address.toLowerCase() === tokenOut.address.toLowerCase()) {
      toast.error("Token in and token out must differ");
      return;
    }
    const human = amountHuman.trim();
    if (!human) {
      toast.error("Enter an amount to swap");
      return;
    }
    let amountInWei: string;
    try {
      amountInWei = parseUnits(human, tokenIn.decimals).toString();
    } catch {
      toast.error("Invalid amount for token in");
      return;
    }
    let amountOutMinimumWei = "0";
    const minHuman = minOutHuman.trim();
    if (minHuman) {
      try {
        amountOutMinimumWei = parseUnits(minHuman, tokenOut.decimals).toString();
      } catch {
        toast.error("Invalid minimum amount out");
        return;
      }
    }
    const fee = Number(poolFee);
    if (!POOL_FEES.includes(fee as (typeof POOL_FEES)[number])) {
      toast.error("Pick a valid pool fee tier");
      return;
    }
    const deadlineUnix = Math.floor(Date.now() / 1000) + 20 * 60;
    void onConfirmSwap({
      network: net,
      tokenIn: tokenIn.address.trim().toLowerCase(),
      tokenInSymbol: tokenIn.symbol,
      tokenInDecimals: tokenIn.decimals,
      tokenOut: tokenOut.address.trim().toLowerCase(),
      tokenOutSymbol: tokenOut.symbol,
      tokenOutDecimals: tokenOut.decimals,
      amountInWei,
      amountOutMinimumWei,
      poolFee: fee,
      router: BEAM_MAINNET_SWAP_ROUTER,
      deadlineUnix,
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-3 overflow-hidden rounded-xl border border-border bg-surface-elevated p-3.5"
    >
      <SwapFormHeader rich={rich} />
      <TokenSelect
        label="Sell"
        assets={rich.supportedAssets}
        value={tokenInAddr}
        onChange={setTokenInAddr}
        disabled={disabled}
      />
      <TokenSelect
        label="Buy"
        assets={rich.supportedAssets}
        value={tokenOutAddr}
        onChange={setTokenOutAddr}
        disabled={disabled}
      />
      <div className="space-y-2">
        <Label htmlFor="swap-amount-in" className="text-xs">
          Amount in ({tokenIn?.symbol ?? "token"} units)
        </Label>
        <Input
          id="swap-amount-in"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 10"
          value={amountHuman}
          onChange={(e) => setAmountHuman(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="swap-min-out" className="text-xs">
          Minimum out ({tokenOut?.symbol ?? "token"}, optional)
        </Label>
        <Input
          id="swap-min-out"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0 = no floor"
          value={minOutHuman}
          onChange={(e) => setMinOutHuman(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Pool fee tier</Label>
        <Select value={poolFee} onValueChange={setPoolFee} disabled={disabled}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="500">0.05% (500)</SelectItem>
            <SelectItem value="3000">0.3% (3000)</SelectItem>
            <SelectItem value="10000">1% (10000)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Network</Label>
        <RadioGroup value={networkId} onValueChange={setNetworkId} className="grid gap-1.5">
          {networks.map((n) => (
            <label
              key={n.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 py-1 text-sm hover:bg-(--btn-secondary-bg)"
            >
              <RadioGroupItem value={n.id} id={`swap-net-${n.id}`} disabled={disabled} />
              <span>{n.label}</span>
              <span className="ml-auto truncate text-[11px] text-muted-foreground">{n.id}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <Button type="submit" size="sm" className="w-full font-semibold" loading={disabled} disabled={disabled}>
        {disabled ? "Confirming…" : "Confirm swap draft"}
      </Button>
    </form>
  );
}

function SwapFormHeader({ rich }: { rich: SwapFormRich }) {
  return (
    <div className="border-b border-border pb-2">
      <h3 className="text-sm font-semibold">{rich.title}</h3>
      {rich.intro ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rich.intro}</p>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Single-hop swap on 0G mainnet via the Beam router. You will approve token-in if needed,
          then sign <span className="font-mono">exactInputSingle</span>.
        </p>
      )}
    </div>
  );
}

function TokenSelect({
  label,
  assets,
  value,
  onChange,
  disabled,
}: {
  label: string;
  assets: SwapFormRich["supportedAssets"];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="grid gap-2">
        {assets.map((a) => (
          <label
            key={a.address}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-2.5 py-2 text-sm transition-colors",
              value === a.address
                ? "border-(--border-medium) bg-(--btn-item-active)"
                : "hover:bg-(--btn-secondary-bg)",
            )}
          >
            <RadioGroupItem value={a.address} id={`${label}-${a.address}`} disabled={disabled} />
            <img src={a.icon} alt="" className="h-8 w-8 rounded-full bg-pill object-cover" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {a.name} <span className="text-muted-foreground">({a.symbol})</span>
              </div>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
