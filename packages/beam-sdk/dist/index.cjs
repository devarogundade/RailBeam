'use strict';

var stardormApiContract = require('@railbeam/stardorm-api-contract');
var viem = require('viem');
var actions = require('viem/actions');
var chains = require('viem/chains');
var accounts = require('viem/accounts');

// src/api/agents.ts
function createBeamAgentsApi(http2) {
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
        return http2.requestFormData("POST", path, fd, stardormApiContract.stardormChatSuccessSchema);
      }
      return http2.requestJson("POST", path, {
        body: {
          message: params.message,
          ...params.conversationId ? { conversationId: params.conversationId } : {}
        },
        parse: stardormApiContract.stardormChatSuccessSchema
      });
    }
  };
}
function createBeamAuthApi(http2, setAccessToken) {
  const challenge = async (walletAddress) => http2.requestJson("POST", "/auth/challenge", {
    body: stardormApiContract.authChallengeBodySchema.parse({ walletAddress }),
    parse: stardormApiContract.authChallengeResponseSchema
  });
  const verify = async (body) => {
    const v = await http2.requestJson("POST", "/auth/verify", {
      body: stardormApiContract.authVerifyBodySchema.parse(body),
      parse: stardormApiContract.authVerifyResponseSchema
    });
    setAccessToken(v.accessToken);
    return v;
  };
  const me = async () => http2.requestJson("GET", "/auth/me", { parse: stardormApiContract.authMeResponseSchema });
  const signIn = async (wallet) => {
    const ch = await challenge(wallet.address);
    const signature = await wallet.signMessage({ message: ch.message });
    const v = await verify({
      walletAddress: wallet.address,
      message: ch.message,
      signature
    });
    setAccessToken(v.accessToken);
    return v;
  };
  return Object.assign(signIn, { challenge, verify, me });
}
function createBeamHandlersApi(http2) {
  return {
    list: () => http2.requestJson("GET", "/handlers", { parse: stardormApiContract.handlersListResponseSchema }),
    invoke: (handleId, body) => http2.requestJson("POST", `/handlers/${encodeURIComponent(handleId)}`, {
      body
    })
  };
}
function createBeamPaymentsApi(http2) {
  return {
    get: (id) => http2.requestJson("GET", `/payments/${encodeURIComponent(id)}`, {
      parse: stardormApiContract.publicPaymentRequestSchema
    }),
    pay: (id, body) => http2.requestJson("POST", `/payments/${encodeURIComponent(id)}/pay`, {
      body: stardormApiContract.paymentSettlementBodySchema.parse(body),
      parse: stardormApiContract.publicPaymentRequestSchema
    })
  };
}
function createBeamStorageApi(http2) {
  return {
    download: (rootHash) => http2.requestBinary("GET", `/storage/${encodeURIComponent(rootHash)}`),
    upload: (body) => http2.requestJson("POST", "/storage/upload", {
      body: stardormApiContract.storageUploadBodySchema.parse(body),
      parse: stardormApiContract.storageUploadResponseSchema
    })
  };
}
var USER_UPLOAD_FIELD = "file";
function createBeamUsersApi(http2) {
  return {
    getMe: () => http2.requestJson("GET", "/users/me", {
      parse: stardormApiContract.publicUserSchema
    }),
    updateMe: (body) => http2.requestJson("PATCH", "/users/me", {
      body: stardormApiContract.updateUserBodySchema.parse(body),
      parse: stardormApiContract.publicUserSchema
    }),
    uploadFile: (file) => {
      const fd = new FormData();
      fd.append(USER_UPLOAD_FIELD, file, file.name);
      return http2.requestFormData("POST", "/users/me/files", fd, stardormApiContract.userUploadResultSchema);
    },
    listConversations: (query) => {
      const q = stardormApiContract.conversationsQuerySchema.parse(query ?? {});
      return http2.requestJson("GET", "/users/me/conversations", {
        query: {
          limit: q.limit,
          ...q.cursor ? { cursor: q.cursor } : {}
        },
        parse: stardormApiContract.conversationsPageResponseSchema
      });
    },
    createConversation: (body) => http2.requestJson("POST", "/users/me/conversations", {
      body: stardormApiContract.createConversationBodySchema.parse(body),
      parse: stardormApiContract.conversationSummarySchema
    }),
    deleteConversation: (conversationId) => http2.requestJson(
      "DELETE",
      `/users/me/conversations/${encodeURIComponent(conversationId)}`,
      { parse: stardormApiContract.deleteConversationResponseSchema }
    ),
    chatMessages: (query) => {
      const q = stardormApiContract.chatHistoryQuerySchema.parse(query ?? {});
      return http2.requestJson("GET", "/users/me/chat/messages", {
        query: {
          limit: q.limit,
          ...q.conversationId ? { conversationId: q.conversationId } : {},
          ...q.cursor ? { cursor: q.cursor } : {}
        },
        parse: stardormApiContract.chatHistoryResponseSchema
      });
    },
    listCreditCards: () => http2.requestJson("GET", "/users/me/credit-cards", {
      parse: stardormApiContract.creditCardsListResponseSchema
    }),
    creditCardFundQuote: (query) => {
      const q = stardormApiContract.creditCardFundQuoteQuerySchema.parse(query);
      return http2.requestJson("GET", "/users/me/credit-cards/fund-quote", {
        query: { amountCents: q.amountCents },
        parse: stardormApiContract.creditCardFundQuoteResponseSchema
      });
    },
    creditCardSensitiveDetails: (cardId) => http2.requestJson(
      "GET",
      `/users/me/credit-cards/${encodeURIComponent(cardId)}/details`,
      { parse: stardormApiContract.creditCardSensitiveDetailsSchema }
    ),
    listPaymentRequests: (query) => {
      const q = stardormApiContract.mePaymentRequestsQuerySchema.parse(query ?? {});
      return http2.requestJson("GET", "/users/me/payment-requests", {
        query: { limit: q.limit },
        parse: stardormApiContract.paymentRequestsListResponseSchema
      });
    },
    listOnRamps: (query) => {
      const q = stardormApiContract.meOnRampsQuerySchema.parse(query ?? {});
      return http2.requestJson("GET", "/users/me/on-ramps", {
        query: { limit: q.limit },
        parse: stardormApiContract.onRampsListResponseSchema
      });
    },
    getKycStatus: () => http2.requestJson("GET", "/users/me/kyc-status", {
      parse: stardormApiContract.userKycStatusDocumentSchema
    }),
    fundCreditCard: (cardId, body) => http2.requestJson(
      "POST",
      `/users/me/credit-cards/${encodeURIComponent(cardId)}/fund`,
      {
        body: stardormApiContract.creditCardFundBodySchema.parse(body),
        parse: stardormApiContract.creditCardPublicSchema
      }
    ),
    withdrawCreditCard: (cardId, body) => http2.requestJson(
      "POST",
      `/users/me/credit-cards/${encodeURIComponent(cardId)}/withdraw`,
      {
        body: stardormApiContract.creditCardWithdrawBodySchema.parse(body),
        parse: stardormApiContract.creditCardPublicSchema
      }
    ),
    executeHandler: (body) => http2.requestJson("POST", "/users/me/chat/execute-handler", {
      body: stardormApiContract.executeHandlerBodySchema.parse(body),
      parse: stardormApiContract.executeHandlerResponseSchema
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
        return http2.requestFormData("POST", "/users/me/chat", fd);
      }
      return http2.requestJson("POST", "/users/me/chat", {
        body: {
          message: params.message,
          agentId: params.agentId,
          ...params.conversationId ? { conversationId: params.conversationId } : {}
        }
      });
    }
  };
}
var identityRegistryReadAbi = viem.parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function getFees(uint256 agentId) view returns (uint256)",
  "function getMetadata(uint256 agentId,string metadataKey) view returns (bytes)"
]);
var identityRegistryWriteAbi = viem.parseAbi([
  "function register() returns (uint256 agentId)",
  "function register(string agentURI) returns (uint256 agentId)",
  "function registerWithMetadataAndFees(string agentURI,(string metadataKey,bytes metadataValue)[],uint256 feesPerDay) returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId,string newURI)",
  "function setMetadata(uint256 agentId,string metadataKey,bytes metadataValue)",
  "function unsetAgentWallet(uint256 agentId)",
  "function setAgentWallet(uint256 agentId,address newWallet,uint256 deadline,bytes signature)",
  "function transfer(address from,address to,uint256 tokenId,bytes sealedKey,bytes proof)",
  "function clone(address to,uint256 tokenId,bytes sealedKey,bytes proof) returns (uint256 newTokenId)",
  "function subscribe(uint256 agentId,uint256 numDays) payable",
  "function unsubscribe(uint256 agentId) returns (uint256 daysLeft,uint256 refund)",
  "function setFees(uint256 agentId,uint256 feePerDay)",
  "function transferFrom(address from,address to,uint256 tokenId)",
  "function safeTransferFrom(address from,address to,uint256 tokenId)",
  "function approve(address to,uint256 tokenId)",
  "function setApprovalForAll(address operator,bool approved)"
]);
var reputationRegistryReadAbi = viem.parseAbi([
  "function getSummary(uint256 agentId,address[] clientAddresses,string tag1,string tag2) view returns (uint64 count,int128 summaryValue,uint8 summaryValueDecimals)",
  "function getLastIndex(uint256 agentId,address clientAddress) view returns (uint64)"
]);
var reputationRegistryWriteAbi = viem.parseAbi([
  "function giveFeedback(uint256 agentId,int128 value,uint8 valueDecimals,string tag1,string tag2,string endpoint,string feedbackURI,bytes32 feedbackHash)",
  "function revokeFeedback(uint256 agentId,uint64 feedbackIndex)",
  "function appendResponse(uint256 agentId,address clientAddress,uint64 feedbackIndex,string responseURI,bytes32 responseHash)"
]);
var validationRegistryReadAbi = viem.parseAbi([
  "function getValidationStatus(bytes32 requestHash) view returns (address validatorAddress,uint256 agentId,uint8 response,bytes32 responseHash,string tag,uint256 lastUpdate)",
  "function getSummary(uint256 agentId,address[] validatorAddresses,string tag) view returns (uint64 count,uint8 averageResponse)"
]);
var validationRegistryWriteAbi = viem.parseAbi([
  "function validationRequest(address validatorAddress,uint256 agentId,string requestURI,bytes32 requestHash)",
  "function validationResponse(bytes32 requestHash,uint8 response,string responseURI,bytes32 responseHash,string tag)"
]);

