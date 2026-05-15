import * as React from "react";
import { useAccount } from "wagmi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { Copy, ExternalLink, Link2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import type { StardormChatAttachment, X402SupportedAsset } from "@railbeam/stardorm-api-contract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { stardormInvokeHandler, uploadStardormUserFile } from "@/lib/stardorm-api";
import { invalidateBeamHttpDashboardLists } from "@/lib/query-invalidation";
import {
  X402_CHECKOUT_NETWORKS,
  x402CheckoutSupportedAssets,
} from "@/lib/x402-checkout-config";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

type CreatedCheckout = {
  paymentRequestId: string;
  payPath: string;
};

function parseCreatedCheckout(data: Record<string, unknown> | undefined): CreatedCheckout | null {
  if (!data) return null;
  const paymentRequestId =
    typeof data.paymentRequestId === "string" ? data.paymentRequestId : null;
  const payPath = typeof data.payPath === "string" ? data.payPath : null;
  if (!paymentRequestId || !payPath) return null;
  return { paymentRequestId, payPath };
}

export function CreatePaymentLinkDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const supportedAssets = React.useMemo(() => x402CheckoutSupportedAssets(), []);

  const [resourceId, setResourceId] = React.useState<string>(() => crypto.randomUUID());
  const [assetAddr, setAssetAddr] = React.useState<string>(
    () => supportedAssets[0]?.address ?? "native",
  );
  const [networkId, setNetworkId] = React.useState<string>(
    () => X402_CHECKOUT_NETWORKS[0]?.id ?? "",
  );
  const [amountHuman, setAmountHuman] = React.useState("");
  const [payTo, setPayTo] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [resourceUrl, setResourceUrl] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const [optionalOpen, setOptionalOpen] = React.useState(false);
  const [created, setCreated] = React.useState<CreatedCheckout | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selected = supportedAssets.find((a) => a.address === assetAddr);

  const resetForm = React.useCallback(() => {
    setResourceId(crypto.randomUUID());
    setAssetAddr(supportedAssets[0]?.address ?? "native");
    setNetworkId(X402_CHECKOUT_NETWORKS[0]?.id ?? "");
    setAmountHuman("");
    setPayTo(address?.trim() ?? "");
    setTitle("");
    setDescription("");
    setResourceUrl("");
    setExpiresAt("");
    setAttachmentFile(null);
    setOptionalOpen(false);
    setCreated(null);
  }, [address, supportedAssets]);

  React.useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  React.useEffect(() => {
    if (open && address && !payTo.trim()) {
      setPayTo(address);
    }
  }, [open, address, payTo]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Pick a token");
      const pt = payTo.trim();
      if (!ADDR_RE.test(pt)) throw new Error("Recipient must be a 0x…40 address");
      const human = amountHuman.trim();
      if (!human) throw new Error("Enter an amount");
      let amountWei: string;
      try {
        amountWei = parseUnits(human, selected.decimals).toString();
      } catch {
        throw new Error("Invalid amount for this token’s decimals");
      }
      if (!networkId.trim()) throw new Error("Pick a network");
      const rid = resourceId.trim();
      if (!rid) throw new Error("Resource id is required");

      let attachment: StardormChatAttachment | undefined;
      if (attachmentFile) {
        const uploaded = await uploadStardormUserFile(attachmentFile);
        if ("error" in uploaded) throw new Error(uploaded.error);
        attachment = {
          id: crypto.randomUUID(),
          name: uploaded.originalName,
          mimeType: uploaded.mimeType,
          hash: uploaded.rootHash,
          size: String(uploaded.size),
        };
      }

      const currency =
        selected.address === "native" ? "native" : selected.address.trim().toLowerCase();

      const params: Record<string, unknown> = {
        id: rid,
        amount: amountWei,
        currency,
        network: networkId.trim(),
        payTo: pt.toLowerCase(),
        decimals: selected.decimals,
      };
      const t = title.trim();
      if (t) params.title = t;
      const d = description.trim();
      if (d) params.description = d;
      const ru = resourceUrl.trim();
      if (ru) params.resourceUrl = ru;
      if (expiresAt.trim()) {
        const exp = new Date(expiresAt);
        if (Number.isNaN(exp.getTime())) throw new Error("Invalid expiry date");
        params.expiresAt = exp.toISOString();
      }
      if (attachment) params.attachment = attachment;

      const res = await stardormInvokeHandler("create_x402_payment", params);
      if ("error" in res) throw new Error(res.error);
      const checkout = parseCreatedCheckout(res.data);
      if (!checkout) throw new Error("Checkout created but link metadata was missing");
      return checkout;
    },
    onSuccess: (checkout) => {
      setCreated(checkout);
      invalidateBeamHttpDashboardLists(queryClient);
      toast.success("Payment link created");
    },
    onError: (e) => {
      toast.error("Could not create payment link", {
        description: e instanceof Error ? e.message : String(e),
      });
    },
  });

  const pending = createMutation.isPending;
  const payHref =
    created && typeof window !== "undefined"
      ? `${window.location.origin}${created.payPath}`
      : "";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (created) return;
    createMutation.mutate();
  };

  const onPickAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("File too large", { description: "Maximum size is 5 MB." });
      return;
    }
    setAttachmentFile(file);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Create payment link
          </DialogTitle>
          <DialogDescription>
            {created
              ? "Share this x402 checkout URL with your payer."
              : "Configure an on-chain x402 checkout. Amounts are stored in smallest token units (wei)."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <CheckoutSuccessBody
            payHref={payHref}
            paymentRequestId={created.paymentRequestId}
            onClose={() => onOpenChange(false)}
            onCreateAnother={() => {
              setCreated(null);
              resetForm();
            }}
          />
        ) : (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <PaymentLinkFormBody
              supportedAssets={supportedAssets}
              assetAddr={assetAddr}
              setAssetAddr={setAssetAddr}
              selected={selected}
              networkId={networkId}
              setNetworkId={setNetworkId}
              resourceId={resourceId}
              setResourceId={setResourceId}
              amountHuman={amountHuman}
              setAmountHuman={setAmountHuman}
              payTo={payTo}
              setPayTo={setPayTo}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              resourceUrl={resourceUrl}
              setResourceUrl={setResourceUrl}
              expiresAt={expiresAt}
              setExpiresAt={setExpiresAt}
              attachmentFile={attachmentFile}
              setAttachmentFile={setAttachmentFile}
              optionalOpen={optionalOpen}
              setOptionalOpen={setOptionalOpen}
              fileInputRef={fileInputRef}
              onPickAttachment={onPickAttachment}
              pending={pending}
            />
            <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={pending}>
                {pending ? "Creating…" : "Create payment link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentLinkFormBody(props: {
  supportedAssets: X402SupportedAsset[];
  assetAddr: string;
  setAssetAddr: (v: string) => void;
  selected: X402SupportedAsset | undefined;
  networkId: string;
  setNetworkId: (v: string) => void;
  resourceId: string;
  setResourceId: (v: string) => void;
  amountHuman: string;
  setAmountHuman: (v: string) => void;
  payTo: string;
  setPayTo: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  resourceUrl: string;
  setResourceUrl: (v: string) => void;
  expiresAt: string;
  setExpiresAt: (v: string) => void;
  attachmentFile: File | null;
  setAttachmentFile: (f: File | null) => void;
  optionalOpen: boolean;
  setOptionalOpen: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickAttachment: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pending: boolean;
}) {
  const {
    supportedAssets,
    assetAddr,
    setAssetAddr,
    selected,
    networkId,
    setNetworkId,
    resourceId,
    setResourceId,
    amountHuman,
    setAmountHuman,
    payTo,
    setPayTo,
    title,
    setTitle,
    description,
    setDescription,
    resourceUrl,
    setResourceUrl,
    expiresAt,
    setExpiresAt,
    attachmentFile,
    setAttachmentFile,
    optionalOpen,
    setOptionalOpen,
    fileInputRef,
    onPickAttachment,
    pending,
  } = props;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
      <Field label="Asset">
        <RadioGroup value={assetAddr} onValueChange={setAssetAddr} className="grid gap-2">
          {supportedAssets.map((a) => (
            <label
              key={a.address}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-2.5 py-2 text-sm transition-colors",
                assetAddr === a.address
                  ? "border-(--border-medium) bg-(--btn-item-active)"
                  : "hover:bg-(--btn-secondary-bg)",
                pending && "pointer-events-none opacity-60",
              )}
            >
              <RadioGroupItem value={a.address} id={`dash-asset-${a.address}`} />
              <img src={a.icon} alt="" className="h-7 w-7 rounded-full bg-pill object-cover" />
              <AssetLabel asset={a} />
            </label>
          ))}
        </RadioGroup>
      </Field>

      <Field label={`Amount (${selected?.symbol ?? "token"} units, not wei)`} htmlFor="pay-amt">
        <Input
          id="pay-amt"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 0.25"
          value={amountHuman}
          onChange={(e) => setAmountHuman(e.target.value)}
          disabled={pending}
        />
      </Field>

      <Field label="Network">
        <RadioGroup value={networkId} onValueChange={setNetworkId} className="grid gap-1.5">
          {X402_CHECKOUT_NETWORKS.map((n) => (
            <label
              key={n.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 py-1 text-sm hover:bg-(--btn-secondary-bg)",
                pending && "pointer-events-none opacity-60",
              )}
            >
              <RadioGroupItem value={n.id} id={`dash-net-${n.id}`} />
              <span>{n.label}</span>
              <span className="ml-auto truncate text-[11px] text-muted-foreground">{n.id}</span>
            </label>
          ))}
        </RadioGroup>
      </Field>

      <Field label="Pay to (0x…)" htmlFor="pay-to">
        <Input
          id="pay-to"
          spellCheck={false}
          autoComplete="off"
          placeholder="0x…"
          value={payTo}
          onChange={(e) => setPayTo(e.target.value)}
          disabled={pending}
        />
      </Field>

      <Field
        label="Resource id (x402)"
        htmlFor="pay-resource-id"
        hint="Stable id for the paywalled resource; included in x402 accepts metadata."
      >
        <ResourceIdRow resourceId={resourceId} setResourceId={setResourceId} disabled={pending} />
      </Field>

      <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-xs">
            {optionalOpen ? "Hide" : "Show"} optional fields
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <Field label="Title" htmlFor="pay-title">
            <Input
              id="pay-title"
              placeholder="Payment for services"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
            />
          </Field>

          <Field label="Description" htmlFor="pay-desc">
            <Textarea
              id="pay-desc"
              rows={3}
              placeholder="Shown on the hosted checkout page"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
            />
          </Field>

          <Field label="Resource URL (paywalled HTTPS resource)" htmlFor="pay-resource-url">
            <Input
              id="pay-resource-url"
              type="url"
              placeholder="https://api.example.com/v1/premium"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              disabled={pending}
            />
          </Field>

          <Field label="Expires at" htmlFor="pay-expires" hint="Leave empty for no expiry.">
            <Input
              id="pay-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={pending}
            />
          </Field>

          <Field label="Attachment" hint="Optional file shown on checkout (max 5 MB).">
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              onChange={onPickAttachment}
              disabled={pending}
            />
            {attachmentFile ? (
              <AttachmentRow
                name={attachmentFile.name}
                size={attachmentFile.size}
                onClear={() => setAttachmentFile(null)}
                disabled={pending}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-3.5 w-3.5" />
                Choose file
              </Button>
            )}
          </Field>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ResourceIdRow({
  resourceId,
  setResourceId,
  disabled,
}: {
  resourceId: string;
  setResourceId: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <Input
        id="pay-resource-id"
        spellCheck={false}
        autoComplete="off"
        value={resourceId}
        onChange={(e) => setResourceId(e.target.value)}
        disabled={disabled}
        className="font-mono text-xs"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={disabled}
        onClick={() => setResourceId(crypto.randomUUID())}
      >
        New id
      </Button>
    </div>
  );
}

