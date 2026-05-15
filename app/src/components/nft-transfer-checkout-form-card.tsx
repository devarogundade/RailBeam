import * as React from "react";
import type { StardormChatRichBlock } from "@railbeam/stardorm-api-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useBeamEffectiveCaip2Network } from "@/lib/beam-network-context";
import { BeamCurrentNetworkNote } from "@/components/beam-current-network-note";

type NftFormRich = Extract<StardormChatRichBlock, { type: "nft_transfer_checkout_form" }>;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export function NftTransferCheckoutFormCard({
  rich,
  disabled,
  onConfirmNftTransfer,
}: {
  rich: NftFormRich;
  disabled?: boolean;
  onConfirmNftTransfer: (params: Record<string, unknown>) => void | Promise<void>;
}) {
  const { networkId: hookCaip2 } = useBeamEffectiveCaip2Network();
  const netOpts = rich.networks?.length ? rich.networks : [{ id: hookCaip2, label: hookCaip2 }];

  const [network, setNetwork] = React.useState(() => {
    if (rich.networks?.some((n) => n.id === hookCaip2)) return hookCaip2;
    return netOpts[0]?.id ?? hookCaip2;
  });
  const [contract, setContract] = React.useState(() => rich.defaultContract ?? "");
  const [standard, setStandard] = React.useState<"erc721" | "erc1155">("erc721");
  const [recipient, setRecipient] = React.useState(() => rich.defaultTo ?? "");
  const [tokenId, setTokenId] = React.useState("");
  const [amount, setAmount] = React.useState("");

  React.useEffect(() => {
    if (rich.defaultTo && ADDR_RE.test(rich.defaultTo)) {
      setRecipient(rich.defaultTo);
    }
  }, [rich.defaultTo]);

  React.useEffect(() => {
    if (rich.defaultContract && ADDR_RE.test(rich.defaultContract)) {
      setContract(rich.defaultContract);
    }
  }, [rich.defaultContract]);

  React.useEffect(() => {
    if (!netOpts.some((n) => n.id === network)) {
      setNetwork(netOpts[0]?.id ?? hookCaip2);
    }
  }, [netOpts, network, hookCaip2]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const coll = contract.trim();
    if (!ADDR_RE.test(coll)) {
      toast.error("Collection must be a 0x…40 contract address");
      return;
    }
    const rec = recipient.trim();
    if (!ADDR_RE.test(rec)) {
      toast.error("Recipient must be a 0x…40 address");
      return;
    }
    const tid = tokenId.trim();
    if (!/^\d+$/.test(tid)) {
      toast.error("Token id must be a non-negative integer");
      return;
    }
    if (standard === "erc1155") {
      const amt = amount.trim();
      if (!/^[1-9]\d*$/.test(amt)) {
        toast.error("ERC-1155 amount must be a positive integer");
        return;
      }
      void onConfirmNftTransfer({
        network,
        contract: coll.toLowerCase(),
        standard: "erc1155",
        to: rec.toLowerCase(),
        tokenId: tid,
        amount: amt,
      });
      return;
    }
    void onConfirmNftTransfer({
      network,
      contract: coll.toLowerCase(),
      standard: "erc721",
      to: rec.toLowerCase(),
      tokenId: tid,
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
        <Label htmlFor="nft-contract" className="text-xs">
          NFT collection contract
        </Label>
        <Input
          id="nft-contract"
          placeholder="0x…"
          value={contract}
          disabled={disabled}
          onChange={(e) => setContract(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Standard</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={standard}
          disabled={disabled}
          onChange={(e) => setStandard(e.target.value === "erc1155" ? "erc1155" : "erc721")}
        >
          <option value="erc721">ERC-721</option>
          <option value="erc1155">ERC-1155</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nft-to" className="text-xs">
          Recipient
        </Label>
        <Input
          id="nft-to"
          placeholder="0x…"
          value={recipient}
          disabled={disabled}
          onChange={(e) => setRecipient(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nft-token-id" className="text-xs">
          Token ID
        </Label>
        <Input
          id="nft-token-id"
          inputMode="numeric"
          placeholder="0"
          value={tokenId}
          disabled={disabled}
          onChange={(e) => setTokenId(e.target.value)}
        />
      </div>
      {standard === "erc1155" ? (
        <div className="space-y-1.5">
          <Label htmlFor="nft-amount" className="text-xs">
            Amount (ERC-1155)
          </Label>
          <Input
            id="nft-amount"
            inputMode="numeric"
            placeholder="1"
            value={amount}
            disabled={disabled}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      ) : null}
      <BeamCurrentNetworkNote />
      <Button type="submit" size="sm" className="w-full" loading={disabled} disabled={disabled}>
        Confirm transfer draft
      </Button>
    </form>
  );
}
