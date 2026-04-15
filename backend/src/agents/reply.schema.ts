import { z } from 'zod';

/**
 * Canonical agent reply shape returned to frontend.
 * - Always `{ type, content }`
 * - `content` is either plain text or a JSON-stringified payload (e.g. for x402 flows)
 */
export const replySchema = z.object({
  type: z.enum(['text', 'x402', 'transaction']),
  content: z.string(),
});

export type Reply = z.infer<typeof replySchema>;
