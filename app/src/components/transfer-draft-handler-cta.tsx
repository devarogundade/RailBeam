import * as React from "react";
import {
  useChainId,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";
import type { ChatHandlerResult } from "@railbeam/stardorm-api-contract";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { waitForWriteContractReceipt } from "@/lib/wait-write-contract-receipt";

const erc20TransferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const erc721SafeTransferFromAbi = [
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const erc1155SafeTransferFromAbi = [
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

function parseCaip2Eip155ChainId(network: unknown): number | null {
  if (typeof network !== "string") return null;
  const m = /^eip155:(\d+)$/.exec(network.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isEvmAddress20(s: unknown): s is `0x${string}` {
  return typeof s === "string" && /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export type TransferDraftHandlerKind =
  | "draft_native_transfer"
  | "draft_erc20_transfer"
  | "draft_nft_transfer";

export function isTransferDraftHandler(h: string): h is TransferDraftHandlerKind {
  return (
    h === "draft_native_transfer" ||
    h === "draft_erc20_transfer" ||
    h === "draft_nft_transfer"
  );
}

export function TransferDraftHandlerCtaRow({
  messageId,
  handler,
  params,
  label,
  txConfirmed,
  onPersistResult,
}: {
  messageId: string;
  handler: TransferDraftHandlerKind;
  params: Record<string, unknown>;
  label: string;
  /** When set, the CTA stays disabled (tx already broadcast). */
  txConfirmed?: boolean;
  onPersistResult?: (result: ChatHandlerResult) => void | Promise<void>;
}) {
  const { address, connect } = useApp();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { sendTransactionAsync, isPending: sendingNative } = useSendTransaction();
  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [lastHash, setLastHash] = React.useState<`0x${string}` | null>(null);

  React.useEffect(() => {
    setLastHash(null);
  }, [messageId]);

  const network =
    typeof params.network === "string" ? params.network.trim() : undefined;

  const busy = sendingNative || writing;

  const onSend = async () => {
    if (!address) {
      const opened = connect();
      if (opened) {
        toast.message("Wallet required", {
          description: "Connect in the modal, then tap send again.",
        });
      }
      return;
    }

    const targetChainId = parseCaip2Eip155ChainId(params.network);
    if (targetChainId == null) {
      toast.error("Invalid network", {
        description: "Expected CAIP-2 `eip155:<chainId>` on the draft.",
      });
      return;
    }

    try {
      if (chainId !== targetChainId && switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      }
      if (!publicClient) {
        throw new Error("Wallet RPC client unavailable. Refresh and try again.");
      }

      let hash: `0x${string}`;

      if (handler === "draft_native_transfer") {
        if (!isEvmAddress20(params.to)) {
          throw new Error("Invalid recipient address on the draft.");
        }
        const raw = params.valueWei;
        if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw.trim())) {
          throw new Error("Invalid valueWei on the draft.");
        }
        const value = BigInt(raw.trim());
        hash = await sendTransactionAsync({
          chainId: targetChainId,
          to: params.to.trim() as `0x${string}`,
          value,
        });
      } else if (handler === "draft_erc20_transfer") {
        if (!isEvmAddress20(params.token) || !isEvmAddress20(params.to)) {
          throw new Error("Invalid token or recipient on the draft.");
        }
        const raw = params.amountWei;
        if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw.trim())) {
          throw new Error("Invalid amountWei on the draft.");
        }
        const amount = BigInt(raw.trim());
        hash = await writeContractAsync({
          chainId: targetChainId,
          address: params.token.trim().toLowerCase() as `0x${string}`,
          abi: erc20TransferAbi,
          functionName: "transfer",
          args: [params.to.trim().toLowerCase() as `0x${string}`, amount],
        });
      } else {
        if (!isEvmAddress20(params.contract) || !isEvmAddress20(params.to)) {
          throw new Error("Invalid contract or recipient on the draft.");
        }
        const standard =
          params.standard === "erc1155" ? "erc1155" : ("erc721" as const);
        const tokenIdRaw = params.tokenId;
        if (typeof tokenIdRaw !== "string" || !/^\d+$/.test(tokenIdRaw.trim())) {
          throw new Error("Invalid tokenId on the draft.");
        }
        const tokenId = BigInt(tokenIdRaw.trim());
        const from = address.toLowerCase() as `0x${string}`;
        const to = params.to.trim().toLowerCase() as `0x${string}`;
        const contract = params.contract.trim().toLowerCase() as `0x${string}`;

        if (standard === "erc1155") {
          const amtRaw = params.amount;
          if (typeof amtRaw !== "string" || !/^[1-9]\d*$/.test(amtRaw.trim())) {
            throw new Error("Invalid amount on the ERC-1155 draft.");
          }
          const amount = BigInt(amtRaw.trim());
          hash = await writeContractAsync({
            chainId: targetChainId,
            address: contract,
            abi: erc1155SafeTransferFromAbi,
            functionName: "safeTransferFrom",
            args: [from, to, tokenId, amount, "0x"],
          });
        } else {
          hash = await writeContractAsync({
            chainId: targetChainId,
            address: contract,
            abi: erc721SafeTransferFromAbi,
            functionName: "safeTransferFrom",
            args: [from, to, tokenId],
          });
        }
      }

      await waitForWriteContractReceipt(publicClient, hash);
      setLastHash(hash);
      const result: ChatHandlerResult = {
        kind: "wallet_tx",
        status: "confirmed",
        txHash: hash,
        network,
        chainId: targetChainId,
        handler,
        updatedAt: Date.now(),
      };
      await onPersistResult?.(result);
      toast.success("Transfer submitted", {
        description: `${hash.slice(0, 10)}…${hash.slice(-6)}`,
      });
    } catch (e) {
      const fail: ChatHandlerResult = {
        kind: "wallet_tx",
        status: "failed",
        error: errMsg(e),
        network,
        chainId: targetChainId,
        handler,
        updatedAt: Date.now(),
      };
      void onPersistResult?.(fail);
      toast.error("Transfer failed", { description: errMsg(e) });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 px-0.5">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={busy}
        disabled={busy || lastHash != null || txConfirmed === true}
        onClick={() => void onSend()}
      >
        {busy ? "Sending…" : lastHash != null || txConfirmed ? "Sent" : label}
      </Button>
    </div>
  );
}
