import axios from "axios";
import {
  chatHistoryResponseSchema,
  patchChatMessageResultBodySchema,
  patchChatMessageResultResponseSchema,
  type ChatHandlerResult,
  creditCardFundQuoteSchema,
  creditCardPublicSchema,
  creditCardSensitiveDetailsSchema,
  creditCardsListResponseSchema,
  creditCardWithdrawBodySchema,
  executeHandlerBodySchema,
  executeHandlerResponseSchema,
  userUploadResultSchema,
  onRampsListResponseSchema,
  paymentRequestsListResponseSchema,
  stardormChatClientResultSchema,
  userKycStatusDocumentSchema,
  type ChatHistoryAttachment,
  type ChatHistoryMessage,
  type ChatHistoryResponse,
  type CreditCardFundQuote,
  type CreditCardPublic,
  type CreditCardSensitiveDetails,
  type CreditCardsListResponse,
  type ExecuteHandlerBody,
  type OnRampsListResponse,
  type PaymentRequestsListResponse,
  type StardormChatClientResult,
  type UserKycStatusDocument,
  type UserUploadResult,
} from "@railbeam/stardorm-api-contract";
import { getStardormAccessToken } from "./stardorm-auth";
import { BEAM_CHAIN_IDS } from "./beam-chain-config";
import { settleCreditCardFundViaAccess } from "./x402-checkout";
import { getStardormApiBase, stardormAxios } from "./stardorm-axios";
import type { PublicClient, WalletClient } from "viem";
import type { ChatMessage } from "./schemas";

function normalizeStardormChatResponseBody(data: unknown): unknown {
  if (data == null) return data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  }
  if (typeof data !== "object") return data;
  const o = { ...(data as Record<string, unknown>) };
  for (const key of ["rich", "structured", "attachments"] as const) {
    if (o[key] === null) delete o[key];
  }
  return o;
}

function formatZodIssues(issues: { path: (string | number)[]; message: string }[]): string {
  if (issues.length === 0) return "";
  return issues
    .slice(0, 3)
    .map((i) => `${i.path.length ? i.path.join(".") : "response"}: ${i.message}`)
    .join("; ");
}

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
      const { data } = await stardormAxios.post<unknown>(url, fd);
      response = data;
    } else {
      const { data } = await stardormAxios.post<unknown>(url, {
        message: params.message,
        ...(params.conversationId ? { conversationId: params.conversationId } : {}),
      });
      response = data;
    }
    const normalized = normalizeStardormChatResponseBody(response);
    const parsed = stardormChatClientResultSchema.safeParse(normalized);
    if (!parsed.success) {
      const detail = formatZodIssues(parsed.error.issues);
      return {
        error: detail
          ? `Unexpected response from Stardorm API (${detail})`
          : "Unexpected response from Stardorm API",
      };
    }
    if ("error" in parsed.data) {
      return parsed.data;
    }
    return parsed.data;
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

