import {
  stardormChatSuccessSchema,
  type StardormChatSuccess,
} from "@railbeam/stardorm-api-contract";
import type { ZodType } from "zod";
import type { BeamHttpClient } from "../http.js";

const parseChatSuccess = stardormChatSuccessSchema as ZodType<StardormChatSuccess>;

export type BeamAgentsChatParams = {
  agentKey: string;
  message: string;
  conversationId?: string;
  /** Browser `File` parts; sent as multipart form-data (parity with `POST /agents/:agentKey/chat`). */
  files?: readonly File[];
};

export type BeamAgentsApi = {
  chat: (params: BeamAgentsChatParams) => Promise<StardormChatSuccess>;
};

export function createBeamAgentsApi(http: BeamHttpClient): BeamAgentsApi {
  return {
    chat: async (params) => {
      const path = `/agents/${encodeURIComponent(params.agentKey)}/chat`;
      const hasFiles = (params.files?.length ?? 0) > 0;
      if (hasFiles) {
        const fd = new FormData();
        fd.append("message", params.message ?? "");
        if (params.conversationId) {
          fd.append("conversationId", params.conversationId);
        }
        for (const f of params.files ?? []) {
          fd.append("files", f, f.name);
        }
        return http.requestFormData("POST", path, fd, parseChatSuccess);
      }
      return http.requestJson("POST", path, {
        body: {
          message: params.message,
          ...(params.conversationId ? { conversationId: params.conversationId } : {}),
        },
        parse: parseChatSuccess,
      });
    },
  };
}
