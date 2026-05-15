import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ChatHistoryMessage, ChatHistoryResponse } from "@railbeam/stardorm-api-contract";
import { queryKeys } from "@/lib/query-keys";

function collectMessageIds(data: InfiniteData<ChatHistoryResponse> | undefined): Set<string> {
  const ids = new Set<string>();
  if (!data?.pages) return ids;
  for (const page of data.pages) {
    for (const m of page.messages) ids.add(m.id);
  }
  return ids;
}

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
    const existingIds = collectMessageIds(old);
    const toAdd = incoming.filter((m) => !existingIds.has(m.id));
    if (toAdd.length === 0) return old;
    merged = true;

    if (!old?.pages?.length) {
      const agentKey =
        toAdd.find((m) => m.agentKey)?.agentKey ?? toAdd.find((m) => m.role === "agent")?.agentKey ?? "beam-default";
      return {
        pageParams: [undefined],
        pages: [
          {
            conversationId,
            agentKey,
            messages: [...toAdd],
            hasMoreOlder: false,
          },
        ],
      };
    }

    const pages = old.pages.map((page, index) =>
      index === 0 ? { ...page, messages: [...page.messages, ...toAdd] } : page,
    );
    return { ...old, pages };
  });

  return merged;
}

export function chatCacheHasMessageIds(
  queryClient: QueryClient,
  userKey: `0x${string}`,
  conversationId: string,
  messageIds: string[],
): boolean {
  const data = queryClient.getQueryData<InfiniteData<ChatHistoryResponse>>(
    queryKeys.user.chatMessages(userKey, conversationId),
  );
  const existing = collectMessageIds(data);
  return messageIds.every((id) => existing.has(id));
}
