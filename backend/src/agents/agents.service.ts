import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { OgComputeService, type ChatMessage } from '../og/og-compute.service';
import { OgStorageService } from '../og/og-storage.service';
import { decryptString, encryptString } from '../crypto/seal';
import { RedisService } from '../redis/redis.service';
import type {
  AgentCardRegistrationV1,
  ChainAgent,
  ChatWithAgentResponse,
} from './agents.types';
import { replySchema } from './reply.schema';

const IDENTITY_REGISTRY_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)',
  'function getAgentWallet(uint256 agentId) view returns (address)',
];

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

type AgentConfig = Record<string, unknown> & {
  knowledgebaseHtml?: string;
};

type PreviousMessageInput = { role?: 'user' | 'assistant'; content?: string };

@Injectable()
export class AgentsService {
  constructor(
    private readonly config: ConfigService,
    private readonly compute: OgComputeService,
    private readonly storage: OgStorageService,
    private readonly redis: RedisService,
  ) {}

  private pk(): string {
    return this.config.get<string>('PRIVATE_KEY') ?? '';
  }

  private rpcUrl(): string {
    return (
      this.config.get<string>('RPC_URL') ??
      this.config.get<string>('OG_RPC_URL') ??
      'https://evmrpc.0g.ai'
    );
  }

  private identityRegistryAddress(): string {
    return this.config.get<string>('IDENTITY_REGISTRY_ADDRESS') ?? '';
  }

  private identityRegistryContract(): ethers.Contract {
    const addr = this.identityRegistryAddress();
    if (!addr) throw new Error('IDENTITY_REGISTRY_ADDRESS is not set');
    const provider = new ethers.JsonRpcProvider(this.rpcUrl());
    return new ethers.Contract(addr, IDENTITY_REGISTRY_ABI, provider);
  }

  private getAgentOnchainCacheKey(params: { agentId: number }): string {
    // Cache must vary by chain RPC + registry address, since those fully determine onchain reads.
    return [
      'agents',
      'getAgentOnchain',
      this.rpcUrl(),
      this.identityRegistryAddress(),
      String(params.agentId),
    ].join(':');
  }

  private async getAgentOnchainCached(agentId: number): Promise<ChainAgent> {
    const ttlSeconds = 30 * 60;
    const key = this.getAgentOnchainCacheKey({ agentId });

    try {
      const cached = await this.redis.getJson<ChainAgent>(key);
      if (cached) return cached;
    } catch {
      // If cache is corrupted/unparseable, evict and continue.
      await this.redis.del(key);
    }

    const fresh = await this.getAgentOnchain(agentId);
    await this.redis.cacheJson(key, fresh, ttlSeconds);
    return fresh;
  }

  async getAgentOnchain(agentId: number): Promise<ChainAgent> {
    const reg = this.identityRegistryContract();

    const tokenURIJson = (await reg.tokenURI(agentId)) as string;
    const metadataRootHash = (await reg.getMetadata(
      agentId,
      'encryptedConfig',
    )) as ethers.BytesLike;
    const agentWallet = (await reg.getAgentWallet(agentId)) as string;

    const parsedTokenURI = safeJsonParse<AgentCardRegistrationV1>(tokenURIJson);
    const encryptedConfig = await this.storage.getString(
      ethers.hexlify(metadataRootHash),
    );

    const decryptedConfig = decryptString(encryptedConfig, this.pk());

    return {
      parsedTokenURI,
      decryptedConfig,
      agentWallet,
    };
  }

  private normalizePreviousMessages(
    input: unknown,
    limit: number,
  ): ChatMessage[] {
    if (!Array.isArray(input)) return [];
    const out: ChatMessage[] = [];
    for (const item of input as PreviousMessageInput[]) {
      if (!item || typeof item !== 'object') continue;
      const role =
        item.role === 'user' || item.role === 'assistant' ? item.role : null;
      const content =
        typeof item.content === 'string' ? item.content.trim() : '';
      if (!role || !content) continue;
      out.push({ role, content });
    }
    return out.slice(-Math.max(0, limit));
  }

