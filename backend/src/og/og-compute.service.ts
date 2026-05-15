import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createZGComputeNetworkBroker } from '@0gfoundation/0g-compute-ts-sdk';
import { ethers } from 'ethers';

import type { OpenAiChatTool } from 'src/agent-reply/stardorm-handler-tools';
import {
  parseOpenAiChatCompletionBody,
  type OpenAiCompletionAssistantMessage,
} from 'src/og/chat-completion.schema';
import { activeOgRpcUrl } from 'src/og/beam-og.config';
import { parseOpenAiResponsesAssistant } from 'src/og/og-openai-responses.schema';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OgComputeChatOptions = {
  /** Prepended as an extra system message (e.g. tool-calling instructions). */
  prependSystem?: string;
  /** OpenAI-compatible `tools` (e.g. function tools for handler CTAs). */
  tools?: OpenAiChatTool[];
  /** OpenAI-compatible `tool_choice` (default when tools set: `auto`). */
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  /**
   * OpenAI `conv_*` id for `POST /v1/responses` `conversation` (omit to create a new one).
   */
  openAiConversationId?: string | null;
};

export type OgComputeChatResult = {
  /**
   * Validated `choices[0].message` from the provider (user-visible `content`
   * plus optional `tool_calls` used to build rich bubbles / handler CTAs).
   */
  assistantMessage: OpenAiCompletionAssistantMessage;
  model: string;
  verified: boolean;
  chatId: string | undefined;
  provider: string;
  computeNetwork: string;
  /** Echo of files stored on the user message (0G root hashes). */
  attachments?: Array<{
    id: string;
    hash: string;
    name: string;
    mimeType: string;
  }>;
  /** Returned the first time we create `POST /v1/conversations` for this Beam thread. */
  openAiConversationId?: string;
};

@Injectable()
export class OgComputeService {
  private readonly logger = new Logger(OgComputeService.name);

  constructor(private readonly config: ConfigService) {}

  private rpcUrl(): string {
    return activeOgRpcUrl(this.config);
  }

  private pk(): string {
    return this.config.get<string>('PRIVATE_KEY') ?? '';
  }

  private inferenceV1BaseFromChatEndpoint(endpoint: string): string {
    return endpoint.trim().replace(/\/$/, '').replace(/\/chat\/completions$/i, '');
  }

  private inferenceUseResponsesApi(): boolean {
    const v = this.config.get<string>('INFERENCE_USE_RESPONSES_API');
    return v?.toLowerCase() === 'true' || v === '1';
  }

  /** Map chat-completions `tool_choice` to Responses API `tool_choice`. */
  private toolChoiceForResponsesApi(
    toolChoice: OgComputeChatOptions['toolChoice'] | undefined,
  ): unknown {
    if (toolChoice == null) return undefined;
    if (toolChoice === 'auto' || toolChoice === 'none') return toolChoice;
    if (
      toolChoice.type === 'function' &&
      typeof toolChoice.function?.name === 'string'
    ) {
      return { type: 'function', name: toolChoice.function.name };
    }
    return toolChoice;
  }

  private async verifyInferenceResponse(
    broker: Awaited<ReturnType<typeof createZGComputeNetworkBroker>>,
    providerAddr: string,
    chatId: string | undefined,
  ): Promise<boolean> {
    if (!chatId) return false;
    try {
      return !!(await broker.inference.processResponse(providerAddr, chatId));
    } catch {
      return false;
    }
  }

  private async chatViaChatCompletions(args: {
    endpoint: string;
    model: string;
    headers: Record<string, string>;
    finalPrompt: ChatMessage[];
    tools?: OpenAiChatTool[];
    toolChoice?: OgComputeChatOptions['toolChoice'];
    broker: Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;
    providerAddr: string;
  }): Promise<OgComputeChatResult> {
    const {
      endpoint,
      model,
      headers,
      finalPrompt,
      tools,
      toolChoice,
      broker,
      providerAddr,
    } = args;
    const body: Record<string, unknown> = {
      messages: finalPrompt,
      model,
    };
    if (tools?.length) {
      body.tools = tools;
      body.tool_choice = toolChoice ?? 'auto';
    }

    const resp = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(
        `Inference HTTP ${resp.status}: ${await resp.text().catch(() => 'unknown')}`,
      );
    }

    const data: unknown = await resp.json();
    const parsed = parseOpenAiChatCompletionBody(data);
    const chatIdHeader = resp.headers.get('ZG-Res-Key');
    const chatId =
      typeof chatIdHeader === 'string' && chatIdHeader
        ? chatIdHeader
        : parsed.id;
    const verified = await this.verifyInferenceResponse(
      broker,
      providerAddr,
      chatId,
    );

