import {
  chatHistoryQuerySchema,
  chatHistoryResponseSchema,
  conversationSummarySchema,
  conversationsPageResponseSchema,
  conversationsQuerySchema,
  createConversationBodySchema,
  creditCardFundBodySchema,
  creditCardFundQuoteQuerySchema,
  creditCardFundQuoteResponseSchema,
  creditCardPublicSchema,
  creditCardSensitiveDetailsSchema,
  creditCardsListResponseSchema,
  creditCardWithdrawBodySchema,
  deleteConversationResponseSchema,
  executeHandlerBodySchema,
  executeHandlerResponseSchema,
  meOnRampsQuerySchema,
  mePaymentRequestsQuerySchema,
  onRampsListResponseSchema,
  paymentRequestsListResponseSchema,
  publicUserSchema,
  updateUserBodySchema,
  userKycStatusDocumentSchema,
  userUploadResultSchema,
  type ChatHistoryQuery,
  type ChatHistoryResponse,
  type ConversationSummary,
  type ConversationsPageResponse,
  type ConversationsQuery,
  type CreateConversationBody,
  type CreditCardFundBody,
  type CreditCardFundQuoteQuery,
  type CreditCardFundQuoteResponse,
  type CreditCardPublic,
  type CreditCardSensitiveDetails,
  type CreditCardsListResponse,
  type CreditCardWithdrawBody,
  type DeleteConversationResponse,
  type ExecuteHandlerBody,
  type ExecuteHandlerResponse,
  type MeOnRampsQuery,
  type MePaymentRequestsQuery,
  type OnRampsListResponse,
  type PaymentRequestsListResponse,
  type PublicUser,
  type UpdateUserBody,
  type UserKycStatusDocument,
  type UserUploadResult,
} from "@beam/stardorm-api-contract";
import type { BeamHttpClient } from "../http.js";

const USER_UPLOAD_FIELD = "file";

export type BeamUsersMeChatParams = {
  agentId: bigint | number | string;
  message: string;
  conversationId?: string;
  files?: readonly File[];
};

export type BeamUsersApi = {
  getMe: () => Promise<PublicUser>;
  updateMe: (body: UpdateUserBody) => Promise<PublicUser>;
  uploadFile: (file: File) => Promise<UserUploadResult>;
  listConversations: (query?: ConversationsQuery) => Promise<ConversationsPageResponse>;
  createConversation: (body: CreateConversationBody) => Promise<ConversationSummary>;
  deleteConversation: (conversationId: string) => Promise<DeleteConversationResponse>;
  chatMessages: (query?: ChatHistoryQuery) => Promise<ChatHistoryResponse>;
  listCreditCards: () => Promise<CreditCardsListResponse>;
  creditCardFundQuote: (
    query: CreditCardFundQuoteQuery,
  ) => Promise<CreditCardFundQuoteResponse>;
  creditCardSensitiveDetails: (cardId: string) => Promise<CreditCardSensitiveDetails>;
  listPaymentRequests: (query?: MePaymentRequestsQuery) => Promise<PaymentRequestsListResponse>;
  listOnRamps: (query?: MeOnRampsQuery) => Promise<OnRampsListResponse>;
  getKycStatus: () => Promise<UserKycStatusDocument>;
  fundCreditCard: (cardId: string, body: CreditCardFundBody) => Promise<CreditCardPublic>;
  withdrawCreditCard: (
    cardId: string,
    body: CreditCardWithdrawBody,
  ) => Promise<CreditCardPublic>;
  executeHandler: (body: ExecuteHandlerBody) => Promise<ExecuteHandlerResponse>;
  /** `POST /users/me/chat` — response shape is service-specific (differs from `/agents/:key/chat`). */
  chat: (params: BeamUsersMeChatParams) => Promise<unknown>;
};

