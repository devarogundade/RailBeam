import { z } from "zod";

/** One feedback row from the Stardorm subgraph (ReputationRegistry `NewFeedback`). */
export const agentOnchainFeedbackItemSchema = z.object({
  id: z.string(),
  agentId: z.number(),
  clientAddress: z.string(),
  feedbackIndex: z.string(),
  value: z.string(),
  valueDecimals: z.number().int().min(0).max(18),
  tag1: z.string(),
  tag2: z.string(),
  endpoint: z.string(),
  feedbackURI: z.string(),
  feedbackHash: z.string(),
  revoked: z.boolean(),
  blockNumber: z.number(),
  blockTimestamp: z.number(),
  transactionHash: z.string(),
});

export type AgentOnchainFeedbackItem = z.infer<typeof agentOnchainFeedbackItemSchema>;

/** Query string for `GET /agents/:agentKey/feedbacks` (subgraph `first` / `skip`). */
export const agentFeedbacksQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return 20;
      const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
      if (!Number.isFinite(n)) return 20;
      return Math.min(50, Math.max(1, Math.trunc(n)));
    }),
  skip: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return 0;
      const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.trunc(n));
    }),
});

export type AgentFeedbacksQuery = z.infer<typeof agentFeedbacksQuerySchema>;

/** Paginated page (infinite scroll / cursor-style skip). */
export const agentFeedbacksPageResponseSchema = z.object({
  feedbacks: z.array(agentOnchainFeedbackItemSchema),
  page: z.object({
    limit: z.number().int().min(1).max(50),
    skip: z.number().int().min(0),
    hasMore: z.boolean(),
  }),
});

export type AgentFeedbacksPageResponse = z.infer<typeof agentFeedbacksPageResponseSchema>;