    return {
      assistantMessage: parsed.assistant,
      model,
      verified,
      chatId,
      provider: providerAddr,
      computeNetwork: 'testnet',
    };
  }

  /**
   * `POST /v1/conversations` then `POST /v1/responses` with `conversation` + `input`.
   * Returns `null` if the provider does not expose these routes (caller may fall back).
   */
  private async tryChatViaResponsesApi(args: {
    baseUrl: string;
    model: string;
    headers: Record<string, string>;
    finalPrompt: ChatMessage[];
    tools?: OpenAiChatTool[];
    toolChoice?: OgComputeChatOptions['toolChoice'];
    existingOpenAiConversationId?: string;
    broker: Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;
    providerAddr: string;
  }): Promise<OgComputeChatResult | null> {
    const {
      baseUrl,
      model,
      headers,
      finalPrompt,
      tools,
      toolChoice,
      existingOpenAiConversationId,
      broker,
      providerAddr,
    } = args;

    let conversationId = existingOpenAiConversationId?.trim() || undefined;
    let newOpenAiConversationId: string | undefined;

    if (!conversationId) {
      const convResp = await fetch(`${baseUrl}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: '{}',
      });
      if (!convResp.ok) {
        return null;
      }
      const convJson: unknown = await convResp.json();
      const id =
        convJson &&
        typeof convJson === 'object' &&
        typeof (convJson as { id?: unknown }).id === 'string'
          ? (convJson as { id: string }).id
          : undefined;
      if (!id) {
        return null;
      }
      conversationId = id;
      newOpenAiConversationId = id;
    }

    const systemParts = finalPrompt
      .filter((m) => m.role === 'system')
      .map((m) => m.content.trim())
      .filter(Boolean);
    const instructions =
      systemParts.length > 0 ? systemParts.join('\n\n') : undefined;

    const userMessages = finalPrompt.filter((m) => m.role === 'user');
    const input =
      userMessages.length > 0
        ? userMessages[userMessages.length - 1].content
        : '';

    const respBody: Record<string, unknown> = {
      model,
      conversation: conversationId,
      input,
    };
    if (instructions) {
      respBody.instructions = instructions;
    }
    if (tools?.length) {
      respBody.tools = tools;
      respBody.tool_choice =
        this.toolChoiceForResponsesApi(toolChoice) ?? 'auto';
    }

    const resp = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(respBody),
    });

    if (!resp.ok) {
      return null;
    }

    const data: unknown = await resp.json();
    let assistantMessage: OpenAiCompletionAssistantMessage;
    try {
      assistantMessage = parseOpenAiResponsesAssistant(data);
    } catch {
      return null;
    }
    const chatIdHeader = resp.headers.get('ZG-Res-Key');
    const respId =
      data &&
      typeof data === 'object' &&
      typeof (data as { id?: unknown }).id === 'string'
        ? (data as { id: string }).id
        : undefined;
    const chatId =
      typeof chatIdHeader === 'string' && chatIdHeader
        ? chatIdHeader
        : respId;
    const verified = await this.verifyInferenceResponse(
      broker,
      providerAddr,
      chatId,
    );

    return {
      assistantMessage,
      model,
      verified,
      chatId,
      provider: providerAddr,
      computeNetwork: 'testnet',
      ...(newOpenAiConversationId
        ? { openAiConversationId: newOpenAiConversationId }
        : {}),
    };
  }

  async chat(
    prompt: ChatMessage[],
    opts?: OgComputeChatOptions,
  ): Promise<OgComputeChatResult> {
    const pk = this.pk();
    if (!pk) {
      throw new Error('PRIVATE_KEY is required for 0G inference');
    }

    const finalPrompt: ChatMessage[] = opts?.prependSystem
      ? [{ role: 'system', content: opts.prependSystem }, ...prompt]
      : prompt;
    const provider = new ethers.JsonRpcProvider(this.rpcUrl());
    const wallet = new ethers.Wallet(pk, provider);
    const broker = await createZGComputeNetworkBroker(wallet);

    const services = await broker.inference.listService();
    const chatbot = services.find(
      (s: { serviceType: string }) => s.serviceType === 'chatbot',
    );

    if (!chatbot) {
      throw new Error('No chatbot service available');
    }

    const { endpoint, model } = await broker.inference.getServiceMetadata(
      chatbot.provider,
    );

    const headers = await broker.inference.getRequestHeaders(chatbot.provider);

    const baseUrl = this.inferenceV1BaseFromChatEndpoint(endpoint);
    const viaResponses = await this.tryChatViaResponsesApi({
      baseUrl,
      model,
      headers: headers as unknown as Record<string, string>,
      finalPrompt,
      tools: opts?.tools,
      toolChoice: opts?.toolChoice,
      existingOpenAiConversationId:
        opts?.openAiConversationId?.trim() || undefined,
      broker,
      providerAddr: chatbot.provider,
    });
    if (viaResponses) {
      return viaResponses;
    }
    if (this.inferenceUseResponsesApi()) {
      this.logger.warn(
        'INFERENCE_USE_RESPONSES_API is set but /conversations or /responses failed; falling back to /chat/completions',
      );
    }

    return this.chatViaChatCompletions({
      endpoint,
      model,
      headers: headers as unknown as Record<string, string>,
      finalPrompt,
      tools: opts?.tools,
      toolChoice: opts?.toolChoice,
      broker,
      providerAddr: chatbot.provider,
    });
  }
}
