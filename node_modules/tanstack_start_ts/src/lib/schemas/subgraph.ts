import { z } from "zod";

export const subgraphAgentRefSchema = z
  .object({
    agentId: z.string(),
    uri: z.string().nullable().optional(),
    isCloned: z.boolean().optional(),
    owner: z.string().optional(),
  })
  .nullable()
  .optional();

export const userSubscriptionNodeSchema = z.object({
  id: z.string(),
  user: z.string(),
  agentId: z.string(),
  paidAmount: z.string(),
  endDate: z.string(),
  windowStart: z.string(),
  blockNumber: z.string(),
  blockTimestamp: z.string(),
  transactionHash: z.string(),
  agent: subgraphAgentRefSchema,
});

export const recentSubscriptionsDataSchema = z.object({
  userSubscriptions: z.array(userSubscriptionNodeSchema),
});

export type UserSubscriptionNode = z.infer<typeof userSubscriptionNodeSchema>;

/** Raw `Feedback` row from the subgraph (BigInt fields as strings). */
export const subgraphFeedbackRawSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  clientAddress: z.string(),
  feedbackIndex: z.string(),
  value: z.string(),
  valueDecimals: z.coerce.number(),
  tag1: z.string(),
  tag2: z.string(),
  endpoint: z.string(),
  feedbackURI: z.string(),
  feedbackHash: z.string(),
  revoked: z.boolean(),
  blockNumber: z.string(),
  blockTimestamp: z.string(),
  transactionHash: z.string(),
});

export const feedbacksByAgentDataSchema = z.object({
  feedbacks: z.array(subgraphFeedbackRawSchema),
});

export type SubgraphFeedbackRaw = z.infer<typeof subgraphFeedbackRawSchema>;

/** Raw `FeedbackResponse` row. */
export const subgraphFeedbackResponseRawSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  clientAddress: z.string(),
  feedbackIndex: z.string(),
  responder: z.string(),
  responseURI: z.string(),
  responseHash: z.string(),
  blockNumber: z.string(),
  blockTimestamp: z.string(),
  transactionHash: z.string(),
});

export const feedbackResponsesByAgentDataSchema = z.object({
  feedbackResponses: z.array(subgraphFeedbackResponseRawSchema),
});

export type SubgraphFeedbackResponseRaw = z.infer<typeof subgraphFeedbackResponseRawSchema>;

/** Raw `Validation` row. */
export const subgraphValidationRawSchema = z.object({
  id: z.string(),
  requestHash: z.string(),
  validatorAddress: z.string(),
  agentId: z.string(),
  requestURI: z.string(),
  response: z.coerce.number().nullable().optional(),
  responseURI: z.string().nullable().optional(),
  responseHash: z.string().nullable().optional(),
  tag: z.string().nullable().optional(),
  blockNumber: z.string(),
  blockTimestamp: z.string(),
  transactionHash: z.string(),
});

export const validationsByAgentDataSchema = z.object({
  validations: z.array(subgraphValidationRawSchema),
});

export const validationsByRequestHashDataSchema = z.object({
  validations: z.array(subgraphValidationRawSchema),
});

export type SubgraphValidationRaw = z.infer<typeof subgraphValidationRawSchema>;

/** Nested metadata on `agent { metadata { … } }`. */
export const subgraphAgentMetadataRawSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  key: z.string(),
  value: z.string(),
  updatedBy: z.string(),
  blockNumber: z.string(),
  blockTimestamp: z.string(),
  transactionHash: z.string(),
});

/** Stub row for `agent.subscriptions { id }` (length used as subscription count). */
export const subgraphAgentSubscriptionStubSchema = z.object({
  id: z.string(),
});

export const subgraphAgentCoreRowSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  owner: z.string(),
  uri: z.string().nullable().optional(),
  agentWallet: z.string().nullable().optional(),
  feePerDay: z.string().nullable().optional(),
  isCloned: z.boolean().default(false),
  blockNumber: z.string(),
  blockTimestamp: z.string(),
  transactionHash: z.string(),
});

export const subgraphAgentRowSchema = subgraphAgentCoreRowSchema.extend({
  metadata: z.array(subgraphAgentMetadataRawSchema),
  subscriptions: z
    .array(subgraphAgentSubscriptionStubSchema)
    .nullish()
    .transform((v) => v ?? []),
});

export const agentByIdDataSchema = z.object({
  agent: subgraphAgentRowSchema.nullable(),
});

export const agentsListDataSchema = z.object({
  agents: z.array(subgraphAgentRowSchema),
});

export type SubgraphAgentRow = z.output<typeof subgraphAgentRowSchema>;
export type SubgraphAgentCoreRow = z.output<typeof subgraphAgentCoreRowSchema>;
export type SubgraphAgentMetadataRaw = z.infer<typeof subgraphAgentMetadataRawSchema>;

export const userSubscriptionsPageDataSchema = z.object({
  userSubscriptions: z.array(userSubscriptionNodeSchema),
});
