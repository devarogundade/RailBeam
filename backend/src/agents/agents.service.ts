import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { OgComputeService, type ChatMessage } from '../og/og-compute.service';
import { OgStorageService } from '../og/og-storage.service';
import { decryptString, encryptString } from '../crypto/seal';
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

  async getAgentOnchain(agentId: number): Promise<ChainAgent> {
    const reg = this.identityRegistryContract();

    const tokenURIJson = (await reg.tokenURI(agentId)) as string;
    const metadataRootHash = (await reg.getMetadata(
      agentId,
      'encryptedConfig',
    )) as ethers.BytesLike;

    const parsedTokenURI = safeJsonParse<AgentCardRegistrationV1>(tokenURIJson);
    const encryptedConfig = await this.storage.getString(
      ethers.hexlify(metadataRootHash),
    );

    const decryptedConfig = decryptString(encryptedConfig, this.pk());

    return { parsedTokenURI, decryptedConfig };
  }

  async chatWithAgent(params: {
    agentId: number;
    message: string;
    network?: string;
    providerAddress?: string;
  }): Promise<ChatWithAgentResponse> {
    const agent = await this.getAgentOnchain(params.agentId);

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
            Reply format: { "type": "text" | "x402", "content": <string> }
            
            Example1: { "type": "text", "content": "Hello, world!" }
            Example2: { "type": "x402", "content": "{"text": "Hello, world!", "resource": "https://example.com/resource", "amount": 100, "asset": "USD" }" }
          `,
        },
        { role: 'user', content: params.message },
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