  async chatWithAgent(params: {
    agentId: number;
    message: string;
    network?: string;
    userAddress?: string;
    providerAddress?: string;
    previousMessages?: unknown;
  }): Promise<ChatWithAgentResponse> {
    // Cache onchain reads for chat, to avoid repeated RPC/storage hits.
    const agent = await this.getAgentOnchainCached(params.agentId);

    try {
      const previousMessages = this.normalizePreviousMessages(
        params.previousMessages,
        3,
      );

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `
            You are a helpful AI agent.

            You MUST always respond with a single JSON object only (no markdown, no extra text):
            { "type": "text" | "x402" | "transaction", "content": <string> }

            HARD RULES (follow exactly):
            - If you are returning a payment object with fields like kind/merchant/token/amount/resource/payTo, then type MUST be "transaction" or "x402". NEVER use type "text" for payment objects.
            - type "text" means the content is ONLY HTML for a chat bubble. It must NOT be JSON. It must NOT start with "{".
            - type "transaction" means the content is a JSON-stringified object (a string that JSON.parse can parse) describing a transaction CTA.
            - type "x402" means the content is a JSON-stringified object (a string that JSON.parse can parse) describing an x402 payment flow.

            QUICK SELF-CHECK before you answer:
            - If content starts with "<": it is probably type "text".
            - If content starts with "{": it is NOT type "text" (it must be "transaction" or "x402" depending on fields).

            EXAMPLES (copy the pattern, replace values):
            - Correct text:
              { "type": "text", "content": "<p>Hello</p>" }
            - Correct transaction:
              { "type": "transaction", "content": "{\\"text\\":\\"<p>Pay now</p>\\",\\"kind\\":\\"onetime\\",\\"merchant\\":\\"0x...\\",\\"token\\":\\"0x...\\",\\"amount\\":\\"0.001 0G\\",\\"description\\":\\"...\\",\\"splitPayment\\":false}" }
            - WRONG (do not do this):
              { "type": "text", "content": "{\\"kind\\":\\"onetime\\",\\"merchant\\":\\"0x...\\"}" }
            - Wrong: (do not do this)
              {
                "type": "text",
                "content": "{\"text\":\"<p>Great choice!.</p>\n<p>Please confirm the payment and we will send your e-books shortly.</p>\n\",\"kind\":\"onetime\",\"merchant\":\"0xF6EB1b94B2511851c5e8FbfaE8B5C8890C22173c\",\"token\":\"0x0000000000000000000000000000000000000000\",\"amount\":\"0.001001\",\"description\":\"Avatar 2 + Doctor Strange: Mystic Arts\",\"splitPayment\":false,\"payTo\":\"0x10dBf1eC31BE3E41B8ccaa5BcB51a9348f0c57dd\"}",
              }
            - Correct: (do this)
              {
                "type": "transaction",
                "content": "{\"text\":\"<p>Great choice!.</p>\n<p>Please confirm the payment and we will send your e-books shortly.</p>\n\",\"kind\":\"onetime\",\"merchant\":\"0xF6EB1b94B2511851c5e8FbfaE8B5C8890C22173c\",\"token\":\"0x0000000000000000000000000000000000000000\",\"amount\":\"0.001001\",\"description\":\"Avatar 2 + Doctor Strange: Mystic Arts\",\"splitPayment\":false,\"payTo\":\"0x10dBf1eC31BE3E41B8ccaa5BcB51a9348f0c57dd\"}",
              }

            - type "x402": content MUST be a JSON-stringified payload (a string containing valid JSON) that the client uses to start an x402 payment flow. In the payload, only the "text" field is HTML; fields like "title" MUST be plain text (no HTML).
            - type "transaction": content MUST be a JSON-stringified payload (a string containing valid JSON) that the client uses to render a transaction CTA bubble. In the payload, only the "text" field is HTML; fields like "description" MUST be plain text (no HTML).
            
            Agent metadata: ${JSON.stringify(agent.parsedTokenURI)}
            Agent config (may be null): ${agent.decryptedConfig}
            Agent Wallet <payTo> or <merchant>: ${agent.agentWallet}
 
            Agent config is JSON and may include fields such as knowledgebaseHtml (authoritative domain knowledge), x402 resource URLs, pricing/settlement details, merchant identifiers, subscription identifiers, etc. Prefer agent metadata + agent config + the user message as the only sources of concrete values. If the user message includes explicit payment details, you may use those.

            Choosing a payment reply type:
            - Use type "x402" when access is gated by an HTTP x402 paid resource: you have a real resource URL the client should open or resolve (often containing /resource/pay/<id>), and the agent card indicates x402Support is true. x402 is for resource-based paywalls / x402-native flows, not a generic substitute for an arbitrary on-chain transfer when no resource exists.
            - Use type "transaction" with kind "onetime" for a single checkout: one payment amount in a specified token to a merchant address (simple purchase, invoice, cart).
            - Use type "transaction" with kind "recurrent" for an existing subscription product: you need a subscriptionId the backend recognizes plus merchant; token/amount are not the primary contract for this shape.

            x402 (type "x402") requirements:
            - content must be JSON.stringify(...) of an object the pay client can use to start payment. Include at minimum a correct "resource" string when you have one from config or the user.
            - Other common fields (amount, currency, network, payTo, asset, title, etc.) must match what this deployment expects—take them from agent config / user input, not placeholders.
            - Only "text" in that object is HTML; "title" and similar must be plain text.

            Transaction (type "transaction") requirements:
            - content must be JSON.stringify(...) of an object with "text" (HTML), "kind" ("onetime" | "recurrent"), and "merchant" (hex address string).
            - kind "onetime" additionally requires "token" and "amount" (strings as the app expects).
            - kind "recurrent" additionally requires "subscriptionId" (string).
            - Optional: "description" (plain text), "splitPayment" (boolean) for onetime.

            If any required value is missing from agent metadata, agent config, or the user message, do not invent addresses, amounts, URLs, subscription IDs, networks, or token contracts. Respond with type "text" (HTML) explaining what is missing or what the user should provide, or summarize using only information you actually have.

            Minimal shape reminders (replace placeholders only with real values from context):
            - text: { "type": "text", "content": "<p>...</p>" }
            - x402: { "type": "x402", "content": "<stringified JSON with real resource and settlement fields>" }
            - transaction: { "type": "transaction", "content": "<stringified JSON matching kind onetime|recurrent rules above>" }

            SCHEMA (must strictly follow this schema for your outputs):
            {
              "type": "text" | "x402" | "transaction",
              "content": <string>
            }

            CRITICAL: For type "x402" and "transaction", the "content" field MUST be JSON.stringify(...) of an object.
            That means the string itself must be valid JSON. If you include HTML in the payload "text" field, avoid raw
            double quotes inside it (they will break JSON) by using single quotes for attributes (e.g. <a href='ebook://X'>)
            or escaping double quotes as \\".

            "x402": {
              "type": "x402",
              "content": "{
                "text": "<p>...</p>", (your response)
                "resource": "<string> (HTTP URL)", (required from agent config)
                "amount": "<string> (human amount string, not base units)", (required from agent config)
                "currency": "<string>", (required from agent config)
                "network": "<string> (default: 'eip155:16661')", 
                "payTo": "0x... (Ethereum address string)", (required from agent wallet)
                "asset": "0x... (Ethereum address string)", (required from agent config)
                "title": "<string>", (required from agent config)
              }"
            }

            "transaction": {
              "type": "transaction",
              "content": "{
                "text": "<p>...</p>", (your response)
                "kind": "onetime" | "recurrent", (required from agent config)
                "merchant": "0x... (Ethereum address string)",  (required from agent wallet)
                "token": "0x... (Ethereum address string)", (required from agent config)
                "amount": "<string> (human amount string, not base units)", (required from agent config)
                "description": "<string>", (required from agent config)
                "splitPayment": <boolean>, (optional)
                "subscriptionId": "0x... (Ethereum address string)", (required from agent config)
              }"
            }

            Supported Asset/Token addresses: (must be used as the token or asset address)
            - 0G (0G): 0x0000000000000000000000000000000000000000
            - USDC.e (USDC.e): 0x1f3aa82227281ca364bfb3d253b0f1af1da6473e
            - Panda AI (PAI): 0x59ef6f3943bbdfe2fb19565037ac85071223e94c  
            - Wrapped 0G (w0G): 0x1cd0690ff9a693f5ef2dd976660a8dafc81a109c
          `,
        },
        ...previousMessages,
        { role: 'user', content: params.message },
        { role: 'user', content: `Wallet address: ${params.userAddress}` },
      ];

