import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import { ethers } from 'ethers';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OgComputeChatResult = {
  content: string;
  model: string;
  verified: boolean;
  chatId: string | undefined;
  provider: string;
  computeNetwork: string;
};

type ChatCompletionResponse = {
  id?: string;
  choices?: Array<{ message?: { content?: string } }>;
};

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function parseChatCompletion(data: unknown): { content: string; id?: string } {
  if (!isObject(data)) throw new Error('Invalid JSON response from model');

  const typed = data as ChatCompletionResponse;
  const id = typeof typed.id === 'string' ? typed.id : undefined;
  const content =
    typeof typed.choices?.[0]?.message?.content === 'string'
      ? typed.choices[0].message.content
      : '';

  if (!content) throw new Error('Empty response from model');
  return { content, id };
}

export class OgComputeError extends Error {
  readonly code: 'X402' | 'INFERENCE_FAILED';

  constructor(code: OgComputeError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const COMPUTE_RPCS: Record<string, string> = {
  mainnet: 'https://evmrpc.0g.ai',
  testnet: 'https://evmrpc-testnet.0g.ai',
};

@Injectable()
export class OgComputeService {
  private brokers: Record<
    string,
    Awaited<ReturnType<typeof createZGComputeNetworkBroker>>
  > = {};

  constructor(private readonly config: ConfigService) {}

  private pk(): string {
    return this.config.get<string>('PRIVATE_KEY') ?? '';
  }

  private rpcFor(network: string): string {
    return COMPUTE_RPCS[network] ?? COMPUTE_RPCS.testnet;
  }

  private async broker(network: string) {
    if (!this.brokers[network]) {
      const provider = new ethers.JsonRpcProvider(this.rpcFor(network));
      const wallet = new ethers.Wallet(this.pk(), provider);
      this.brokers[network] = await createZGComputeNetworkBroker(wallet);
    }
    return this.brokers[network];
  }

  private isX402ErrorMessage(msg: string): boolean {
    return (
      msg.includes('AccountNotExists') ||
      msg.includes('Sub-account not found') ||
      msg.includes('Account does not exist')
    );
  }

  async chat(params: {
    messages: ChatMessage[];
    providerAddress?: string;
    network?: string;
    timeoutMs?: number;
  }): Promise<OgComputeChatResult> {
    const network = params.network || 'testnet';
    const timeoutMs = params.timeoutMs ?? 30000;

    let lastError = '';
    for (const tryNetwork of [
      network,
      ...(network !== 'testnet' ? ['testnet'] : []),
    ]) {
      try {
        const broker = await this.broker(tryNetwork);
        let provider = params.providerAddress;
        if (!provider) {
          const services = await broker.inference.listService();
          const chatbot = services.find(
            (s: { serviceType: string }) => s.serviceType === 'chatbot',
          );
          if (!chatbot) {
            lastError = 'No chatbot service available';
            continue;
          }
          provider = chatbot.provider;
        }

        const { endpoint, model } =
          await broker.inference.getServiceMetadata(provider);
        const headers = await broker.inference.getRequestHeaders(provider);

        const resp = await fetch(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ messages: params.messages, model }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!resp.ok) {
          lastError = `Inference HTTP ${resp.status}: ${await resp.text().catch(() => 'unknown')}`;
          throw new Error(lastError);
        }

        const data: unknown = await resp.json();
        const parsed = parseChatCompletion(data);
        const chatIdHeader = resp.headers.get('ZG-Res-Key');
        const chatId =
          typeof chatIdHeader === 'string' && chatIdHeader
            ? chatIdHeader
            : parsed.id;
        let verified = false;
        if (chatId) {
          try {
            verified = !!(await broker.inference.processResponse(
              provider,
              chatId,
            ));
          } catch {
            verified = false;
          }
        }

        return {
          content: parsed.content,
          model,
          verified,
          chatId,
          provider,
          computeNetwork: tryNetwork,
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        lastError = msg;
        if (this.isX402ErrorMessage(msg)) {
          continue;
        }
        break;
      }
    }

    throw new OgComputeError(
      this.isX402ErrorMessage(lastError) ? 'X402' : 'INFERENCE_FAILED',
      lastError || 'Inference failed',
    );
  }
}