export function createBeamUsersApi(http: BeamHttpClient): BeamUsersApi {
  return {
    getMe: () =>
      http.requestJson("GET", "/users/me", {
        parse: publicUserSchema,
      }) as Promise<PublicUser>,
    updateMe: (body) =>
      http.requestJson("PATCH", "/users/me", {
        body: updateUserBodySchema.parse(body),
        parse: publicUserSchema,
      }) as Promise<PublicUser>,
    uploadFile: (file) => {
      const fd = new FormData();
      fd.append(USER_UPLOAD_FIELD, file, file.name);
      return http.requestFormData("POST", "/users/me/files", fd, userUploadResultSchema);
    },
    listConversations: (query) => {
      const q = conversationsQuerySchema.parse(query ?? {});
      return http.requestJson("GET", "/users/me/conversations", {
        query: {
          limit: q.limit,
          ...(q.cursor ? { cursor: q.cursor } : {}),
        },
        parse: conversationsPageResponseSchema,
      });
    },
    createConversation: (body) =>
      http.requestJson("POST", "/users/me/conversations", {
        body: createConversationBodySchema.parse(body),
        parse: conversationSummarySchema,
      }),
    deleteConversation: (conversationId) =>
      http.requestJson(
        "DELETE",
        `/users/me/conversations/${encodeURIComponent(conversationId)}`,
        { parse: deleteConversationResponseSchema },
      ),
    chatMessages: (query) => {
      const q = chatHistoryQuerySchema.parse(query ?? {});
      return http.requestJson("GET", "/users/me/chat/messages", {
        query: {
          limit: q.limit,
          ...(q.conversationId ? { conversationId: q.conversationId } : {}),
          ...(q.cursor ? { cursor: q.cursor } : {}),
        },
        parse: chatHistoryResponseSchema,
      });
    },
    listCreditCards: () =>
      http.requestJson("GET", "/users/me/credit-cards", {
        parse: creditCardsListResponseSchema,
      }),
    creditCardFundQuote: (query) => {
      const q = creditCardFundQuoteQuerySchema.parse(query);
      return http.requestJson("GET", "/users/me/credit-cards/fund-quote", {
        query: { amountCents: q.amountCents },
        parse: creditCardFundQuoteResponseSchema,
      });
    },
    creditCardSensitiveDetails: (cardId) =>
      http.requestJson(
        "GET",
        `/users/me/credit-cards/${encodeURIComponent(cardId)}/details`,
        { parse: creditCardSensitiveDetailsSchema },
      ),
    listPaymentRequests: (query) => {
      const q = mePaymentRequestsQuerySchema.parse(query ?? {});
      return http.requestJson("GET", "/users/me/payment-requests", {
        query: { limit: q.limit },
        parse: paymentRequestsListResponseSchema,
      });
    },
    listOnRamps: (query) => {
      const q = meOnRampsQuerySchema.parse(query ?? {});
      return http.requestJson("GET", "/users/me/on-ramps", {
        query: { limit: q.limit },
        parse: onRampsListResponseSchema,
      });
    },
    getKycStatus: () =>
      http.requestJson("GET", "/users/me/kyc-status", {
        parse: userKycStatusDocumentSchema,
      }),
    fundCreditCard: (cardId, body) =>
      http.requestJson(
        "POST",
        `/users/me/credit-cards/${encodeURIComponent(cardId)}/fund`,
        {
          body: creditCardFundBodySchema.parse(body),
          parse: creditCardPublicSchema,
        },
      ),
    withdrawCreditCard: (cardId, body) =>
      http.requestJson(
        "POST",
        `/users/me/credit-cards/${encodeURIComponent(cardId)}/withdraw`,
        {
          body: creditCardWithdrawBodySchema.parse(body),
          parse: creditCardPublicSchema,
        },
      ),
    executeHandler: (body) =>
      http.requestJson("POST", "/users/me/chat/execute-handler", {
        body: executeHandlerBodySchema.parse(body),
        parse: executeHandlerResponseSchema,
      }),
    chat: async (params) => {
      const hasFiles = (params.files?.length ?? 0) > 0;
      if (hasFiles) {
        const fd = new FormData();
        fd.append("message", params.message ?? "");
        fd.append("agentId", String(params.agentId));
        if (params.conversationId) {
          fd.append("conversationId", params.conversationId);
        }
        for (const f of params.files ?? []) {
          fd.append("files", f, f.name);
        }
        return http.requestFormData("POST", "/users/me/chat", fd);
      }
      return http.requestJson("POST", "/users/me/chat", {
        body: {
          message: params.message,
          agentId: params.agentId,
          ...(params.conversationId ? { conversationId: params.conversationId } : {}),
        },
      });
    },
  };
}