      const result = await this.compute.chat({
        network: params.network,
        providerAddress: params.providerAddress,
        messages,
      });

      const modelJson = safeJsonParse<unknown>(result.content.trim());
      if (modelJson) {
        const parsed = replySchema.safeParse(modelJson);
        if (parsed.success) {
          // Auto-correct: some models incorrectly set type="text" but put a JSON-stringified
          // transaction/x402 payload into content. Detect and normalize to keep UX intact.
          if (parsed.data.type === 'text') {
            const maybePayload = safeJsonParse<unknown>(parsed.data.content);
            if (isPlainObject(maybePayload)) {
              const kind = maybePayload.kind;
              const merchant = maybePayload.merchant;
              const resource = (maybePayload as any).resource;
              const payTo = (maybePayload as any).payTo;
              if (
                (kind === 'onetime' || kind === 'recurrent') &&
                typeof merchant === 'string' &&
                merchant.startsWith('0x')
              ) {
                return {
                  type: 'transaction',
                  content: parsed.data.content,
                  compute: {
                    model: result.model,
                    verified: result.verified,
                    chatId: result.chatId,
                    provider: result.provider,
                    computeNetwork: result.computeNetwork,
                  },
                };
              }
              if (typeof resource === 'string' && typeof payTo === 'string') {
                return {
                  type: 'x402',
                  content: parsed.data.content,
                  compute: {
                    model: result.model,
                    verified: result.verified,
                    chatId: result.chatId,
                    provider: result.provider,
                    computeNetwork: result.computeNetwork,
                  },
                };
              }
            }
          }

          // Guardrail: the pay client expects JSON-parsable payloads for x402/transaction types.
          if (
            parsed.data.type === 'x402' ||
            parsed.data.type === 'transaction'
          ) {
            const payload = safeJsonParse<unknown>(parsed.data.content);
            if (!payload || typeof payload !== 'object') {
              return {
                type: 'text',
                content: parsed.data.content,
                compute: {
                  model: result.model,
                  verified: result.verified,
                  chatId: result.chatId,
                  provider: result.provider,
                  computeNetwork: result.computeNetwork,
                },
              };
            }
          }
          return {
            ...parsed.data,
            compute: {
              model: result.model,
              verified: result.verified,
              chatId: result.chatId,
              provider: result.provider,
              computeNetwork: result.computeNetwork,
            },
          };
        }
      }