// src/chain/beam-chain.ts
function viemChainFor(network, chainId, rpcUrl) {
  const base = network === "mainnet" ? chains.zeroGMainnet : chains.zeroGTestnet;
  if (base.id === chainId) {
    return {
      ...base,
      rpcUrls: { default: { http: [rpcUrl] } }
    };
  }
  return {
    id: chainId,
    name: `Beam (${network})`,
    nativeCurrency: base.nativeCurrency,
    rpcUrls: { default: { http: [rpcUrl] } }
  };
}
var BeamChainModule = class {
  addresses;
  publicClient;
  read;
  runtime;
  constructor(runtime) {
    this.runtime = runtime;
    this.addresses = runtime.contracts;
    const chain = viemChainFor(runtime.network, runtime.chainId, runtime.rpcUrl);
    this.publicClient = viem.createPublicClient({
      chain,
      transport: viem.http(runtime.rpcUrl)
    });
    const id = this.addresses.identityRegistry;
    const rep = this.addresses.reputationRegistry;
    const val = this.addresses.validationRegistry;
    const pc = this.publicClient;
    this.read = {
      identity: {
        ownerOf: (tokenId) => actions.readContract(pc, {
          address: id,
          abi: identityRegistryReadAbi,
          functionName: "ownerOf",
          args: [tokenId]
        }),
        tokenURI: (tokenId) => actions.readContract(pc, {
          address: id,
          abi: identityRegistryReadAbi,
          functionName: "tokenURI",
          args: [tokenId]
        }),
        getAgentWallet: (agentId) => actions.readContract(pc, {
          address: id,
          abi: identityRegistryReadAbi,
          functionName: "getAgentWallet",
          args: [agentId]
        }),
        getFees: (agentId) => actions.readContract(pc, {
          address: id,
          abi: identityRegistryReadAbi,
          functionName: "getFees",
          args: [agentId]
        }),
        getMetadata: (agentId, metadataKey) => actions.readContract(pc, {
          address: id,
          abi: identityRegistryReadAbi,
          functionName: "getMetadata",
          args: [agentId, metadataKey]
        })
      },
      reputation: {
        getSummary: async (agentId, clientAddresses, tag1, tag2) => {
          const r = await actions.readContract(pc, {
            address: rep,
            abi: reputationRegistryReadAbi,
            functionName: "getSummary",
            args: [agentId, [...clientAddresses], tag1, tag2]
          });
          return {
            count: r[0],
            summaryValue: r[1],
            summaryValueDecimals: r[2]
          };
        },
        getLastIndex: (agentId, clientAddress) => actions.readContract(pc, {
          address: rep,
          abi: reputationRegistryReadAbi,
          functionName: "getLastIndex",
          args: [agentId, clientAddress]
        })
      },
      validation: {
        getValidationStatus: async (requestHash) => {
          const r = await actions.readContract(pc, {
            address: val,
            abi: validationRegistryReadAbi,
            functionName: "getValidationStatus",
            args: [requestHash]
          });
          return {
            validatorAddress: r[0],
            agentId: r[1],
            response: r[2],
            responseHash: r[3],
            tag: r[4],
            lastUpdate: r[5]
          };
        },
        getSummary: async (agentId, validatorAddresses, tag) => {
          const r = await actions.readContract(pc, {
            address: val,
            abi: validationRegistryReadAbi,
            functionName: "getSummary",
            args: [agentId, [...validatorAddresses], tag]
          });
          return { count: r[0], averageResponse: r[1] };
        }
      }
    };
  }
  /** Wallet / local account writes (gas on the caller). */
  forAccount(account) {
    const chain = viemChainFor(
      this.runtime.network,
      this.runtime.chainId,
      this.runtime.rpcUrl
    );
    const walletClient = viem.createWalletClient({
      account,
      chain,
      transport: viem.http(this.runtime.rpcUrl)
    });
    const id = this.addresses.identityRegistry;
    const rep = this.addresses.reputationRegistry;
    const val = this.addresses.validationRegistry;
    return {
      identity: {
        register: () => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "register",
          args: []
        }),
        registerWithUri: (agentURI) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "register",
          args: [agentURI]
        }),
        registerWithMetadataAndFees: (agentURI, metadata, feesPerDay) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "registerWithMetadataAndFees",
          args: [
            agentURI,
            metadata.map((m) => ({
              metadataKey: m.metadataKey,
              metadataValue: m.metadataValue
            })),
            feesPerDay
          ]
        }),
        setAgentURI: (agentId, newURI) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "setAgentURI",
          args: [agentId, newURI]
        }),
        setMetadata: (agentId, metadataKey, metadataValue) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "setMetadata",
          args: [agentId, metadataKey, metadataValue]
        }),
        unsetAgentWallet: (agentId) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "unsetAgentWallet",
          args: [agentId]
        }),
        setAgentWallet: (agentId, newWallet, deadline, signature) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "setAgentWallet",
          args: [agentId, newWallet, deadline, signature]
        }),
        transfer: (from, to, tokenId, sealedKey, proof) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "transfer",
          args: [from, to, tokenId, sealedKey, proof]
        }),
        clone: (to, tokenId, sealedKey, proof) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "clone",
          args: [to, tokenId, sealedKey, proof]
        }),
        subscribe: (agentId, numDays, opts) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "subscribe",
          args: [agentId, numDays],
          value: opts?.value
        }),
        unsubscribe: (agentId) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "unsubscribe",
          args: [agentId]
        }),
        setFees: (agentId, feePerDay) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "setFees",
          args: [agentId, feePerDay]
        }),
        transferFrom: (from, to, tokenId) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "transferFrom",
          args: [from, to, tokenId]
        }),
        safeTransferFrom: (from, to, tokenId) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "safeTransferFrom",
          args: [from, to, tokenId]
        }),
        approve: (to, tokenId) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "approve",
          args: [to, tokenId]
        }),
        setApprovalForAll: (operator, approved) => actions.writeContract(walletClient, {
          address: id,
          abi: identityRegistryWriteAbi,
          functionName: "setApprovalForAll",
          args: [operator, approved]
        })
      },
      reputation: {
        giveFeedback: (a) => actions.writeContract(walletClient, {
          address: rep,
          abi: reputationRegistryWriteAbi,
          functionName: "giveFeedback",
          args: [
            a.agentId,
            a.value,
            a.valueDecimals,
            a.tag1,
            a.tag2,
            a.endpoint,
            a.feedbackURI,
            a.feedbackHash
          ]
        }),
        revokeFeedback: (agentId, feedbackIndex) => actions.writeContract(walletClient, {
          address: rep,
          abi: reputationRegistryWriteAbi,
          functionName: "revokeFeedback",
          args: [agentId, feedbackIndex]
        }),
        appendResponse: (agentId, clientAddress, feedbackIndex, responseURI, responseHash) => actions.writeContract(walletClient, {
          address: rep,
          abi: reputationRegistryWriteAbi,
          functionName: "appendResponse",
          args: [agentId, clientAddress, feedbackIndex, responseURI, responseHash]
        })
      },
      validation: {
        validationRequest: (validatorAddress, agentId, requestURI, requestHash) => actions.writeContract(walletClient, {
          address: val,
          abi: validationRegistryWriteAbi,
          functionName: "validationRequest",
          args: [validatorAddress, agentId, requestURI, requestHash]
        }),
        validationResponse: (requestHash, response, responseURI, responseHash, tag) => actions.writeContract(walletClient, {
          address: val,
          abi: validationRegistryWriteAbi,
          functionName: "validationResponse",
          args: [requestHash, response, responseURI, responseHash, tag]
        })
      }
    };
  }
};