function CheckoutSuccessBody({
  payHref,
  paymentRequestId,
  onClose,
  onCreateAnother,
}: {
  payHref: string;
  paymentRequestId: string;
  onClose: () => void;
  onCreateAnother: () => void;
}) {
  const copyLink = () => {
    void navigator.clipboard.writeText(payHref).then(
      () => toast.success("Checkout link copied"),
      () =>
        toast.error("Could not copy", {
          description: "Clipboard permission denied or unavailable.",
        }),
    );
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
        <p className="text-sm text-muted-foreground">
          Checkout id <span className="font-mono text-foreground">{paymentRequestId}</span>
        </p>
        <PayLinkBox payHref={payHref} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={copyLink}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Copy link
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.open(payHref, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Open checkout
          </Button>
        </div>
      </div>
      <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCreateAnother}>
          Create another
        </Button>
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

function PayLinkBox({ payHref }: { payHref: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pay link</p>
      <p className="mt-1 break-all font-mono text-xs text-foreground">{payHref}</p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

function AssetLabel({ asset }: { asset: X402SupportedAsset }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="font-medium">
        {asset.name} <span className="text-muted-foreground">({asset.symbol})</span>
      </div>
      {asset.address !== "native" ? (
        <div className="truncate font-mono text-[10px] text-muted-foreground">{asset.address}</div>
      ) : (
        <div className="text-[10px] text-muted-foreground">Native gas token</div>
      )}
    </div>
  );
}

function AttachmentRow({
  name,
  size,
  onClear,
  disabled,
}: {
  name: string;
  size: number;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm">
      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="text-[11px] text-muted-foreground">{(size / 1024).toFixed(1)} KB</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={disabled}
        onClick={onClear}
        aria-label="Remove attachment"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