/** Maps persisted thread rows to in-app chat bubbles (storage URLs use API base). */
export function mapHistoryToChatMessages(hist: ChatHistoryResponse, apiBase: string): ChatMessage[] {
  const base = apiBase.replace(/\/$/, "");
  return hist.messages.map((m: ChatHistoryMessage) => ({
    id: m.id,
    role: m.role,
    agentId: m.agentKey,
    content: m.content,
    createdAt: m.createdAt,
    status: "delivered" as const,
    ...(m.rich ? { rich: m.rich } : {}),
    ...(m.handlerCta ? { handlerCta: m.handlerCta } : {}),
    ...(m.result ? { result: m.result } : {}),
    ...(m.followUp ? { followUp: m.followUp } : {}),
    ...(typeof m.model === "string" ? { model: m.model } : {}),
    ...(typeof m.verified === "boolean" ? { verified: m.verified } : {}),
    ...(typeof m.chatId === "string" ? { chatId: m.chatId } : {}),
    ...(typeof m.provider === "string" ? { provider: m.provider } : {}),
    ...(m.attachments?.length
      ? {
          attachments: m.attachments.map((a: ChatHistoryAttachment) => {
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

export type StardormHandlerInvokeResult = {
  message: string;
  data?: Record<string, unknown>;
  attachments?: Array<{ rootHash: string; mimeType: string; name: string }>;
};

export async function stardormInvokeHandler(
  handleId: string,
  body: unknown,
): Promise<StardormHandlerInvokeResult | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  try {
    const { data } = await stardormAxios.post<unknown>(
      `/handlers/${encodeURIComponent(handleId)}`,
      body,
    );
    const parsed = executeHandlerResponseSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Unexpected response from Beam API" };
    }
    return parsed.data;
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

export async function uploadStardormUserFile(
  file: File,
): Promise<UserUploadResult | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  const fd = new FormData();
  fd.append("file", file, file.name);
  try {
    const { data } = await stardormAxios.post<unknown>("/users/me/files", fd);
    return userUploadResultSchema.parse(data);
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

export async function stardormPatchChatMessageResult(
  messageId: string,
  result: ChatHandlerResult,
): Promise<
  ReturnType<typeof patchChatMessageResultResponseSchema.parse> | { error: string }
> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  const parsedBody = patchChatMessageResultBodySchema.safeParse({ result });
  if (!parsedBody.success) {
    return { error: "Invalid result payload" };
  }
  try {
    const { data } = await stardormAxios.patch<unknown>(
      `/users/me/chat/messages/${encodeURIComponent(messageId)}/result`,
      parsedBody.data,
    );
    return patchChatMessageResultResponseSchema.parse(data);
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
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

export async function fetchStardormCreditCardSensitiveDetails(
  cardId: string,
): Promise<CreditCardSensitiveDetails | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  try {
    const { data } = await stardormAxios.get<unknown>(
      `/users/me/credit-cards/${encodeURIComponent(cardId)}/details`,
    );
    return creditCardSensitiveDetailsSchema.parse(data);
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

export async function fetchStardormPaymentRequests(params: {
  limit?: number;
} = {}): Promise<PaymentRequestsListResponse | null> {
  if (!getStardormApiBase()) return null;
  const { limit = 20 } = params;
  try {
    const { data } = await stardormAxios.get<unknown>("/users/me/payment-requests", {
      params: { limit },
    });
    return paymentRequestsListResponseSchema.parse(data);
  } catch {
    return null;
  }
}

export async function fetchStardormOnRamps(params: {
  limit?: number;
} = {}): Promise<OnRampsListResponse | null> {
  if (!getStardormApiBase()) return null;
  const { limit = 20 } = params;
  try {
    const { data } = await stardormAxios.get<unknown>("/users/me/on-ramps", {
      params: { limit },
    });
    return onRampsListResponseSchema.parse(data);
  } catch {
    return null;
  }
}

export async function fetchStardormKycStatus(): Promise<UserKycStatusDocument | null> {
  if (!getStardormApiBase()) return null;
  try {
    const { data } = await stardormAxios.get<unknown>("/users/me/kyc-status");
    return userKycStatusDocumentSchema.parse(data);
  } catch {
    return null;
  }
}

export async function fetchCreditCardFundQuote(
  amountCents: number,
): Promise<CreditCardFundQuote | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  try {
    const { data } = await stardormAxios.get<unknown>("/users/me/credit-cards/fund-quote", {
      params: { amountCents },
    });
    return creditCardFundQuoteSchema.parse(data);
  } catch (e: unknown) {
    return { error: axiosErrorMessage(e) };
  }
}

/**
 * Fund a virtual card via x402 (`@x402/axios` + wagmi wallet on GET …/fund/access).
 * Quote first with {@link fetchCreditCardFundQuote}; this performs the USDC.e payment.
 */
export async function fundStardormCreditCardViaX402(params: {
  cardId: string;
  amountCents: number;
  walletClient: WalletClient;
  publicClient?: PublicClient | null;
  chainId?: number;
}): Promise<CreditCardPublic | { error: string }> {
  if (!getStardormApiBase()) return { error: "API not configured" };
  try {
    const card = await settleCreditCardFundViaAccess({
      cardId: params.cardId,
      amountCents: params.amountCents,
      walletClient: params.walletClient,
      publicClient: params.publicClient ?? null,
      chainId: params.chainId ?? BEAM_CHAIN_IDS.mainnet,
    });
    return card;
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
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
