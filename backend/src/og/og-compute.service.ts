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

const COMPUTE_RPC = 'https://evmrpc.0g.ai';

@Injectable()
export class OgComputeService {
  constructor(private readonly config: ConfigService) {}

  private pk(): string {
    return this.config.get<string>('PRIVATE_KEY') ?? '';
  }

  async chat(params: {
    messages: ChatMessage[];
    senderAddress?: string;
    providerAddress?: string;
    network?: string;
    timeoutMs?: number;
  }): Promise<OgComputeChatResult> {
    const provider = new ethers.JsonRpcProvider(COMPUTE_RPC);
    const wallet = new ethers.Wallet(this.pk(), provider);
    const broker = await createZGComputeNetworkBroker(wallet);

    let providerAddress = params.providerAddress;

    if (!providerAddress) {
      const services = await broker.inference.listService();
      const chatbot = services.find(
        (s: { serviceType: string }) => s.serviceType === 'chatbot',
      );
      if (!chatbot) {
        throw new Error('No chatbot service available');
      }
      providerAddress = chatbot.provider;
    }

    // await broker.ledger.depositFund(3);

    const { endpoint, model } =
      await broker.inference.getServiceMetadata(providerAddress);

    const headers = await broker.inference.getRequestHeaders(providerAddress);

    const resp = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ messages: params.messages, model }),
    });

    if (!resp.ok) {
      throw new Error(
        `Inference HTTP ${resp.status}: ${await resp.text().catch(() => 'unknown')}`,
      );
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
          providerAddress,
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
      provider: providerAddress,
      computeNetwork: 'mainnet',
    };
  }
}
