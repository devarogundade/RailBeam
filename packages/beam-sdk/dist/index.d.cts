import { StardormChatSuccess, AuthVerifyResponse, AuthChallengeResponse, AuthVerifyBody, AuthMeResponse, HandlersListResponse, PublicPaymentRequest, PaymentSettlementBody, StorageUploadBody, StorageUploadResponse, PublicUser, UpdateUserBody, UserUploadResult, ConversationsQuery, ConversationsPageResponse, CreateConversationBody, ConversationSummary, DeleteConversationResponse, ChatHistoryQuery, ChatHistoryResponse, CreditCardsListResponse, CreditCardFundQuoteQuery, CreditCardFundQuoteResponse, CreditCardSensitiveDetails, MePaymentRequestsQuery, PaymentRequestsListResponse, MeOnRampsQuery, OnRampsListResponse, UserKycStatusDocument, CreditCardFundBody, CreditCardPublic, CreditCardWithdrawBody, ExecuteHandlerBody, ExecuteHandlerResponse } from '@railbeam/stardorm-api-contract';
import { ZodType } from 'zod';
import { Hex, Address, PublicClient, Transport, Chain, Account } from 'viem';
import { PrivateKeyAccount } from 'viem/accounts';

type BeamHttpClientOptions = {
    baseUrl: string;
    /** Sent as `X-Beam-Chain-Id` on every request (backend / facilitator parity). */
    chainId: number;
    getAccessToken: () => string | undefined;
    fetchImpl: typeof fetch;
};
declare class BeamHttpClient {
    private readonly opts;
    constructor(opts: BeamHttpClientOptions);
    get chainId(): number;
    private headers;
    requestJson<T>(method: string, path: string, opts?: {
        query?: Record<string, string | number | boolean | undefined | null>;
        body?: unknown;
        parse?: ZodType<T>;
    }): Promise<T>;
    requestFormData<T>(method: string, path: string, form: FormData, parse?: ZodType<T>): Promise<T>;
    requestBinary(method: string, path: string): Promise<ArrayBuffer>;
}

type BeamAgentsChatParams = {
    agentKey: string;
    message: string;
    conversationId?: string;
    /** Browser `File` parts; sent as multipart form-data (parity with `POST /agents/:agentKey/chat`). */
    files?: readonly File[];
};
type BeamAgentsApi = {
    chat: (params: BeamAgentsChatParams) => Promise<StardormChatSuccess>;
};
declare function createBeamAgentsApi(http: BeamHttpClient): BeamAgentsApi;

/**
 * Local EOA from a hex private key (0x-prefixed). Compatible with `sdk.auth(…)`.
 */
declare function accountFromPrivateKey(privateKey: Hex): PrivateKeyAccount;
/** Any account that can `personal_sign` the auth challenge message. */
type BeamSignableWallet = Pick<PrivateKeyAccount, "address" | "signMessage">;

type BeamAuthApi = {
    (wallet: BeamSignableWallet): Promise<AuthVerifyResponse>;
    challenge: (walletAddress: string) => Promise<AuthChallengeResponse>;
    verify: (body: AuthVerifyBody) => Promise<AuthVerifyResponse>;
    me: () => Promise<AuthMeResponse>;
};

type BeamHandlersApi = {
    list: () => Promise<HandlersListResponse>;
    invoke: (handleId: string, body: unknown) => Promise<unknown>;
};

type BeamPaymentsApi = {
    /** Public checkout row (`GET /payments/:id`). */
    get: (id: string) => Promise<PublicPaymentRequest>;
    /** Records on-chain settlement (`POST /payments/:id/pay`). */
    pay: (id: string, body: PaymentSettlementBody) => Promise<PublicPaymentRequest>;
};

type BeamStorageApi = {
    /** `GET /storage/:rootHash` — raw bytes from 0G Storage relay. */
    download: (rootHash: string) => Promise<ArrayBuffer>;
    /** Authenticated small-string upload (`POST /storage/upload`). */
    upload: (body: StorageUploadBody) => Promise<StorageUploadResponse>;
};

