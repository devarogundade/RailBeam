import {
  publicUserSchema,
  updateUserBodySchema,
  conversationSummarySchema,
  conversationsPageResponseSchema,
  createConversationBodySchema,
  type PublicUser,
  type UpdateUserBody,
  type ConversationSummary,
  type ConversationsPageResponse,
  type CreateConversationBody,
} from "@beam/stardorm-api-contract";
import { getStardormApiBase, stardormAxios } from "./stardorm-axios";

export async function fetchStardormMe(): Promise<PublicUser> {
  if (!getStardormApiBase()) {
    throw new Error("Beam API URL is not configured");
  }
  const { data } = await stardormAxios.get<unknown>("/users/me");
  return publicUserSchema.parse(data);
}

export async function patchStardormUser(body: UpdateUserBody): Promise<PublicUser> {
  if (!getStardormApiBase()) {
    throw new Error("Beam API URL is not configured");
  }
  const parsed = updateUserBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Invalid profile update");
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new Error("Nothing to update");
  }
  const { data } = await stardormAxios.patch<unknown>("/users/me", parsed.data);
  return publicUserSchema.parse(data);
}

export async function fetchStardormConversationsPage(params: {
  limit?: number;
  cursor?: string;
} = {}): Promise<ConversationsPageResponse> {
  if (!getStardormApiBase()) {
    throw new Error("Beam API URL is not configured");
  }
  const { limit = 25, cursor } = params;
  const { data } = await stardormAxios.get<unknown>("/users/me/conversations", {
    params: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });
  return conversationsPageResponseSchema.parse(data);
}

export async function createStardormConversation(
  body: CreateConversationBody = {},
): Promise<ConversationSummary> {
  if (!getStardormApiBase()) {
    throw new Error("Beam API URL is not configured");
  }
  const parsed = createConversationBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Invalid conversation body");
  }
  const { data } = await stardormAxios.post<unknown>(
    "/users/me/conversations",
    parsed.data,
  );
  return conversationSummarySchema.parse(data);
}
