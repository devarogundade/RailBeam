import { z } from "zod";
import { handlerActionIdSchema } from "./handlers.js";
import { stardormChatRichBlockSchema } from "./chat-api.js";

export const userAvatarPresetSchema = z.enum(["male", "female"]);

export const userPreferencesSchema = z.object({
  autoRoutePrompts: z.boolean(),
  onchainReceipts: z.boolean(),
  emailNotifications: z.boolean(),
  avatarPreset: userAvatarPresetSchema.default("male"),
});

export const publicUserSchema = z.object({
  id: z.string().min(1),
  walletAddress: z.string().min(1),
  displayName: z.string().optional(),
  email: z.string().optional(),
  activeAgentId: z.string().min(1),
  /** Selected chat thread id when multi-conversation is enabled. */
  activeConversationId: z.string().min(1).optional(),
  preferences: userPreferencesSchema,
  lastLoginAt: z.coerce.date().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const updateUserBodySchema = z.object({
  displayName: z.string().optional(),
  email: z.string().nullable().optional(),
  activeAgentId: z.string().optional(),
  activeConversationId: z.string().nullable().optional(),
  preferences: userPreferencesSchema.partial().optional(),
});

export const userUploadResultSchema = z.object({
  rootHash: z.string().min(1),
  txHash: z.string().optional(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
});

export const executeHandlerBodySchema = z.object({
  handler: handlerActionIdSchema,
  params: z.unknown().optional(),
  /** Mongo id of the chat message that displayed the handler CTA (required). */
  ctaMessageId: z.string().min(1),
});

const handlerAttachmentSchema = z.object({
  rootHash: z.string(),
  mimeType: z.string(),
  name: z.string(),
});

export const executeHandlerResponseSchema = z.object({
  message: z.string(),
  attachments: z.array(handlerAttachmentSchema).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  rich: stardormChatRichBlockSchema.optional(),
});

export type UserAvatarPreset = z.infer<typeof userAvatarPresetSchema>;

export type PublicUser = z.infer<typeof publicUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type UserUploadResult = z.infer<typeof userUploadResultSchema>;
export type ExecuteHandlerBody = z.infer<typeof executeHandlerBodySchema>;
export type ExecuteHandlerResponse = z.infer<typeof executeHandlerResponseSchema>;
