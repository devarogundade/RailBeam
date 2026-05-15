import type { InfiniteData } from "@tanstack/react-query";
import type {
  ChatHandlerResult,
  ChatHistoryMessage,
  ChatHistoryResponse,
} from "@railbeam/stardorm-api-contract";
import { queryKeys } from "@/lib/query-keys";

function mergeResultRows(
  rich: ChatHistoryMessage["rich"],
  result: ChatHandlerResult,
): ChatHistoryMessage["rich"] {
  if (!rich || rich.type !== "tx") return rich;
  const baseRows = [...(rich.rows ?? [])].filter(
    (r) => r.label !== "Transaction status" && r.label !== "Tx hash" && r.label !== "Error",
  );
  if (result.kind === "wallet_tx") {
    const statusLabel =
      result.status === "confirmed"
        ? "Confirmed"
        : result.status === "failed"
          ? "Failed"
          : "Submitted";
    baseRows.push({ label: "Transaction status", value: statusLabel });
    if (result.txHash) {
      const h = result.txHash;
      baseRows.push({
        label: "Tx hash",
        value: `${h.slice(0, 10)}…${h.slice(-8)}`,
      });
    } else if (result.error) {
      baseRows.push({ label: "Error", value: result.error.slice(0, 400) });
    }
  }
  return { ...rich, rows: baseRows };
}

/** Update a single message’s `result` + tx rich rows in the chat infinite query cache. */
export function patchChatMessageInCache(
  queryClient: import("@tanstack/react-query").QueryClient,
  userKey: `0x${string}`,
  conversationId: string,
  messageId: string,
  result: ChatHandlerResult,
): void {
  const key = queryKeys.user.chatMessages(userKey, conversationId);
  queryClient.setQueryData<InfiniteData<ChatHistoryResponse>>(key, (old) => {
    if (!old?.pages?.length) return old;
    const pages = old.pages.map((page) => ({
      ...page,
      messages: page.messages.map((m) => {
        if (m.id !== messageId) return m;
        const rich = mergeResultRows(m.rich, result);
        return { ...m, result, ...(rich ? { rich } : {}) };
      }),
    }));
    return { ...old, pages };
  });
}
