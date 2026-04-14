import { Buffer } from "buffer";
import axios from "axios";
import type {
  ChatResponse,
  CreateEncryptedMetadataResponse,
  CreateX402FileMetaPayload,
  CreateX402LinkPayload,
  CreateTransactionPayload,
  TransactionView,
  X402ResourceView,
} from "@/types/app";
import type { AxiosResponse } from "axios";

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
  download(rootHash: string): Promise<Buffer | null>;
  createLink(payload: CreateX402LinkPayload): Promise<X402ResourceView>;
  uploadFile(
    file: File,
    meta: CreateX402FileMetaPayload,
  ): Promise<X402ResourceView>;
  viewResource(resourceId: string): Promise<X402ResourceView>;
  payResource(
    resourceId: string,
  ): Promise<AxiosResponse<ArrayBuffer, any>>;
  createTransaction(payload: CreateTransactionPayload): Promise<TransactionView>;
  viewTransaction(id: string): Promise<TransactionView>;
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

  async download(rootHash: string): Promise<Buffer | null> {
    try {
      const response = await this.client.get(`/storage/${rootHash}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async createLink(payload: CreateX402LinkPayload): Promise<X402ResourceView> {
    const response = await this.client.post<X402ResourceView>(
      `/resource/link`,
      payload,
    );
    return response.data;
  },

  async uploadFile(
    file: File,
    meta: CreateX402FileMetaPayload,
  ): Promise<X402ResourceView> {
    const form = new FormData();
    form.append("file", file);
    form.append("amount", String(meta.amount));
    form.append("currency", meta.currency);
    form.append("network", meta.network);
    form.append("payTo", meta.payTo);
    if (meta.asset?.trim()) {
      form.append("asset", meta.asset.trim());
    }
    if (meta.title?.trim()) {
      form.append("title", meta.title.trim());
    }
    const response = await this.client.post<X402ResourceView>(
      `/resource/file`,
      form,
    );
    return response.data;
  },

  async viewResource(resourceId: string): Promise<X402ResourceView> {
    const response = await this.client.get<X402ResourceView>(
      `/resource/view/${resourceId}`,
    );
    return response.data;
  },

  async payResource(resourceId: string): Promise<AxiosResponse<ArrayBuffer, any>> {
    return this.client.get<ArrayBuffer>(`/resource/pay/${resourceId}`, {
      responseType: "arraybuffer",
      validateStatus: (s) =>
        (s >= 200 && s < 300) || s === 402 || s === 400 || s === 403,
    });
  },

  async createTransaction(payload: CreateTransactionPayload): Promise<TransactionView> {
    const response = await this.client.post<TransactionView>(`/transaction/create`, payload);
    return response.data;
  },

  async viewTransaction(id: string): Promise<TransactionView> {
    const response = await this.client.get<TransactionView>(`/transaction/view/${id}`);
    return response.data;
  },
};
