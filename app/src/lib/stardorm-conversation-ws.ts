import {
  type BeamConversationSyncPayload,
  buildBeamConversationsWebSocketUrl,
  parseBeamConversationSyncPayload,
} from "@beam/beam-sdk";
import { getStardormApiBase } from "./stardorm-axios";

export type StardormConversationSyncPayload = BeamConversationSyncPayload;

export { parseBeamConversationSyncPayload as parseStardormConversationSyncPayload };

/**
 * WebSocket URL for conversation sync (browser `WebSocket` cannot set `Authorization`).
 * Path is `{API pathname prefix}/ws/conversations` on the same host as `VITE_STARDORM_API_URL`.
 */
export function buildStardormConversationWsUrl(accessToken: string): string | null {
  const raw = getStardormApiBase()?.trim();
  if (!raw || !accessToken.trim()) return null;
  try {
    return buildBeamConversationsWebSocketUrl(raw.replace(/\/$/, ""), accessToken);
  } catch {
    return null;
  }
}
