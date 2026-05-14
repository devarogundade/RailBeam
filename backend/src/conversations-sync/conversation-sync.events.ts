/**
 * JSON payloads pushed over `/ws/conversations` (RFC 6455 WebSocket).
 * Swift: decode with `JSONDecoder`; refresh via existing REST (`/users/me/chat/messages`, `/users/me/conversations`).
 */
export type ConversationSyncPayload =
  | {
      v: 1;
      op: 'thread';
      conversationId: string;
    }
  | {
      v: 1;
      op: 'conversations';
    }
  | {
      v: 1;
      op: 'conversation_deleted';
      conversationId: string;
    };
