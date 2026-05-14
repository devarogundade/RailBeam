import { z } from "zod";
import {
  chatHistoryHandlerCtaSchema,
  chatFollowUpSchema,
  stardormChatRichBlockSchema,
} from "@beam/stardorm-api-contract";

export const messageRoleSchema = z.enum(["user", "agent"]);

export const chatAttachmentSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "file"]),
  name: z.string(),
  url: z.string().url().optional(),
  rootHash: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.string().optional(),
});

/** Same shape as API history + chat success handler CTAs. */
export const chatHandlerCtaSchema = chatHistoryHandlerCtaSchema;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: messageRoleSchema,
  agentId: z.string().optional(),
  content: z.string(),
  attachments: z.array(chatAttachmentSchema).optional(),
  createdAt: z.number(),
  status: z.enum(["sent", "delivered", "seen"]).optional(),
  rich: stardormChatRichBlockSchema.optional(),
  handlerCta: chatHandlerCtaSchema.optional(),
  followUp: chatFollowUpSchema.optional(),
  /** 0G inference metadata (agent turns). */
  model: z.string().optional(),
  verified: z.boolean().optional(),
  chatId: z.string().optional(),
  provider: z.string().optional(),
});

export type MessageRole = z.infer<typeof messageRoleSchema>;
export type ChatAttachment = z.infer<typeof chatAttachmentSchema>;
export type ChatHandlerCta = z.infer<typeof chatHandlerCtaSchema>;
export type ChatFollowUp = z.infer<typeof chatFollowUpSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
