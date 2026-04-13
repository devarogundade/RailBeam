import axios from "axios";
import type {
  Chat,
  ClientMerchant,
  CreateMerchant,
  UpdateWebhooks,
  Plan,
} from "./types";
import type { Hex } from "viem";
import type { Transaction } from "beam-ts";
import { beamSdk } from "./beamSdk";

export const Client = {
  client: axios.create({ baseURL: import.meta.env.VITE_CLIENT_URL }),

  async getMerchant(merchant: Hex): Promise<ClientMerchant | null> {
    try {
      const response = await this.client.get(`/merchants/${merchant}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async createMerchant(params: CreateMerchant): Promise<ClientMerchant | null> {
    try {
      const response = await this.client.post(`/merchants/create`, params);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async updateWebhooks(params: UpdateWebhooks): Promise<ClientMerchant | null> {
    try {
      const response = await this.client.post(
        `/merchants/update-webhooks`,
        params
      );
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async getPlans(merchant: Hex): Promise<Plan[]> {
    const list = await beamSdk.merchant.getPlans(merchant);
    return list as unknown as Plan[];
  },

  async getPlan(id: string): Promise<Plan | null> {
    const p = await beamSdk.merchant.getPlan(id);
    return p as unknown as Plan | null;
  },

  async getRecurrentTransactions(merchant: Hex): Promise<Transaction[]> {
    return beamSdk.recurrentTransaction.getRecurrentTransactions({
      merchant,
      page: 1,
      limit: 1000,
    });
  },

  async sendChat(merchant: Hex, text: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/chat`, {
        merchant,
        message: text,
      });
      return response.data;
    } catch (error) {
      return false;
    }
  },

  async getChats(merchant: Hex): Promise<Chat[]> {
    try {
      const response = await this.client.get(`/chats/${merchant}`);
      return response.data;
    } catch (error) {
      return [];
    }
  },
};