// src/errors.ts
var BeamApiError = class extends Error {
  status;
  bodyText;
  constructor(message, opts) {
    super(message);
    this.name = "BeamApiError";
    this.status = opts.status;
    this.bodyText = opts.bodyText;
  }
};

// src/http.ts
function joinUrl(base, path) {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}
async function readErrorBody(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
var BeamHttpClient = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  get chainId() {
    return this.opts.chainId;
  }
  headers(init, contentTypeJson = true) {
    const h = new Headers(init);
    if (contentTypeJson && !h.has("Content-Type")) {
      h.set("Content-Type", "application/json");
    }
    h.set("X-Beam-Chain-Id", String(this.opts.chainId));
    const token = this.opts.getAccessToken();
    if (token) {
      h.set("Authorization", `Bearer ${token}`);
    }
    return h;
  }
  async requestJson(method, path, opts = {}) {
    let url = joinUrl(this.opts.baseUrl, path);
    if (opts.query) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query)) {
        if (v === void 0 || v === null) continue;
        sp.set(k, String(v));
      }
      const q = sp.toString();
      if (q) url += `?${q}`;
    }
    const res = await this.opts.fetchImpl(url, {
      method,
      headers: this.headers(),
      body: opts.body === void 0 ? void 0 : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)
    });
    const text = await readErrorBody(res);
    if (!res.ok) {
      throw new BeamApiError(`Beam API HTTP ${res.status}`, {
        status: res.status,
        bodyText: text
      });
    }
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new BeamApiError("Beam API returned non-JSON body", {
        status: res.status,
        bodyText: text
      });
    }
    if (opts.parse) {
      return opts.parse.parse(data);
    }
    return data;
  }
  async requestFormData(method, path, form, parse) {
    const url = joinUrl(this.opts.baseUrl, path);
    const h = this.headers(void 0, false);
    const res = await this.opts.fetchImpl(url, {
      method,
      headers: h,
      body: form
    });
    const text = await readErrorBody(res);
    if (!res.ok) {
      throw new BeamApiError(`Beam API HTTP ${res.status}`, {
        status: res.status,
        bodyText: text
      });
    }
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new BeamApiError("Beam API returned non-JSON body", {
        status: res.status,
        bodyText: text
      });
    }
    if (parse) {
      return parse.parse(data);
    }
    return data;
  }
  async requestBinary(method, path) {
    const url = joinUrl(this.opts.baseUrl, path);
    const res = await this.opts.fetchImpl(url, {
      method,
      headers: this.headers()
    });
    if (!res.ok) {
      const text = await readErrorBody(res);
      throw new BeamApiError(`Beam API HTTP ${res.status}`, {
        status: res.status,
        bodyText: text
      });
    }
    return res.arrayBuffer();
  }
};
var BEAM_NETWORK_DEFAULT_EVM_CHAIN_ID = {
  mainnet: chains.zeroGMainnet.id,
  testnet: chains.zeroGTestnet.id
};
function defaultEvmChainIdForNetwork(network) {
  return BEAM_NETWORK_DEFAULT_EVM_CHAIN_ID[network];
}

