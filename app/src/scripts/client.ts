import axios from "axios";
import type {
  ChatResponse,
  CreateEncryptedMetadataResponse,
} from "@/types/app";

export interface ClientApi {
  client: ReturnType<typeof axios.create>;
  sendChat(
    agentId: number,
    message: string,
    network?: string,
    providerAddress?: string,
  ): Promise<ChatResponse>;
  createEncryptedMetadata(
    metadataValue: string,
  ): Promise<CreateEncryptedMetadataResponse>;
}

export const Client: ClientApi = {
  client: axios.create({ baseURL: import.meta.env.VITE_CLIENT_URL }),

  async sendChat(
    agentId: number,
    message: string,
    network?: string,
    providerAddress?: string,
  ): Promise<ChatResponse> {
    try {
      const response = await this.client.post(`/agents/${agentId}/chat`, {
        message,
        network,
        providerAddress,
      });
      return response.data;
    } catch {
      return {
        type: "text",
        content: "Failed to send chat",
      };
    }
  },

  async createEncryptedMetadata(
    metadataValue: string,
  ): Promise<CreateEncryptedMetadataResponse> {
    try {
      const response = await this.client.post(`/agents/metadata`, {
        metadataValue,
      });
      return response.data;
    } catch {
      return {
        rootHash: "",
        txHash: "",
      };
    }
  },
};
