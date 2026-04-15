import axios, { type AxiosInstance } from "axios";
import { wrapAxiosWithPayment } from "@x402/axios";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { getWalletClient } from "@wagmi/core";
import { config } from "@/scripts/config";
import { useAuthStore } from "@/stores/auth";

export type AgentChatResponse = {
  type: "text" | "x402" | "transaction";
  content: string;
  error?: string;
  compute?: {
    model?: string;
    verified?: boolean;
    chatId?: string;
    provider?: string;
    computeNetwork?: string;
  };
};

export type AgentChatPreviousMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CreateTransactionPayload =
  | {
      kind: "onetime";
      merchant: string;
      token: string;
      amount: string;
      description?: string;
      splitPayment?: boolean;
    }
  | {
      kind: "recurrent";
      merchant: string;
      subscriptionId: string;
      description?: string;
    };

export type TransactionView = {
  id: string;
  kind: "onetime" | "recurrent";
  merchant: string;
  token?: string;
  amount?: string;
  description?: string;
  splitPayment?: boolean;
  subscriptionId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function createApiClient(isX402: boolean): Promise<AxiosInstance> {

  const auth = useAuthStore();
  const base = axios.create({ baseURL: import.meta.env.VITE_CLIENT_URL });
  if (auth.accessToken) {
    console.log("auth.accessToken", auth.accessToken);
    base.defaults.headers.common.Authorization = `Bearer ${auth.accessToken}`;
  }
  base.defaults.withCredentials = true;

  if (!isX402) return base;

    const walletClient = await getWalletClient(config);
  const account = walletClient?.account;

  const evmSigner = {
    address: account.address,
    async signTypedData(args: any) {
      return walletClient.signTypedData({
        ...(args ?? {}),
        account,
      });
    },
  } as any;

  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(evmSigner));
  return wrapAxiosWithPayment(base, client);
}

export type AuthChallengeResponse = { message: string };
export type AuthVerifyResponse = { accessToken: string };

export type VirtualCardSummary = {
  walletAddress: string;
  stripeCardId: string;
  stripeCardholderId: string;
  status: string | null;
  last4: string | null;
  brand: string | null;
  expMonth: number | null;
  expYear: number | null;
  cardholderName?: string | null;
  billingAddress?: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
  } | null;
};

export type CreateVirtualCardBody = {
  name?: string;
  email?: string;
  phone?: string;
  termsAcceptance?: {
    ip?: string;
    userAgent?: string;
  };
};

export type CreateIssuingEphemeralKeyResponse = { ephemeralKeySecret: string };

export class ClientApi {
  async authChallenge(walletAddress: string): Promise<AuthChallengeResponse> {
    const client = await createApiClient(false);
    const response = await client.post(`/auth/challenge`, { walletAddress });
    return response.data;
  }

  async authVerify(params: {
    walletAddress: string;
    message: string;
    signature: string;
    setCookie?: boolean;
  }): Promise<AuthVerifyResponse> {
    const client = await createApiClient(false);
    const response = await client.post(`/auth/verify`, {
      ...params,
      setCookie: params.setCookie ?? false,
    });
    return response.data;
  }

  async getVirtualCard(params?: {
    refresh?: boolean;
  }): Promise<{ card: VirtualCardSummary | null }> {
    console.log("getVirtualCard", params);
    const client = await createApiClient(false);
    const refresh = params?.refresh ?? true;
    const response = await client.get(`/issuing/card`, {
      params: { refresh: refresh ? "1" : "0" },
    });
    console.log("getVirtualCard response", response.data);
    return response.data;
  }

  async revealVirtualCard(): Promise<{
    card: { pan: string | null; cvc: string | null } | null;
  }> {
    const client = await createApiClient(false);
    const response = await client.get(`/issuing/card/reveal`);
    return response.data;
  }

  async setVirtualCardFrozen(body: {
    frozen: boolean;
  }): Promise<{ card: VirtualCardSummary | null }> {
    const client = await createApiClient(false);
    const response = await client.post(`/issuing/card/freeze`, body);
    return response.data;
  }

  async ensureVirtualCard(
    body?: CreateVirtualCardBody,
  ): Promise<{ card: VirtualCardSummary }> {
    console.log("ensureVirtualCard", body);
    const client = await createApiClient(false);
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent ?? "" : "";
    const response = await client.post(`/issuing/virtual-card`, {
      ...(body ?? {}),
      termsAcceptance: {
        ...((body ?? {}).termsAcceptance ?? {}),
        userAgent,
      },
    });
    return response.data;
  }

  async createIssuingEphemeralKey(body: {
    cardId: string;
    nonce: string;
  }): Promise<CreateIssuingEphemeralKeyResponse> {
    const client = await createApiClient(false);
    const response = await client.post(`/issuing/ephemeral-keys`, body);
    return response.data;
  }

  async chatWithAgent(params: {
    agentId: number;
    message: string;
    network?: string;
    userAddress?: string;
    providerAddress?: string;
    previousMessages?: AgentChatPreviousMessage[];
  }): Promise<AgentChatResponse> {
    const client = await createApiClient(false);
    const { agentId, ...body } = params;
    const response = await client.post(`/agents/${agentId}/chat`, body);
    return response.data;
  }

  async viewTransaction(id: string): Promise<TransactionView> {
    const client = await createApiClient(false);
    const response = await client.get(
      `/transaction/view/${encodeURIComponent(id)}`,
    );
    return response.data;
  }

  async viewResource(resourceId: string) {
    const client = await createApiClient(false);
    const response = await client.get(`/resource/view/${resourceId}`);
    return response.data;
  }

  async payResource(resourceId: string) {
    const client = await createApiClient(true);
    const response = await client.get(`/resource/pay/${resourceId}`);
    return response.data;
  }
}

let _clientApi: ClientApi | null = null;
export function getClientApi(): ClientApi {
  if (!_clientApi) _clientApi = new ClientApi();
  return _clientApi;
}