// src/presets.ts
var BEAM_NETWORK_PRESETS = {
  mainnet: {
    chainId: defaultEvmChainIdForNetwork("mainnet"),
    rpcUrl: "https://evmrpc.0g.ai",
    apiBaseUrl: "https://api.railbeam.xyz",
    subgraphUrl: "https://api.goldsky.com/api/public/project_cly6563u2bhfy01zw7mah9nhs/subgraphs/stardorm-eip8004/1.0.0/gn",
    contracts: {
      identityRegistry: "0x950Ab17d75b65430a2e5536b0d269abFAD0bc30F",
      reputationRegistry: "0x8Bc1926c91D7c7031A76FfE23057037694d529eb",
      validationRegistry: "0x4697B37fDeb796E450a46007591fcFFe8baD8124"
    }
  },
  testnet: {
    chainId: defaultEvmChainIdForNetwork("testnet"),
    rpcUrl: "https://evmrpc-testnet.0g.ai",
    apiBaseUrl: "https://api.railbeam.xyz",
    subgraphUrl: "https://api.goldsky.com/api/public/project_cly6563u2bhfy01zw7mah9nhs/subgraphs/stardormtestnet-eip8004/1.0.0/gn",
    contracts: {
      identityRegistry: "0xAA7d78F40743fA03AD59CcCb558C968CaE69e337",
      reputationRegistry: "0x955be54f2169A5Acd3607c647Dbbf6558Cf7907a",
      validationRegistry: "0x4E768bf6Bf892C9a9c4627C3B68ea90E509e1d11"
    }
  }
};
function resolveBeamRuntime(network, overrides) {
  const base = BEAM_NETWORK_PRESETS[network];
  const contracts = { ...base.contracts, ...overrides?.contracts };
  return {
    network,
    chainId: overrides?.chainId ?? base.chainId,
    rpcUrl: overrides?.rpcUrl ?? base.rpcUrl,
    apiBaseUrl: (overrides?.apiBaseUrl ?? base.apiBaseUrl).replace(/\/$/, ""),
    subgraphUrl: (overrides?.subgraphUrl ?? base.subgraphUrl).trim(),
    contracts
  };
}

