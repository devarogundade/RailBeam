/**
 * JSON payloads pushed over `/ws/conversations` (RFC 6455 WebSocket).
 * Swift: decode with `JSONDecoder`; refresh via existing REST (`/users/me/chat/messages`, `/users/me/conversations`).
 */
export type {
  ConversationSyncPayload,
  ConversationSyncThreadMessagesPayload,
} from '@beam/stardorm-api-contract';
