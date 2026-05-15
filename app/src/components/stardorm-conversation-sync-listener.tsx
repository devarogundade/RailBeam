import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectBeamConversationSync, type BeamConversationSyncPayload } from "@railbeam/beam-sdk";
import { useApp } from "@/lib/app-state";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { buildStardormConversationWsUrl } from "@/lib/stardorm-conversation-ws";
import { appendThreadMessagesToChatCache } from "@/lib/chat-query-cache";
import { queryKeys } from "@/lib/query-keys";

/**
 * Keeps TanStack Query chat / conversation caches in sync via Stardorm `/ws/conversations`.
 * Thread updates merge message payloads in-place; list changes still invalidate lightly.
 */
export function StardormConversationSyncListener() {
  const queryClient = useQueryClient();
  const { stardormAccessToken, address } = useApp();
  const userKey = address ? (address.toLowerCase() as `0x${string}`) : null;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getStardormApiBase() || !stardormAccessToken || !userKey) return;

    const url = buildStardormConversationWsUrl(stardormAccessToken);
    if (!url) return;

    const conn = connectBeamConversationSync({
      url,
      reconnect: true,
      onPayload: (payload: BeamConversationSyncPayload) => {
        if (payload.op === "thread_messages") {
          appendThreadMessagesToChatCache(
            queryClient,
            userKey,
            payload.conversationId,
            payload.messages,
          );
          void queryClient.invalidateQueries({
            queryKey: queryKeys.user.conversations(userKey),
          });
          return;
        }
        if (payload.op === "thread") {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.user.chatMessages(userKey, payload.conversationId),
          });
          return;
        }
        if (payload.op === "conversations") {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.user.conversations(userKey),
          });
          void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(userKey) });
          return;
        }
        if (payload.op === "conversation_deleted") {
          queryClient.removeQueries({
            queryKey: queryKeys.user.chatMessages(userKey, payload.conversationId),
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.user.conversations(userKey),
          });
          void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(userKey) });
        }
      },
    });

    return () => {
      conn.close();
    };
  }, [queryClient, stardormAccessToken, userKey]);

  return null;
}