// src/subgraph/entity-ids.ts
function agentGraphEntityIdFromChainAgentId(agentId) {
  if (agentId < 0n) {
    throw new Error("agentId must be non-negative");
  }
  if (agentId === 0n) {
    return "0x00";
  }
  let hex = agentId.toString(16);
  if (hex.length % 2 === 1) {
    hex = `0${hex}`;
  }
  return `0x${hex.toLowerCase()}`;
}

// src/subgraph/graphql.ts
async function postGraphql(subgraphUrl, query, variables, fetchImpl) {
  const res = await fetchImpl(subgraphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Subgraph HTTP ${res.status}: ${text.slice(0, 500) || res.statusText}`
    );
  }
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(
      body.errors.map((e) => e.message).join("; ") || "Subgraph GraphQL error"
    );
  }
  if (body.data === void 0) {
    throw new Error("Subgraph response missing data");
  }
  return body.data;
}

// src/subgraph/map-rows.ts
function parseBigIntString(s) {
  const n = Number(s);
  if (!Number.isFinite(n)) {
    throw new Error(`Expected finite number from subgraph bigint string: ${s}`);
  }
  return n;
}
function mapMetadataRow(m) {
  return {
    id: String(m.id),
    agentId: parseBigIntString(String(m.agentId)),
    key: String(m.key),
    value: String(m.value),
    updatedBy: String(m.updatedBy),
    blockNumber: parseBigIntString(String(m.blockNumber)),
    blockTimestamp: parseBigIntString(String(m.blockTimestamp)),
    transactionHash: String(m.transactionHash)
  };
}
function mapAgentRow(raw) {
  const metadata = Array.isArray(raw.metadata) ? raw.metadata.map((x) => mapMetadataRow(x)) : [];
  return {
    id: String(raw.id),
    agentId: parseBigIntString(String(raw.agentId)),
    owner: String(raw.owner),
    uri: raw.uri == null ? null : String(raw.uri),
    agentWallet: raw.agentWallet == null ? null : String(raw.agentWallet),
    feePerDay: raw.feePerDay == null ? null : String(raw.feePerDay),
    isCloned: Boolean(raw.isCloned),
    blockNumber: parseBigIntString(String(raw.blockNumber)),
    blockTimestamp: parseBigIntString(String(raw.blockTimestamp)),
    transactionHash: String(raw.transactionHash),
    metadata
  };
}
function mapFeedbackRow(raw) {
  return {
    id: String(raw.id),
    agentId: parseBigIntString(String(raw.agentId)),
    clientAddress: String(raw.clientAddress),
    feedbackIndex: String(raw.feedbackIndex),
    value: String(raw.value),
    valueDecimals: Number(raw.valueDecimals),
    tag1: String(raw.tag1),
    tag2: String(raw.tag2),
    endpoint: String(raw.endpoint),
    feedbackURI: String(raw.feedbackURI),
    feedbackHash: String(raw.feedbackHash),
    revoked: Boolean(raw.revoked),
    blockNumber: parseBigIntString(String(raw.blockNumber)),
    blockTimestamp: parseBigIntString(String(raw.blockTimestamp)),
    transactionHash: String(raw.transactionHash)
  };
}
function mapValidationRow(raw) {
  return {
    id: String(raw.id),
    requestHash: String(raw.requestHash),
    validatorAddress: String(raw.validatorAddress),
    agentId: parseBigIntString(String(raw.agentId)),
    requestURI: String(raw.requestURI),
    response: raw.response == null ? null : Number(raw.response),
    responseURI: raw.responseURI == null ? null : String(raw.responseURI),
    responseHash: raw.responseHash == null ? null : String(raw.responseHash),
    tag: raw.tag == null ? null : String(raw.tag),
    blockNumber: parseBigIntString(String(raw.blockNumber)),
    blockTimestamp: parseBigIntString(String(raw.blockTimestamp)),
    transactionHash: String(raw.transactionHash)
  };
}

// src/subgraph/queries.ts
var AGENT_DETAIL_FIELDS = `
  id
  agentId
  owner
  uri
  agentWallet
  feePerDay
  isCloned
  blockNumber
  blockTimestamp
  transactionHash
  metadata {
    id
    agentId
    key
    value
    updatedBy
    blockNumber
    blockTimestamp
    transactionHash
  }
`;
var GET_AGENT = (
  /* GraphQL */
  `
  query GetAgent($id: ID!) {
    agent(id: $id) {
      ${AGENT_DETAIL_FIELDS}
    }
  }
`
);
var GET_AGENTS_PAGE = (
  /* GraphQL */
  `
  query AgentsPage($first: Int!, $skip: Int!) {
    agents(
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: desc
    ) {
      ${AGENT_DETAIL_FIELDS}
    }
  }
`
);
var GET_FEEDBACKS_BY_AGENT = (
  /* GraphQL */
  `
  query FeedbacksByAgent($agentId: BigInt!, $first: Int!, $skip: Int!) {
    feedbacks(
      where: { agentId: $agentId }
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      agentId
      clientAddress
      feedbackIndex
      value
      valueDecimals
      tag1
      tag2
      endpoint
      feedbackURI
      feedbackHash
      revoked
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`
);
var GET_VALIDATIONS_BY_AGENT = (
  /* GraphQL */
  `
  query ValidationsByAgent($agentId: BigInt!, $first: Int!, $skip: Int!) {
    validations(
      where: { agentId: $agentId }
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      requestHash
      validatorAddress
      agentId
      requestURI
      response
      responseURI
      responseHash
      tag
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`
);
var GET_VALIDATION_BY_REQUEST_HASH = (
  /* GraphQL */
  `
  query ValidationByRequestHash($requestHash: Bytes!) {
    validations(where: { requestHash: $requestHash }, first: 1) {
      id
      requestHash
      validatorAddress
      agentId
      requestURI
      response
      responseURI
      responseHash
      tag
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`
);

// src/subgraph/subgraph-client.ts
function chainAgentIdBigInt(agentId) {
  if (typeof agentId === "bigint") return agentId;
  const s = typeof agentId === "string" ? agentId.trim() : String(agentId);
  return BigInt(s);
}
function normalizeGraphBytesInput(hash) {
  const t = hash.trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(t)) return `0x${t}`;
  return hash.trim();
}
var BeamSubgraphClient = class {
  url;
  fetchImpl;
  constructor(opts) {
    this.url = opts.url.trim();
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }
  /**
   * Paginated registry agents (`page` is 1-based; `pageSize` maps to The Graph `first` / `skip`).
   */
  async agents(page, pageSize) {
    if (page < 1 || !Number.isFinite(page)) {
      throw new Error("agents: page must be a finite integer >= 1");
    }
    if (pageSize < 1 || !Number.isFinite(pageSize)) {
      throw new Error("agents: pageSize must be a finite integer >= 1");
    }
    const skip = (page - 1) * pageSize;
    const data = await postGraphql(
      this.url,
      GET_AGENTS_PAGE,
      { first: pageSize, skip },
      this.fetchImpl
    );
    return (data.agents ?? []).map((row) => mapAgentRow(row));
  }
  async agentByEntityId(id) {
    const data = await postGraphql(
      this.url,
      GET_AGENT,
      { id },
      this.fetchImpl
    );
    if (!data.agent) return null;
    return mapAgentRow(data.agent);
  }
  async agentByChainAgentId(agentId) {
    const id = agentGraphEntityIdFromChainAgentId(chainAgentIdBigInt(agentId));
    return this.agentByEntityId(id);
  }
  async feedbacksByAgentId(agentId, opts) {
    const first = opts?.first ?? 100;
    const skip = opts?.skip ?? 0;
    const data = await postGraphql(
      this.url,
      GET_FEEDBACKS_BY_AGENT,
      {
        agentId: chainAgentIdBigInt(agentId).toString(),
        first,
        skip
      },
      this.fetchImpl
    );
    return data.feedbacks.map((row) => mapFeedbackRow(row));
  }
  async validationsByAgentId(agentId, opts) {
    const first = opts?.first ?? 100;
    const skip = opts?.skip ?? 0;
    const data = await postGraphql(
      this.url,
      GET_VALIDATIONS_BY_AGENT,
      {
        agentId: chainAgentIdBigInt(agentId).toString(),
        first,
        skip
      },
      this.fetchImpl
    );
    return data.validations.map((row) => mapValidationRow(row));
  }
  async validationByRequestHash(requestHash) {
    const data = await postGraphql(
      this.url,
      GET_VALIDATION_BY_REQUEST_HASH,
      { requestHash: normalizeGraphBytesInput(requestHash) },
      this.fetchImpl
    );
    const row = data.validations[0];
    return row ? mapValidationRow(row) : null;
  }
};
var BEAM_WS_CLOSE_UNAUTHORIZED = 4401;
function buildBeamConversationsWebSocketUrl(apiBaseUrl, accessToken) {
  const trimmedBase = apiBaseUrl.trim().replace(/\/$/, "");
  const trimmedToken = accessToken.trim();
  if (!trimmedBase || !trimmedToken) {
    throw new Error("buildBeamConversationsWebSocketUrl: apiBaseUrl and accessToken are required");
  }
  const u = new URL(trimmedBase);
  const prefix = u.pathname.replace(/\/$/, "");
  u.pathname = `${prefix}/ws/conversations`.replace(/\/{2,}/g, "/");
  u.searchParams.set("token", trimmedToken);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.hash = "";
  return u.toString();
}
function parseBeamConversationSyncPayload(raw) {
  try {
    const o = JSON.parse(raw);
    const parsed = stardormApiContract.conversationSyncPayloadSchema.safeParse(o);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
function connectBeamConversationSync(options) {
  const WS = options.WebSocket ?? globalThis.WebSocket;
  if (!WS) {
    throw new Error(
      "connectBeamConversationSync: No WebSocket implementation found. Pass `WebSocket` in options (e.g. from the `ws` package on older Node) or use Node 22+ / a browser."
    );
  }
  let stopped = false;
  let ws = null;
  let reconnectTimer;
  let attempt = 0;
  const clearReconnect = () => {
    if (reconnectTimer !== void 0) {
      clearTimeout(reconnectTimer);
      reconnectTimer = void 0;
    }
  };
  const applyFrame = (text) => {
    const payload = parseBeamConversationSyncPayload(text);
    if (payload) options.onPayload(payload);
  };
  function connect() {
    if (stopped) return;
    clearReconnect();
    ws = new WS(options.url);
    ws.onopen = () => {
      attempt = 0;
    };
    ws.onmessage = (ev) => {
      const data = ev.data;
      if (typeof data === "string") applyFrame(data);
      else if (data instanceof ArrayBuffer) {
        applyFrame(new TextDecoder().decode(data));
      } else if (data instanceof Uint8Array) {
        applyFrame(new TextDecoder().decode(data));
      }
    };
    ws.onclose = (ev) => {
      ws = null;
      if (stopped) return;
      const code = typeof ev === "object" && ev && "code" in ev ? Number(ev.code) : 0;
      if (code === BEAM_WS_CLOSE_UNAUTHORIZED) return;
      scheduleReconnect();
    };
    ws.onerror = () => {
    };
  }
  const scheduleReconnect = () => {
    if (stopped || options.reconnect === false) return;
    attempt += 1;
    const delay = Math.min(3e4, 1e3 * 2 ** Math.min(attempt, 5));
    clearReconnect();
    reconnectTimer = setTimeout(connect, delay);
  };
  const onAbort = () => {
    stopped = true;
    clearReconnect();
    if (ws && (ws.readyState === WS.OPEN || ws.readyState === WS.CONNECTING)) {
      ws.close();
    }
    ws = null;
  };
  const abortHandler = () => {
    onAbort();
  };
  if (options.signal) {
    if (options.signal.aborted) onAbort();
    else options.signal.addEventListener("abort", abortHandler, { once: true });
  }
  connect();
  return {
    close: () => {
      stopped = true;
      clearReconnect();
      options.signal?.removeEventListener("abort", abortHandler);
      if (ws && (ws.readyState === WS.OPEN || ws.readyState === WS.CONNECTING)) {
        ws.close();
      }
      ws = null;
    }
  };
}

// src/beam-sdk.ts
var BeamSdk = class {
  constructor(options) {
    this.options = options;
    this.network = options.network;
    this.resolved = resolveBeamRuntime(options.network, {
      ...options.overrides,
      ...options.chainId !== void 0 ? { chainId: options.chainId } : {}
    });
    this.chainId = this.resolved.chainId;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.accessToken = options.accessToken;
    this.chain = new BeamChainModule(this.resolved);
    this.http = new BeamHttpClient({
      baseUrl: this.resolved.apiBaseUrl,
      chainId: this.chainId,
      getAccessToken: () => this.accessToken,
      fetchImpl: this.fetchImpl
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
      get: () => this.users.getKycStatus()
    };
    this.subgraph = {
      agents: (page, pageSize) => this.requireSubgraph().agents(page, pageSize),
      agentByEntityId: (id) => this.requireSubgraph().agentByEntityId(id),
      agentByChainAgentId: (agentId) => this.requireSubgraph().agentByChainAgentId(agentId),
      feedbacksByAgentId: (agentId, opts) => this.requireSubgraph().feedbacksByAgentId(agentId, opts),
      validationsByAgentId: (agentId, opts) => this.requireSubgraph().validationsByAgentId(agentId, opts),
      validationByRequestHash: (hash) => this.requireSubgraph().validationByRequestHash(hash)
    };
    this.realtime = {
      conversationsWebSocketUrl: (token) => {
        const t = (token ?? this.accessToken)?.trim();
        if (!t) {
          throw new Error(
            "BeamSdk.realtime.conversationsWebSocketUrl: missing access token. Call `setAccessToken`, pass `accessToken` to the constructor, or pass a token argument."
          );
        }
        return buildBeamConversationsWebSocketUrl(this.resolved.apiBaseUrl, t);
      },
      connectConversationSync: (opts) => {
        const { accessToken: tokenOverride, ...rest } = opts;
        const t = (tokenOverride ?? this.accessToken)?.trim();
        if (!t) {
          throw new Error(
            "BeamSdk.realtime.connectConversationSync: missing access token. Set the session token first or pass `accessToken` in the options object."
          );
        }
        const url = buildBeamConversationsWebSocketUrl(this.resolved.apiBaseUrl, t);
        return connectBeamConversationSync({ url, ...rest });
      }
    };
  }
  options;
  network;
  chainId;
  /** On-chain reads + writes against the Stardorm EIP-8004 registries (viem). */
  chain;
  auth;
  agents;
  users;
  payments;
  handlers;
  storage;
  kyc;
  subgraph;
  realtime;
  accessToken;
  http;
  fetchImpl;
  resolved;
  subgraphClient;
  requireSubgraph() {
    const url = this.resolved.subgraphUrl;
    if (!url) {
      throw new Error(
        "BeamSdk: `subgraphUrl` is empty in BEAM_NETWORK_PRESETS for this network. Deploy the subgraph and paste the GraphQL HTTP URL into packages/beam-sdk/src/presets.ts, or pass `overrides.subgraphUrl` when constructing BeamSdk."
      );
    }
    if (!this.subgraphClient) {
      this.subgraphClient = new BeamSubgraphClient({
        url,
        fetchImpl: this.fetchImpl
      });
    }
    return this.subgraphClient;
  }
  setAccessToken(token) {
    this.accessToken = token;
  }
  getAccessToken() {
    return this.accessToken;
  }
};
function accountFromPrivateKey(privateKey) {
  return accounts.privateKeyToAccount(privateKey);
}

exports.BEAM_NETWORK_DEFAULT_EVM_CHAIN_ID = BEAM_NETWORK_DEFAULT_EVM_CHAIN_ID;
exports.BEAM_NETWORK_PRESETS = BEAM_NETWORK_PRESETS;
exports.BEAM_WS_CLOSE_UNAUTHORIZED = BEAM_WS_CLOSE_UNAUTHORIZED;
exports.BeamApiError = BeamApiError;
exports.BeamChainModule = BeamChainModule;
exports.BeamHttpClient = BeamHttpClient;
exports.BeamSdk = BeamSdk;
exports.BeamSubgraphClient = BeamSubgraphClient;
exports.accountFromPrivateKey = accountFromPrivateKey;
exports.agentGraphEntityIdFromChainAgentId = agentGraphEntityIdFromChainAgentId;
exports.buildBeamConversationsWebSocketUrl = buildBeamConversationsWebSocketUrl;
exports.connectBeamConversationSync = connectBeamConversationSync;
exports.defaultEvmChainIdForNetwork = defaultEvmChainIdForNetwork;
exports.normalizeGraphBytesInput = normalizeGraphBytesInput;
exports.parseBeamConversationSyncPayload = parseBeamConversationSyncPayload;
exports.resolveBeamRuntime = resolveBeamRuntime;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map