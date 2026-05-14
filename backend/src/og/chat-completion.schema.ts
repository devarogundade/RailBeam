import { z } from 'zod';

/** `function.arguments` is usually a JSON string; coerce rare object/null shapes. */
export const openAiToolFunctionArgumentsSchema = z.preprocess((v) => {
  if (typeof v === 'string') return v;
  if (v == null) return '{}';
  try {
    return JSON.stringify(v);
  } catch {
    return '{}';
  }
}, z.string());

export const openAiCompletionFunctionCallSchema = z.object({
  name: z.string(),
  arguments: openAiToolFunctionArgumentsSchema.optional().default('{}'),
});

export const openAiCompletionToolCallSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    function: openAiCompletionFunctionCallSchema,
  })
  .transform((tc) => ({
    id: tc.id ?? '',
    type: tc.type ?? 'function',
    function: {
      name: tc.function.name,
      arguments: tc.function.arguments ?? '{}',
    },
  }));

export type OpenAiCompletionToolCall = z.infer<typeof openAiCompletionToolCallSchema>;

/** `choices[].message` from POST /v1/chat/completions (OpenAI / 0G Router). */
export const openAiCompletionAssistantMessageSchema = z
  .object({
    role: z.enum(['assistant', 'system', 'user', 'tool']).optional(),
    content: z.union([z.string(), z.null()]).optional(),
    tool_calls: z.array(openAiCompletionToolCallSchema).optional(),
    /** Some providers send reasoning/thinking alongside content (e.g. GLM-5). */
    reasoning_content: z.union([z.string(), z.null()]).optional(),
  })
  .transform((msg) => {
    const c = msg.content;
    const content =
      typeof c === 'string' ? c : c === null || c === undefined ? '' : String(c);
    const rc = msg.reasoning_content;
    const reasoning_content =
      typeof rc === 'string' && rc.length > 0 ? rc : undefined;
    return {
      role: msg.role,
      content,
      tool_calls: msg.tool_calls?.length ? msg.tool_calls : undefined,
      reasoning_content,
    };
  });

export type OpenAiCompletionAssistantMessage = z.infer<
  typeof openAiCompletionAssistantMessageSchema
>;

export const openAiCompletionChoiceSchema = z.object({
  index: z.number().optional(),
  finish_reason: z.string().nullable().optional(),
  message: openAiCompletionAssistantMessageSchema.optional(),
});

export type OpenAiCompletionChoice = z.infer<typeof openAiCompletionChoiceSchema>;

/**
 * Top-level chat completion JSON (minimal fields we read; unknown keys allowed
 * for `usage`, `x_0g_trace`, etc. per 0G Router).
 */
export const openAiChatCompletionResponseSchema = z
  .object({
    id: z.string().optional(),
    object: z.string().optional(),
    created: z.number().optional(),
    model: z.string().optional(),
    choices: z.array(openAiCompletionChoiceSchema).min(1),
  })
  .passthrough();

export type OpenAiChatCompletionResponse = z.infer<
  typeof openAiChatCompletionResponseSchema
>;

export type ParsedOpenAiCompletion = {
  id?: string;
  assistant: OpenAiCompletionAssistantMessage;
};

/**
 * Validates a chat completion body and returns the first assistant `message`.
 * @throws Error when the payload is invalid or has no usable assistant content.
 */
export function parseOpenAiChatCompletionBody(data: unknown): ParsedOpenAiCompletion {
  const parsed = openAiChatCompletionResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid chat completion JSON: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  const id = parsed.data.id;
  const first = parsed.data.choices[0];
  const assistant = first?.message;
  if (!assistant) {
    throw new Error('Chat completion missing choices[0].message');
  }
  const hasBody =
    assistant.content.trim().length > 0 ||
    (assistant.tool_calls != null && assistant.tool_calls.length > 0);
  if (!hasBody) {
    throw new Error('Empty assistant message (no content and no tool_calls)');
  }
  return { id, assistant };
}