type BeamUsersMeChatParams = {
    agentId: bigint | number | string;
    message: string;
    conversationId?: string;
    files?: readonly File[];
};
type BeamUsersApi = {
    getMe: () => Promise<PublicUser>;
    updateMe: (body: UpdateUserBody) => Promise<PublicUser>;
    uploadFile: (file: File) => Promise<UserUploadResult>;
    listConversations: (query?: ConversationsQuery) => Promise<ConversationsPageResponse>;
    createConversation: (body: CreateConversationBody) => Promise<ConversationSummary>;
    deleteConversation: (conversationId: string) => Promise<DeleteConversationResponse>;
    chatMessages: (query?: ChatHistoryQuery) => Promise<ChatHistoryResponse>;
    listCreditCards: () => Promise<CreditCardsListResponse>;
    creditCardFundQuote: (query: CreditCardFundQuoteQuery) => Promise<CreditCardFundQuoteResponse>;
    creditCardSensitiveDetails: (cardId: string) => Promise<CreditCardSensitiveDetails>;
    listPaymentRequests: (query?: MePaymentRequestsQuery) => Promise<PaymentRequestsListResponse>;
    listOnRamps: (query?: MeOnRampsQuery) => Promise<OnRampsListResponse>;
    getKycStatus: () => Promise<UserKycStatusDocument>;
    fundCreditCard: (cardId: string, body: CreditCardFundBody) => Promise<CreditCardPublic>;
    withdrawCreditCard: (cardId: string, body: CreditCardWithdrawBody) => Promise<CreditCardPublic>;
    executeHandler: (body: ExecuteHandlerBody) => Promise<ExecuteHandlerResponse>;
    /** `POST /users/me/chat` — response shape is service-specific (differs from `/agents/:key/chat`). */
    chat: (params: BeamUsersMeChatParams) => Promise<unknown>;
};

/** Logical Beam / 0G deployment tier (matches app `BeamNetworkId`). */
type BeamNetworkId = "mainnet" | "testnet";
declare const BEAM_NETWORK_DEFAULT_EVM_CHAIN_ID: Record<BeamNetworkId, number>;
declare function defaultEvmChainIdForNetwork(network: BeamNetworkId): number;

/**
 * Canonical Beam / Stardorm defaults per logical network.
 * Update `subgraphUrl` here after you deploy the indexer (Goldsky, Graph Node, etc.).
 *
 * Contract addresses match `smart-contracts/ignition/deployments/` for 0G mainnet (16661)
 * and 0G testnet (16602).
 */
type BeamDeployedContracts = {
    identityRegistry: `0x${string}`;
    reputationRegistry: `0x${string}`;
    validationRegistry: `0x${string}`;
};
type BeamNetworkPreset = {
    /** 0G EVM chain id */
    chainId: number;
    /** Public JSON-RPC for `viem` transports */
    rpcUrl: string;
    /** Stardorm HTTP API origin (no trailing slash) */
    apiBaseUrl: string;
    /**
     * GraphQL HTTP endpoint for the Beam subgraph.
     * Leave empty until a public indexer URL exists; `sdk.subgraph` throws until set.
     */
    subgraphUrl: string;
    contracts: BeamDeployedContracts;
};
declare const BEAM_NETWORK_PRESETS: Record<BeamNetworkId, BeamNetworkPreset>;
type BeamResolvedRuntime = BeamNetworkPreset & {
    network: BeamNetworkId;
};
type BeamSdkRuntimeOverrides = {
    apiBaseUrl?: string;
    rpcUrl?: string;
    subgraphUrl?: string;
    chainId?: number;
    contracts?: Partial<BeamDeployedContracts>;
};
declare function resolveBeamRuntime(network: BeamNetworkId, overrides?: BeamSdkRuntimeOverrides): BeamResolvedRuntime;

