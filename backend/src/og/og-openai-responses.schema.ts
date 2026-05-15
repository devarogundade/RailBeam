import { z } from 'zod';
import {
  openAiCompletionToolCallSchema,
  openAiToolFunctionArgumentsSchema,
  type OpenAiCompletionAssistantMessage,
} from 'src/og/chat-completion.schema';

const outputTextBlockSchema = z.object({
  type: z.literal('output_text'),
  text: z.string(),
});

const messageOutputSchema = z.object({
  type: z.literal('message'),
  role: z.string().optional(),
  content: z.array(
    z.union([outputTextBlockSchema, z.record(z.string(), z.unknown())]),
  ),
});

const functionCallOutputSchema = z.object({
  type: z.literal('function_call'),
  call_id: z.string().optional(),
  id: z.string().optional(),
  name: z.string(),
  arguments: openAiToolFunctionArgumentsSchema.optional().default('{}'),
});

/** Minimal `POST /v1/responses` body we need to read assistant text / tool calls. */
export const openAiResponsesBodySchema = z
  .object({
    id: z.string().optional(),
    output: z
      .array(
        z.union([
          messageOutputSchema,
          functionCallOutputSchema,
          z.record(z.string(), z.unknown()),
        ]),
      )
      .optional(),
  })
  .passthrough();

export type OpenAiResponsesBody = z.infer<typeof openAiResponsesBodySchema>;

export function parseOpenAiResponsesAssistant(
  data: unknown,
): OpenAiCompletionAssistantMessage {
  const parsed = openAiResponsesBodySchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid Responses API JSON: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  const out = parsed.data.output ?? [];
  const texts: string[] = [];
  const rawToolCalls: Array<{
    id?: string;
    type?: string;
    function: { name: string; arguments: string };
  }> = [];

  for (const item of out) {
    if (!item || typeof item !== 'object') continue;
    const type = (item as { type?: string }).type;

    if (type === 'message') {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (
          block &&
          typeof block === 'object' &&
          (block as { type?: string }).type === 'output_text' &&
          typeof (block as { text?: unknown }).text === 'string'
        ) {
          texts.push((block as { text: string }).text);
        }
      }
      continue;
    }

    if (type === 'function_call') {
      const fc = functionCallOutputSchema.safeParse(item);
      if (!fc.success) continue;
      rawToolCalls.push({
        id: fc.data.call_id ?? fc.data.id ?? '',
        type: 'function',
        function: {
          name: fc.data.name,
          arguments: fc.data.arguments,
        },
      });
    }
  }

  const content = texts.join('\n').trim();
  const tool_calls =
    rawToolCalls.length > 0
      ? rawToolCalls.map((tc) => openAiCompletionToolCallSchema.parse(tc))
      : undefined;

  const hasBody =
    content.length > 0 || (tool_calls != null && tool_calls.length > 0);
  if (!hasBody) {
    throw new Error(
      'Responses API: no assistant output_text or function_call found',
    );
  }

  return {
    role: 'assistant',
    content,
    tool_calls,
    reasoning_content: undefined,
  };
}
