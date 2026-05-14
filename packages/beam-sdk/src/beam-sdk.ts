import { createBeamAgentsApi } from "./api/agents.js";
import { createBeamAuthApi, type BeamAuthApi } from "./api/auth.js";
import { createBeamHandlersApi, type BeamHandlersApi } from "./api/handlers.js";
import { createBeamPaymentsApi, type BeamPaymentsApi } from "./api/payments.js";
import { createBeamStorageApi, type BeamStorageApi } from "./api/storage.js";
import { createBeamUsersApi, type BeamUsersApi } from "./api/users.js";
import { BeamChainModule } from "./chain/beam-chain.js";
import type { BeamNetworkId } from "./config.js";
import { BeamHttpClient } from "./http.js";
import {
  resolveBeamRuntime,
  type BeamSdkRuntimeOverrides,
} from "./presets.js";
import { BeamSubgraphClient } from "./subgraph/subgraph-client.js";
import type { SubgraphAgent, SubgraphFeedback, SubgraphValidation } from "./subgraph/types.js";
import type { UserKycStatusDocument } from "@beam/stardorm-api-contract";
import {
  buildBeamConversationsWebSocketUrl,
  connectBeamConversationSync,
  type BeamConversationSyncConnection,
  type ConnectBeamConversationSyncOptions,
} from "./realtime/conversation-sync.js";

export type BeamSdkOptions = {
  /** Selects RPC, indexer URL, HTTP API origin, and registry addresses from `BEAM_NETWORK_PRESETS`. */
  network: BeamNetworkId;
  /** Custom `fetch` (Node 18+, browsers, undici, etc.). */
  fetch?: typeof fetch;
  /** Restore an existing JWT session. */
  accessToken?: string;
  /**
   * Override the canonical 0G chain id from the preset (advanced).
   * Defaults to the chain id bundled for `network`.
   */
  chainId?: number;
  /** Maintainer / fork escape hatch — overrides baked-in `BEAM_NETWORK_PRESETS`. */
  overrides?: BeamSdkRuntimeOverrides;
};

export type BeamSubgraphApi = {
  agents: (page: number, pageSize: number) => Promise<SubgraphAgent[]>;
  agentByEntityId: (id: string) => Promise<SubgraphAgent | null>;
  agentByChainAgentId: (
    agentId: bigint | number | string,
  ) => Promise<SubgraphAgent | null>;
  feedbacksByAgentId: (
    agentId: bigint | number | string,
    opts?: { first?: number; skip?: number },
  ) => Promise<SubgraphFeedback[]>;
  validationsByAgentId: (
    agentId: bigint | number | string,
    opts?: { first?: number; skip?: number },
  ) => Promise<SubgraphValidation[]>;
  validationByRequestHash: (requestHash: string) => Promise<SubgraphValidation | null>;
};

export type BeamKycApi = {
  /** `GET /users/me/kyc-status` (requires Bearer token). */
  get: () => Promise<UserKycStatusDocument>;
};

export type BeamRealtimeApi = {
  /**
   * WebSocket URL for `/ws/conversations` with `?token=` (same host and pathname prefix as the HTTP API).
   */
  conversationsWebSocketUrl: (accessToken?: string) => string;
  /**
   * Subscribe to server push for conversation / thread invalidation. Reconnects with exponential backoff
   * unless `reconnect: false` or the server closes with 4401 (unauthorized JWT).
   */
  connectConversationSync: (
    opts: Omit<ConnectBeamConversationSyncOptions, "url"> & { accessToken?: string },
  ) => BeamConversationSyncConnection;
};

export class BeamSdk {
  readonly network: BeamNetworkId;

  readonly chainId: number;

  /** On-chain reads + writes against the Stardorm EIP-8004 registries (viem). */
  readonly chain: BeamChainModule;

  readonly auth: BeamAuthApi;

  readonly agents: ReturnType<typeof createBeamAgentsApi>;

  readonly users: BeamUsersApi;

  readonly payments: BeamPaymentsApi;

