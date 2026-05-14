import {
  type Account,
  type Address,
  type Chain,
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { readContract, writeContract } from "viem/actions";
import { zeroGMainnet, zeroGTestnet } from "viem/chains";
import type { BeamNetworkId } from "../config.js";
import type { BeamResolvedRuntime } from "../presets.js";
import {
  identityRegistryReadAbi,
  identityRegistryWriteAbi,
  reputationRegistryReadAbi,
  reputationRegistryWriteAbi,
  validationRegistryReadAbi,
  validationRegistryWriteAbi,
} from "./abi-snippets.js";

function viemChainFor(network: BeamNetworkId, chainId: number, rpcUrl: string): Chain {
  const base = network === "mainnet" ? zeroGMainnet : zeroGTestnet;
  if (base.id === chainId) {
    return {
      ...base,
      rpcUrls: { default: { http: [rpcUrl] } },
    };
  }
  return {
    id: chainId,
    name: `Beam (${network})`,
    nativeCurrency: base.nativeCurrency,
    rpcUrls: { default: { http: [rpcUrl] } },
  };
}

export type BeamMetadataEntry = {
  metadataKey: string;
  metadataValue: `0x${string}`;
};

export type BeamChainReadApi = {
  identity: {
    ownerOf: (tokenId: bigint) => Promise<Address>;
    tokenURI: (tokenId: bigint) => Promise<string>;
    getAgentWallet: (agentId: bigint) => Promise<Address>;
    getFees: (agentId: bigint) => Promise<bigint>;
    getMetadata: (agentId: bigint, metadataKey: string) => Promise<`0x${string}`>;
  };
  reputation: {
    getSummary: (
      agentId: bigint,
      clientAddresses: readonly Address[],
      tag1: string,
      tag2: string,
    ) => Promise<{ count: bigint; summaryValue: bigint; summaryValueDecimals: number }>;
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
    getSummary: (
      agentId: bigint,
      validatorAddresses: readonly Address[],
      tag: string,
    ) => Promise<{ count: bigint; averageResponse: number }>;
  };
};

export type BeamChainIdentityWrites = {
  /** `register()` — mints an agent with empty URI. */
  register: () => Promise<`0x${string}`>;
  /** `register(string)` — mints with `agentURI`. */
  registerWithUri: (agentURI: string) => Promise<`0x${string}`>;
  registerWithMetadataAndFees: (
    agentURI: string,
    metadata: readonly BeamMetadataEntry[],
    feesPerDay: bigint,
  ) => Promise<`0x${string}`>;
  setAgentURI: (agentId: bigint, newURI: string) => Promise<`0x${string}`>;
  setMetadata: (
    agentId: bigint,
    metadataKey: string,
    metadataValue: `0x${string}`,
  ) => Promise<`0x${string}`>;
  unsetAgentWallet: (agentId: bigint) => Promise<`0x${string}`>;
  setAgentWallet: (
    agentId: bigint,
    newWallet: Address,
    deadline: bigint,
    signature: `0x${string}`,
  ) => Promise<`0x${string}`>;
  /** ERC-7857 transfer (not ERC-721 `transferFrom`). */
  transfer: (
    from: Address,
    to: Address,
    tokenId: bigint,
    sealedKey: `0x${string}`,
    proof: `0x${string}`,
  ) => Promise<`0x${string}`>;
  clone: (
    to: Address,
    tokenId: bigint,
    sealedKey: `0x${string}`,
    proof: `0x${string}`,
  ) => Promise<`0x${string}`>;
  subscribe: (
    agentId: bigint,
    numDays: bigint,
    opts?: { value?: bigint },
  ) => Promise<`0x${string}`>;
  unsubscribe: (agentId: bigint) => Promise<`0x${string}`>;
  setFees: (agentId: bigint, feePerDay: bigint) => Promise<`0x${string}`>;
  transferFrom: (from: Address, to: Address, tokenId: bigint) => Promise<`0x${string}`>;
  safeTransferFrom: (from: Address, to: Address, tokenId: bigint) => Promise<`0x${string}`>;
  approve: (to: Address, tokenId: bigint) => Promise<`0x${string}`>;
  setApprovalForAll: (operator: Address, approved: boolean) => Promise<`0x${string}`>;
};

export type BeamChainReputationWrites = {
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
  appendResponse: (
    agentId: bigint,
    clientAddress: Address,
    feedbackIndex: bigint,
    responseURI: string,
    responseHash: `0x${string}`,
  ) => Promise<`0x${string}`>;
};

export type BeamChainValidationWrites = {
  validationRequest: (
    validatorAddress: Address,
    agentId: bigint,
    requestURI: string,
    requestHash: `0x${string}`,
  ) => Promise<`0x${string}`>;
  /** `response` must be 0–100 (validator-only). */
  validationResponse: (
    requestHash: `0x${string}`,
    response: number,
    responseURI: string,
    responseHash: `0x${string}`,
    tag: string,
  ) => Promise<`0x${string}`>;
};

export type BeamChainWriteApi = {
  identity: BeamChainIdentityWrites;
  reputation: BeamChainReputationWrites;
  validation: BeamChainValidationWrites;
};

export class BeamChainModule {
  readonly addresses: BeamResolvedRuntime["contracts"];

  readonly publicClient: PublicClient<Transport, Chain>;

  readonly read: BeamChainReadApi;

  private readonly runtime: BeamResolvedRuntime;

  constructor(runtime: BeamResolvedRuntime) {
    this.runtime = runtime;
    this.addresses = runtime.contracts;
    const chain = viemChainFor(runtime.network, runtime.chainId, runtime.rpcUrl);
    this.publicClient = createPublicClient({
      chain,
      transport: http(runtime.rpcUrl),
    }) as unknown as PublicClient<Transport, Chain>;

    const id = this.addresses.identityRegistry;
    const rep = this.addresses.reputationRegistry;
    const val = this.addresses.validationRegistry;
    const pc = this.publicClient;

    this.read = {
      identity: {
        ownerOf: (tokenId) =>
          readContract(pc, {
            address: id,
            abi: identityRegistryReadAbi,
            functionName: "ownerOf",
            args: [tokenId],
          }),
        tokenURI: (tokenId) =>
          readContract(pc, {
            address: id,
            abi: identityRegistryReadAbi,
            functionName: "tokenURI",
            args: [tokenId],
          }),
        getAgentWallet: (agentId) =>
          readContract(pc, {
            address: id,
            abi: identityRegistryReadAbi,
            functionName: "getAgentWallet",
            args: [agentId],
          }),
        getFees: (agentId) =>
          readContract(pc, {
            address: id,
            abi: identityRegistryReadAbi,
            functionName: "getFees",
            args: [agentId],
          }),
        getMetadata: (agentId, metadataKey) =>
          readContract(pc, {
            address: id,
            abi: identityRegistryReadAbi,
            functionName: "getMetadata",
            args: [agentId, metadataKey],
          }),
      },
      reputation: {
        getSummary: async (agentId, clientAddresses, tag1, tag2) => {
          const r = (await readContract(pc, {
            address: rep,
            abi: reputationRegistryReadAbi,
            functionName: "getSummary",
            args: [agentId, [...clientAddresses], tag1, tag2],
          })) as readonly [bigint, bigint, number];
          return {
            count: r[0],
            summaryValue: r[1],
            summaryValueDecimals: r[2],
          };
        },
        getLastIndex: (agentId, clientAddress) =>
          readContract(pc, {
            address: rep,
            abi: reputationRegistryReadAbi,
            functionName: "getLastIndex",
            args: [agentId, clientAddress],
          }),
      },
      validation: {
        getValidationStatus: async (requestHash) => {
          const r = (await readContract(pc, {
            address: val,
            abi: validationRegistryReadAbi,
            functionName: "getValidationStatus",
            args: [requestHash],
          })) as readonly [Address, bigint, number, `0x${string}`, string, bigint];
          return {
            validatorAddress: r[0],
            agentId: r[1],
            response: r[2],
            responseHash: r[3],
            tag: r[4],
            lastUpdate: r[5],
          };
        },
        getSummary: async (agentId, validatorAddresses, tag) => {
          const r = (await readContract(pc, {
            address: val,
            abi: validationRegistryReadAbi,
            functionName: "getSummary",
            args: [agentId, [...validatorAddresses], tag],
          })) as readonly [bigint, number];
          return { count: r[0], averageResponse: r[1] };
        },
      },
    };
  }

  /** Wallet / local account writes (gas on the caller). */
  forAccount(account: Account): BeamChainWriteApi {
    const chain = viemChainFor(
      this.runtime.network,
      this.runtime.chainId,
      this.runtime.rpcUrl,
    );
    const walletClient: WalletClient<Transport, Chain, Account> = createWalletClient({
      account,
      chain,
      transport: http(this.runtime.rpcUrl),
    });
    const id = this.addresses.identityRegistry;
    const rep = this.addresses.reputationRegistry;
    const val = this.addresses.validationRegistry;

    return {
      identity: {
        register: () =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "register",
            args: [],
          }),
        registerWithUri: (agentURI) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "register",
            args: [agentURI],
          }),
        registerWithMetadataAndFees: (agentURI, metadata, feesPerDay) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "registerWithMetadataAndFees",
            args: [
              agentURI,
              metadata.map((m) => ({
                metadataKey: m.metadataKey,
                metadataValue: m.metadataValue,
              })),
              feesPerDay,
            ],
          }),
        setAgentURI: (agentId, newURI) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "setAgentURI",
            args: [agentId, newURI],
          }),
        setMetadata: (agentId, metadataKey, metadataValue) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "setMetadata",
            args: [agentId, metadataKey, metadataValue],
          }),
        unsetAgentWallet: (agentId) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "unsetAgentWallet",
            args: [agentId],
          }),
        setAgentWallet: (agentId, newWallet, deadline, signature) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "setAgentWallet",
            args: [agentId, newWallet, deadline, signature],
          }),
        transfer: (from, to, tokenId, sealedKey, proof) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "transfer",
            args: [from, to, tokenId, sealedKey, proof],
          }),
        clone: (to, tokenId, sealedKey, proof) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "clone",
            args: [to, tokenId, sealedKey, proof],
          }),
        subscribe: (agentId, numDays, opts) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "subscribe",
            args: [agentId, numDays],
            value: opts?.value,
          }),
        unsubscribe: (agentId) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "unsubscribe",
            args: [agentId],
          }),
        setFees: (agentId, feePerDay) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "setFees",
            args: [agentId, feePerDay],
          }),
        transferFrom: (from, to, tokenId) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "transferFrom",
            args: [from, to, tokenId],
          }),
        safeTransferFrom: (from, to, tokenId) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "safeTransferFrom",
            args: [from, to, tokenId],
          }),
        approve: (to, tokenId) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "approve",
            args: [to, tokenId],
          }),
        setApprovalForAll: (operator, approved) =>
          writeContract(walletClient, {
            address: id,
            abi: identityRegistryWriteAbi,
            functionName: "setApprovalForAll",
            args: [operator, approved],
          }),
      },
      reputation: {
        giveFeedback: (a) =>
          writeContract(walletClient, {
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
              a.feedbackHash,
            ],
          }),
        revokeFeedback: (agentId, feedbackIndex) =>
          writeContract(walletClient, {
            address: rep,
            abi: reputationRegistryWriteAbi,
            functionName: "revokeFeedback",
            args: [agentId, feedbackIndex],
          }),
        appendResponse: (agentId, clientAddress, feedbackIndex, responseURI, responseHash) =>
          writeContract(walletClient, {
            address: rep,
            abi: reputationRegistryWriteAbi,
            functionName: "appendResponse",
            args: [agentId, clientAddress, feedbackIndex, responseURI, responseHash],
          }),
      },
      validation: {
        validationRequest: (validatorAddress, agentId, requestURI, requestHash) =>
          writeContract(walletClient, {
            address: val,
            abi: validationRegistryWriteAbi,
            functionName: "validationRequest",
            args: [validatorAddress, agentId, requestURI, requestHash],
          }),
        validationResponse: (requestHash, response, responseURI, responseHash, tag) =>
          writeContract(walletClient, {
            address: val,
            abi: validationRegistryWriteAbi,
            functionName: "validationResponse",
            args: [requestHash, response, responseURI, responseHash, tag],
          }),
      },
    };
  }
}