type BeamMetadataEntry = {
    metadataKey: string;
    metadataValue: `0x${string}`;
};
type BeamChainReadApi = {
    identity: {
        ownerOf: (tokenId: bigint) => Promise<Address>;
        tokenURI: (tokenId: bigint) => Promise<string>;
        getAgentWallet: (agentId: bigint) => Promise<Address>;
        getFees: (agentId: bigint) => Promise<bigint>;
        getMetadata: (agentId: bigint, metadataKey: string) => Promise<`0x${string}`>;
    };
    reputation: {
        getSummary: (agentId: bigint, clientAddresses: readonly Address[], tag1: string, tag2: string) => Promise<{
            count: bigint;
            summaryValue: bigint;
            summaryValueDecimals: number;
        }>;
        getLastIndex: (agentId: bigint, clientAddress: Address) => Promise<bigint>;
    };
    validation: {
        getValidationStatus: (requestHash: `0x${string}`) => Promise<{
            validatorAddress: Address;
            agentId: bigint;
            response: number;
            responseHash: `0x${string}`;
            tag: string;
            lastUpdate: bigint;
        }>;
        getSummary: (agentId: bigint, validatorAddresses: readonly Address[], tag: string) => Promise<{
            count: bigint;
            averageResponse: number;
        }>;
    };
};
type BeamChainIdentityWrites = {
    /** `register()` — mints an agent with empty URI. */
    register: () => Promise<`0x${string}`>;
    /** `register(string)` — mints with `agentURI`. */
    registerWithUri: (agentURI: string) => Promise<`0x${string}`>;
    registerWithMetadataAndFees: (agentURI: string, metadata: readonly BeamMetadataEntry[], feesPerDay: bigint) => Promise<`0x${string}`>;
    setAgentURI: (agentId: bigint, newURI: string) => Promise<`0x${string}`>;
    setMetadata: (agentId: bigint, metadataKey: string, metadataValue: `0x${string}`) => Promise<`0x${string}`>;
    unsetAgentWallet: (agentId: bigint) => Promise<`0x${string}`>;
    setAgentWallet: (agentId: bigint, newWallet: Address, deadline: bigint, signature: `0x${string}`) => Promise<`0x${string}`>;
    /** ERC-7857 transfer (not ERC-721 `transferFrom`). */
    transfer: (from: Address, to: Address, tokenId: bigint, sealedKey: `0x${string}`, proof: `0x${string}`) => Promise<`0x${string}`>;
    clone: (to: Address, tokenId: bigint, sealedKey: `0x${string}`, proof: `0x${string}`) => Promise<`0x${string}`>;
    subscribe: (agentId: bigint, numDays: bigint, opts?: {
        value?: bigint;
    }) => Promise<`0x${string}`>;
    unsubscribe: (agentId: bigint) => Promise<`0x${string}`>;
    setFees: (agentId: bigint, feePerDay: bigint) => Promise<`0x${string}`>;
    transferFrom: (from: Address, to: Address, tokenId: bigint) => Promise<`0x${string}`>;
    safeTransferFrom: (from: Address, to: Address, tokenId: bigint) => Promise<`0x${string}`>;
    approve: (to: Address, tokenId: bigint) => Promise<`0x${string}`>;
    setApprovalForAll: (operator: Address, approved: boolean) => Promise<`0x${string}`>;
};
type BeamChainReputationWrites = {
    giveFeedback: (args: {
        agentId: bigint;
        value: bigint;
        valueDecimals: number;
        tag1: string;
        tag2: string;
        endpoint: string;
        feedbackURI: string;
        feedbackHash: `0x${string}`;
    }) => Promise<`0x${string}`>;
    revokeFeedback: (agentId: bigint, feedbackIndex: bigint) => Promise<`0x${string}`>;
    appendResponse: (agentId: bigint, clientAddress: Address, feedbackIndex: bigint, responseURI: string, responseHash: `0x${string}`) => Promise<`0x${string}`>;
};
type BeamChainValidationWrites = {
    validationRequest: (validatorAddress: Address, agentId: bigint, requestURI: string, requestHash: `0x${string}`) => Promise<`0x${string}`>;
    /** `response` must be 0–100 (validator-only). */
    validationResponse: (requestHash: `0x${string}`, response: number, responseURI: string, responseHash: `0x${string}`, tag: string) => Promise<`0x${string}`>;
};
type BeamChainWriteApi = {
    identity: BeamChainIdentityWrites;
    reputation: BeamChainReputationWrites;
    validation: BeamChainValidationWrites;
};
declare class BeamChainModule {
    readonly addresses: BeamResolvedRuntime["contracts"];
    readonly publicClient: PublicClient<Transport, Chain>;
    readonly read: BeamChainReadApi;
    private readonly runtime;
    constructor(runtime: BeamResolvedRuntime);
    /** Wallet / local account writes (gas on the caller). */
    forAccount(account: Account): BeamChainWriteApi;
}

