import { z } from 'zod';
import type { OpenAiCompletionAssistantMessage } from 'src/og/chat-completion.schema';

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

/** Minimal `POST /v1/responses` body we need to read assistant text. */
export const openAiResponsesBodySchema = z
  .object({
    id: z.string().optional(),
    output: z
      .array(z.union([messageOutputSchema, z.record(z.string(), z.unknown())]))
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
  for (const item of out) {
    if (!item || typeof item !== 'object') continue;
    if ((item as { type?: string }).type !== 'message') continue;
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
  }
  const content = texts.join('\n').trim();
  if (!content) {
    throw new Error('Responses API: no assistant output_text found');
  }
  return {
    role: 'assistant',
    content,
    tool_calls: undefined,
    reasoning_content: undefined,
  };
}
