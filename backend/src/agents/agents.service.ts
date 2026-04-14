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
];

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

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
      'https://evmrpc-testnet.0g.ai'
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
    const ttlSeconds = 10 * 60;
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
    const agentWallet = (await reg.getMetadata(
      agentId,
      'agentWallet',
    )) as string;

    const parsedTokenURI = safeJsonParse<AgentCardRegistrationV1>(tokenURIJson);
    const encryptedConfig = await this.storage.getString(
      ethers.hexlify(metadataRootHash),
    );

    const decryptedConfig = decryptString(encryptedConfig, this.pk());

    return { parsedTokenURI, decryptedConfig, agentWallet };
  }

  async chatWithAgent(params: {
    agentId: number;
    message: string;
    network?: string;
    userAddress?: string;
    providerAddress?: string;
  }): Promise<ChatWithAgentResponse> {
    // Cache onchain reads for chat, to avoid repeated RPC/storage hits.
    const agent = await this.getAgentOnchainCached(params.agentId);

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `
            You are a helpful AI agent. If you need to return structured data, return JSON only.
            `,
        },
        {
          role: 'system',
          content: `Agent metadata: ${JSON.stringify(agent.parsedTokenURI)}`,
        },
        {
          role: 'system',
          content: `Agent config (may be null): ${agent.decryptedConfig}`,
        },
        {
          role: 'system',
          content: `
            Agent config may include x402 payment acceptance details. If present, use them to guide the user to pay for paid content/actions.

            When you want the client to initiate an x402 payment flow, respond with type "x402" and put a JSON-stringified payload in "content".

            Reply format: { "type": "text" | "x402", "content": <string> }

            Example (text):
            { "type": "text", "content": "Hello, world!" }

            Example (x402):
            {
              "type": "x402",
              "content": "{\\"text\\":\\"Please complete payment to continue.\\",\\"resource\\":\\"https://example.com/resource/pay/<resourceId>\\",\\"amount\\":\\"1000000\\",\\"currency\\":\\"USDC\\",\\"network\\":\\"eip155:16601\\",\\"payTo\\":\\"<agentWallet>\\",\\"asset\\":\\"0x...\\",\\"title\\":\\"Paid resource\\"}"
            }
          `,
        },
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
}