type SubgraphAgent = {
    id: string;
    agentId: number;
    owner: string;
    uri: string | null;
    agentWallet: string | null;
    /** Raw wei string from subgraph BigInt */
    feePerDay: string | null;
    isCloned: boolean;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
    metadata: SubgraphAgentMetadata[];
};
type SubgraphAgentMetadata = {
    id: string;
    agentId: number;
    key: string;
    value: string;
    updatedBy: string;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
};
type SubgraphFeedback = {
    id: string;
    agentId: number;
    clientAddress: string;
    feedbackIndex: string;
    value: string;
    valueDecimals: number;
    tag1: string;
    tag2: string;
    endpoint: string;
    feedbackURI: string;
    feedbackHash: string;
    revoked: boolean;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
};
type SubgraphValidation = {
    id: string;
    requestHash: string;
    validatorAddress: string;
    agentId: number;
    requestURI: string;
    response: number | null;
    responseURI: string | null;
    responseHash: string | null;
    tag: string | null;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
};

/**
 * Stardorm `/ws/conversations` — JSON text frames (see `backend/conversation-sync.events.ts`).
 * Auth: JWT in `?token=` (browsers cannot set `Authorization` on WebSocket handshakes).
 */
/** Mirrors backend `ConversationSyncPayload`. */
type BeamConversationSyncPayload = {
    v: 1;
    op: "thread";
    conversationId: string;
} | {
    v: 1;
    op: "conversations";
} | {
    v: 1;
    op: "conversation_deleted";
    conversationId: string;
};
/** Backend closes with 4401 when JWT is missing or invalid. */
declare const BEAM_WS_CLOSE_UNAUTHORIZED = 4401;
/**
 * Builds `ws:` / `wss:` URL for `/ws/conversations` on the same origin as the HTTP API,
 * with `?token=<JWT>`.
 */
declare function buildBeamConversationsWebSocketUrl(apiBaseUrl: string, accessToken: string): string;
declare function parseBeamConversationSyncPayload(raw: string): BeamConversationSyncPayload | null;
type ConnectBeamConversationSyncOptions = {
    url: string;
    /** Defaults to `globalThis.WebSocket` (browsers, Node 22+). */
    WebSocket?: typeof WebSocket;
    onPayload: (payload: BeamConversationSyncPayload) => void;
    /** When false, a single connection is attempted. Default true. */
    reconnect?: boolean;
    signal?: AbortSignal;
};
type BeamConversationSyncConnection = {
    close: () => void;
};
/**
 * Subscribes to conversation sync events with optional exponential backoff reconnect
 * (same policy as the Beam web app listener).
 */
declare function connectBeamConversationSync(options: ConnectBeamConversationSyncOptions): BeamConversationSyncConnection;

