import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ChatHistoryMessage, ChatHistoryResponse } from "@railbeam/stardorm-api-contract";
import { queryKeys } from "@/lib/query-keys";

/** Merges WSS-delivered rows into the newest chat history page without a network refetch. */
export function appendThreadMessagesToChatCache(
  queryClient: QueryClient,
  userKey: `0x${string}`,
  conversationId: string,
  incoming: ChatHistoryMessage[],
): boolean {
  if (incoming.length === 0) return false;
  const key = queryKeys.user.chatMessages(userKey, conversationId);
  let merged = false;

  queryClient.setQueryData<InfiniteData<ChatHistoryResponse>>(key, (old) => {
    if (!old?.pages?.length) {
      const agentKey =
        incoming.find((m) => m.agentKey)?.agentKey ??
        incoming.find((m) => m.role === "agent")?.agentKey ??
        "beam-default";
      merged = true;
      return {
        pageParams: [undefined],
        pages: [
          {
            conversationId,
            agentKey,
            messages: [...incoming],
            hasMoreOlder: false,
          },
        ],
      };
    }

    let changed = false;
    const pages = old.pages.map((page, index) => {
      if (index !== 0) return page;
      const messages = [...page.messages];
      for (const inc of incoming) {
        const idx = messages.findIndex((m) => m.id === inc.id);
        if (idx >= 0) {
          messages[idx] = { ...messages[idx], ...inc };
          changed = true;
        } else if (!messages.some((m) => m.id === inc.id)) {
          messages.push(inc);
          changed = true;
        }
      }
      if (!changed) return page;
      merged = true;
      return { ...page, messages };
    });

    return merged ? { ...old, pages } : old;
  });

  return merged;
}
