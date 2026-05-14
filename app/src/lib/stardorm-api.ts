import axios from "axios";
import {
  chatHistoryResponseSchema,
  executeHandlerBodySchema,
  executeHandlerResponseSchema,
  publicUserSchema,
  stardormChatSuccessSchema,
  updateUserBodySchema,
  type ChatHistoryResponse,
  type ExecuteHandlerBody,
  type PublicUser,
  type StardormChatClientResult,
  type UpdateUserBody,
} from "@beam/stardorm-api-contract";
import { getStardormAccessToken } from "./stardorm-auth";
import { getStardormApiBase, stardormAxios } from "./stardorm-axios";
import type { ChatMessage } from "./schemas";

function axiosErrorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) {
    return e instanceof Error ? e.message : String(e);
  }
  const body = e.response?.data;
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  return (
    (typeof obj?.message === "string" && obj.message) ||
    (typeof obj?.error === "string" && obj.error) ||
    e.message ||
    `HTTP ${e.response?.status ?? "error"}`
  );
}

export async function stardormChat(params: {
  agentKey: string;
  message: string;
  /** Optional thread id; must belong to the signed-in user. */
  conversationId?: string;
  /** Optional raw `File` objects uploaded to 0G Storage server-side and attached to the message. */
  files?: File[];
}): Promise<StardormChatClientResult | null> {
  if (!getStardormApiBase()) return null;
  const url = `/agents/${encodeURIComponent(params.agentKey)}/chat`;
  const hasFiles = (params.files?.length ?? 0) > 0;

  try {
    let response: unknown;
    if (hasFiles) {
      const fd = new FormData();
      fd.append("message", params.message ?? "");
      if (params.conversationId) {
        fd.append("conversationId", params.conversationId);
      }
      for (const f of params.files ?? []) fd.append("files", f, f.name);
      const { data } = await stardormAxios.post<unknown>(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      response = data;
    } else {
      const { data } = await stardormAxios.post<unknown>(url, {
        message: params.message,
        ...(params.conversationId ? { conversationId: params.conversationId } : {}),
      });
      response = data;
    }
    const parsed = stardormChatSuccessSchema.safeParse(response);
    if (!parsed.success) {
      return { error: "Unexpected response from Stardorm API" };
    }
    return parsed.data;
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

/** Maps persisted thread rows to in-app chat bubbles (storage URLs use API base). */
export function mapHistoryToChatMessages(hist: ChatHistoryResponse, apiBase: string): ChatMessage[] {
  const base = apiBase.replace(/\/$/, "");
  return hist.messages.map((m) => ({
    id: m.id,
    role: m.role,
    agentId: m.agentKey,
    content: m.content,
    createdAt: m.createdAt,
    status: "delivered" as const,
    ...(m.rich ? { rich: m.rich } : {}),
    ...(m.handlerCta ? { handlerCta: m.handlerCta } : {}),
    ...(m.followUp ? { followUp: m.followUp } : {}),
    ...(typeof m.model === "string" ? { model: m.model } : {}),
    ...(typeof m.verified === "boolean" ? { verified: m.verified } : {}),
    ...(typeof m.chatId === "string" ? { chatId: m.chatId } : {}),
    ...(typeof m.provider === "string" ? { provider: m.provider } : {}),
    ...(m.attachments?.length
      ? {
          attachments: m.attachments.map((a) => {
            const isImg = a.mimeType.startsWith("image/");
            const storageUrl = `${base}/storage/${encodeURIComponent(a.hash)}`;
            return {
              id: a.id,
              type: isImg ? ("image" as const) : ("file" as const),
              name: a.name,
              mimeType: a.mimeType,
              rootHash: a.hash,
              ...(isImg ? { url: storageUrl } : {}),
              ...(a.size ? { size: a.size } : {}),
            };
          }),
        }
      : {}),
  }));
}

export async function fetchStardormMe(): Promise<PublicUser | null> {
  if (!getStardormApiBase()) return null;
  try {
    const { data } = await stardormAxios.get<unknown>("/users/me");
    return publicUserSchema.parse(data);
  } catch {
    return null;
  }
}

export async function updateStardormMe(
  patch: UpdateUserBody,
): Promise<PublicUser | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  const parsed = updateUserBodySchema.safeParse(patch);
  if (!parsed.success) {
    return { error: "Invalid profile update" };
  }
  if (Object.keys(parsed.data).length === 0) {
    return { error: "Nothing to update" };
  }
  try {
    const { data } = await stardormAxios.patch<unknown>("/users/me", parsed.data);
    return publicUserSchema.parse(data);
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

export async function fetchStardormChatMessages(params: {
  limit?: number;
  conversationId?: string;
  cursor?: string;
} = {}): Promise<ChatHistoryResponse | null> {
  if (!getStardormApiBase()) return null;
  const { limit = 40, conversationId, cursor } = params;
  try {
    const { data } = await stardormAxios.get<unknown>("/users/me/chat/messages", {
      params: {
        limit,
        ...(conversationId ? { conversationId } : {}),
        ...(cursor ? { cursor } : {}),
      },
    });
    return chatHistoryResponseSchema.parse(data);
  } catch {
    return null;
  }
}

export async function stardormExecuteHandler(
  body: ExecuteHandlerBody,
): Promise<ReturnType<typeof executeHandlerResponseSchema.parse> | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  const parsedBody = executeHandlerBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return { error: "Invalid handler request" };
  }
  try {
    const { data } = await stardormAxios.post<unknown>(
      "/users/me/chat/execute-handler",
      parsedBody.data,
    );
    return executeHandlerResponseSchema.parse(data);
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

export async function fetchStardormCreditCards(): Promise<CreditCardsListResponse | null> {
  if (!getStardormApiBase()) return null;
  try {
    const { data } = await stardormAxios.get<unknown>("/users/me/credit-cards");
    return creditCardsListResponseSchema.parse(data);
  } catch {
    return null;
  }
}

export async function fundStardormCreditCard(
  cardId: string,
  amountCents: number,
): Promise<CreditCardPublic | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  const body = creditCardFundBodySchema.safeParse({ amountCents });
  if (!body.success) return { error: "Invalid amount" };
  try {
    const { data } = await stardormAxios.post<unknown>(
      `/users/me/credit-cards/${encodeURIComponent(cardId)}/fund`,
      body.data,
    );
    return creditCardPublicSchema.parse(data);
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

export async function withdrawStardormCreditCard(
  cardId: string,
  amountCents: number,
): Promise<CreditCardPublic | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  const body = creditCardWithdrawBodySchema.safeParse({ amountCents });
  if (!body.success) return { error: "Invalid amount" };
  try {
    const { data } = await stardormAxios.post<unknown>(
      `/users/me/credit-cards/${encodeURIComponent(cardId)}/withdraw`,
      body.data,
    );
    return creditCardPublicSchema.parse(data);
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

export function isStardormInferenceEnabled(): boolean {
  return Boolean(getStardormApiBase() && getStardormAccessToken());
}