type BeamSdkOptions = {
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
type BeamSubgraphApi = {
    agents: (page: number, pageSize: number) => Promise<SubgraphAgent[]>;
    agentByEntityId: (id: string) => Promise<SubgraphAgent | null>;
    agentByChainAgentId: (agentId: bigint | number | string) => Promise<SubgraphAgent | null>;
    feedbacksByAgentId: (agentId: bigint | number | string, opts?: {
        first?: number;
        skip?: number;
    }) => Promise<SubgraphFeedback[]>;
    validationsByAgentId: (agentId: bigint | number | string, opts?: {
        first?: number;
        skip?: number;
    }) => Promise<SubgraphValidation[]>;
    validationByRequestHash: (requestHash: string) => Promise<SubgraphValidation | null>;
};
type BeamKycApi = {
    /** `GET /users/me/kyc-status` (requires Bearer token). */
    get: () => Promise<UserKycStatusDocument>;
};
type BeamRealtimeApi = {
    /**
     * WebSocket URL for `/ws/conversations` with `?token=` (same host and pathname prefix as the HTTP API).
     */
    conversationsWebSocketUrl: (accessToken?: string) => string;
    /**
     * Subscribe to server push for conversation / thread invalidation. Reconnects with exponential backoff
     * unless `reconnect: false` or the server closes with 4401 (unauthorized JWT).
     */
    connectConversationSync: (opts: Omit<ConnectBeamConversationSyncOptions, "url"> & {
        accessToken?: string;
    }) => BeamConversationSyncConnection;
};
declare class BeamSdk {
    private readonly options;
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
    private accessToken;
    private readonly http;
    private readonly fetchImpl;
    private readonly resolved;
    private subgraphClient;
    constructor(options: BeamSdkOptions);
    private requireSubgraph;
    setAccessToken(token: string | undefined): void;
    getAccessToken(): string | undefined;
}

declare class BeamApiError extends Error {
    readonly status: number;
    readonly bodyText: string;
    constructor(message: string, opts: {
        status: number;
        bodyText: string;
    });
}

/** Graph `Bytes!` variables expect `0x` + hex; accept bare 64-char hashes. */
declare function normalizeGraphBytesInput(hash: string): string;
type BeamSubgraphClientOptions = {
    /** GraphQL HTTP endpoint for the Stardorm / Beam subgraph. */
    url: string;
    fetchImpl?: typeof fetch;
};
declare class BeamSubgraphClient {
    private readonly url;
    private readonly fetchImpl;
    constructor(opts: BeamSubgraphClientOptions);
    /**
     * Paginated registry agents (`page` is 1-based; `pageSize` maps to The Graph `first` / `skip`).
     */
    agents(page: number, pageSize: number): Promise<SubgraphAgent[]>;
    agentByEntityId(id: string): Promise<SubgraphAgent | null>;
    agentByChainAgentId(agentId: bigint | number | string): Promise<SubgraphAgent | null>;
    feedbacksByAgentId(agentId: bigint | number | string, opts?: {
        first?: number;
        skip?: number;
    }): Promise<SubgraphFeedback[]>;
    validationsByAgentId(agentId: bigint | number | string, opts?: {
        first?: number;
        skip?: number;
    }): Promise<SubgraphValidation[]>;
    validationByRequestHash(requestHash: string): Promise<SubgraphValidation | null>;
}

/**
 * Matches `agentIdToBytes` in the subgraph mapping (big-endian minimal bytes).
 */
declare function agentGraphEntityIdFromChainAgentId(agentId: bigint): string;

export { BEAM_NETWORK_DEFAULT_EVM_CHAIN_ID, BEAM_NETWORK_PRESETS, BEAM_WS_CLOSE_UNAUTHORIZED, type BeamAgentsApi, type BeamAgentsChatParams, BeamApiError, type BeamAuthApi, type BeamChainIdentityWrites, BeamChainModule, type BeamChainReadApi, type BeamChainReputationWrites, type BeamChainValidationWrites, type BeamChainWriteApi, type BeamConversationSyncConnection, type BeamConversationSyncPayload, type BeamDeployedContracts, type BeamHandlersApi, BeamHttpClient, type BeamHttpClientOptions, type BeamKycApi, type BeamMetadataEntry, type BeamNetworkId, type BeamNetworkPreset, type BeamPaymentsApi, type BeamRealtimeApi, type BeamResolvedRuntime, BeamSdk, type BeamSdkOptions, type BeamSdkRuntimeOverrides, type BeamSignableWallet, type BeamStorageApi, type BeamSubgraphApi, BeamSubgraphClient, type BeamSubgraphClientOptions, type BeamUsersApi, type BeamUsersMeChatParams, type ConnectBeamConversationSyncOptions, type SubgraphAgent, type SubgraphAgentMetadata, type SubgraphFeedback, type SubgraphValidation, accountFromPrivateKey, agentGraphEntityIdFromChainAgentId, buildBeamConversationsWebSocketUrl, connectBeamConversationSync, defaultEvmChainIdForNetwork, normalizeGraphBytesInput, parseBeamConversationSyncPayload, resolveBeamRuntime };
