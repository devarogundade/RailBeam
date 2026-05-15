import { z } from "zod";
import { chatHistoryMessageSchema } from "./conversation.js";

/** Lightweight invalidation hint (legacy clients refetch the thread). */
export const conversationSyncThreadSchema = z.object({
  v: z.literal(1),
  op: z.literal("thread"),
  conversationId: z.string().min(1),
});

/** Full message rows for in-place TanStack cache updates (no refetch). */
export const conversationSyncThreadMessagesSchema = z.object({
  v: z.literal(1),
  op: z.literal("thread_messages"),
  conversationId: z.string().min(1),
  messages: z.array(chatHistoryMessageSchema).min(1),
});

export const conversationSyncConversationsSchema = z.object({
  v: z.literal(1),
  op: z.literal("conversations"),
});

export const conversationSyncConversationDeletedSchema = z.object({
  v: z.literal(1),
  op: z.literal("conversation_deleted"),
  conversationId: z.string().min(1),
});

export const conversationSyncPayloadSchema = z.discriminatedUnion("op", [
  conversationSyncThreadSchema,
  conversationSyncThreadMessagesSchema,
  conversationSyncConversationsSchema,
  conversationSyncConversationDeletedSchema,
]);

export type ConversationSyncThreadPayload = z.infer<typeof conversationSyncThreadSchema>;
export type ConversationSyncThreadMessagesPayload = z.infer<
  typeof conversationSyncThreadMessagesSchema
>;
export type ConversationSyncPayload = z.infer<typeof conversationSyncPayloadSchema>;