      return {
        type: 'text',
        content: result.content,
        compute: {
          model: result.model,
          verified: result.verified,
          chatId: result.chatId,
          provider: result.provider,
          computeNetwork: result.computeNetwork,
        },
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(msg);
    }
  }

  async createEncryptedMetadata(params: { metadataValue: string }): Promise<{
    rootHash: string;
    txHash: string;
  }> {
    const metadata = encryptString(params.metadataValue, this.pk());

    const { rootHash, txHash } = await this.storage.uploadString(metadata);
    if (!txHash) throw new Error('Storage upload returned no txHash');
    return { rootHash, txHash };
  }

  /**
   * Updates the agent's knowledgebase inside the encrypted config JSON and
   * returns a new storage rootHash/txHash pair that can be set onchain as
   * `encryptedConfig`.
   */
  async updateAgentKnowledgebase(params: {
    agentId: number;
    knowledgebaseHtml: string;
  }): Promise<{ rootHash: string; txHash: string; metadataValue: string }> {
    const agent = await this.getAgentOnchain(params.agentId);
    const raw = (agent.decryptedConfig ?? '').trim();

    let cfg: AgentConfig = {};
    if (raw.length > 0) {
      const parsed = safeJsonParse<unknown>(raw);
      if (isPlainObject(parsed)) {
        cfg = parsed as AgentConfig;
      } else {
        // Preserve any legacy non-JSON config without breaking existing fields.
        cfg = { legacyConfig: raw };
      }
    }

    const kb = (params.knowledgebaseHtml ?? '').trim();
    if (!kb) throw new Error('knowledgebaseHtml is required');
    if (kb.length > 250_000) throw new Error('knowledgebaseHtml is too large');

    cfg.knowledgebaseHtml = kb;
    const metadataValue = JSON.stringify(cfg, null, 2);

    const { rootHash, txHash } = await this.createEncryptedMetadata({
      metadataValue,
    });
    return { rootHash, txHash, metadataValue };
  }
}