  readonly handlers: BeamHandlersApi;

  readonly storage: BeamStorageApi;

  readonly kyc: BeamKycApi;

  readonly subgraph: BeamSubgraphApi;

  readonly realtime: BeamRealtimeApi;

  private accessToken: string | undefined;

  private readonly http: BeamHttpClient;

  private readonly fetchImpl: typeof fetch;

  private readonly resolved: ReturnType<typeof resolveBeamRuntime>;

  private subgraphClient: BeamSubgraphClient | undefined;

  constructor(private readonly options: BeamSdkOptions) {
    this.network = options.network;
    this.resolved = resolveBeamRuntime(options.network, {
      ...options.overrides,
      ...(options.chainId !== undefined ? { chainId: options.chainId } : {}),
    });
    this.chainId = this.resolved.chainId;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.accessToken = options.accessToken;

    this.chain = new BeamChainModule(this.resolved);

    this.http = new BeamHttpClient({
      baseUrl: this.resolved.apiBaseUrl,
      chainId: this.chainId,
      getAccessToken: () => this.accessToken,
      fetchImpl: this.fetchImpl,
    });

    this.auth = createBeamAuthApi(this.http, (t) => {
      this.accessToken = t;
    });
    this.agents = createBeamAgentsApi(this.http);
    this.users = createBeamUsersApi(this.http);
    this.payments = createBeamPaymentsApi(this.http);
    this.handlers = createBeamHandlersApi(this.http);
    this.storage = createBeamStorageApi(this.http);
    this.kyc = {
      get: () => this.users.getKycStatus(),
    };
    this.subgraph = {
      agents: (page, pageSize) =>
        this.requireSubgraph().agents(page, pageSize),
      agentByEntityId: (id) => this.requireSubgraph().agentByEntityId(id),
      agentByChainAgentId: (agentId) =>
        this.requireSubgraph().agentByChainAgentId(agentId),
      feedbacksByAgentId: (agentId, opts) =>
        this.requireSubgraph().feedbacksByAgentId(agentId, opts),
      validationsByAgentId: (agentId, opts) =>
        this.requireSubgraph().validationsByAgentId(agentId, opts),
      validationByRequestHash: (hash) =>
        this.requireSubgraph().validationByRequestHash(hash),
    };

    this.realtime = {
      conversationsWebSocketUrl: (token) => {
        const t = (token ?? this.accessToken)?.trim();
        if (!t) {
          throw new Error(
            "BeamSdk.realtime.conversationsWebSocketUrl: missing access token. " +
              "Call `setAccessToken`, pass `accessToken` to the constructor, or pass a token argument.",
          );
        }
        return buildBeamConversationsWebSocketUrl(this.resolved.apiBaseUrl, t);
      },
      connectConversationSync: (opts) => {
        const { accessToken: tokenOverride, ...rest } = opts;
        const t = (tokenOverride ?? this.accessToken)?.trim();
        if (!t) {
          throw new Error(
            "BeamSdk.realtime.connectConversationSync: missing access token. " +
              "Set the session token first or pass `accessToken` in the options object.",
          );
        }
        const url = buildBeamConversationsWebSocketUrl(this.resolved.apiBaseUrl, t);
        return connectBeamConversationSync({ url, ...rest });
      },
    };
  }

  private requireSubgraph(): BeamSubgraphClient {
    const url = this.resolved.subgraphUrl;
    if (!url) {
      throw new Error(
        "BeamSdk: `subgraphUrl` is empty in BEAM_NETWORK_PRESETS for this network. " +
          "Deploy the subgraph and paste the GraphQL HTTP URL into packages/beam-sdk/src/presets.ts, " +
          "or pass `overrides.subgraphUrl` when constructing BeamSdk.",
      );
    }
    if (!this.subgraphClient) {
      this.subgraphClient = new BeamSubgraphClient({
        url,
        fetchImpl: this.fetchImpl,
      });
    }
    return this.subgraphClient;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  getAccessToken(): string | undefined {
    return this.accessToken;
  }
}
