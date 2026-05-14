import { z } from "zod";

export const agentCategorySchema = z.enum([
  "Payments",
  "Taxes",
  "Reports",
  "DeFi",
  "Compliance",
  "General",
]);

export const skillHandleSchema = z.object({
  handle: z.string().min(1),
  label: z.string().min(1),
});

export const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  handle: z.string().min(1),
  avatar: z.string().url(),
  category: agentCategorySchema,
  tagline: z.string(),
  description: z.string(),
  /** From on-chain feedback / analytics when wired; omit if unknown. */
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().nonnegative().optional(),
  hires: z.number().int().nonnegative().optional(),
  reputation: z.number().min(0).max(100).optional(),
  /** Estimated from indexer `feePerDay` (wei) when available; omit if unknown. */
  pricePerMonth: z.number().nonnegative().optional(),
  /** Raw `feePerDay` (wei, decimal string) straight from the subgraph. Used to compute `subscribe` msg.value without a contract read. */
  feePerDayWei: z.string().regex(/^\d+$/).optional(),
  /** Presence-only when we have a live signal; omit if unknown. */
  online: z.boolean().optional(),
  skills: z.array(z.string()),
  creator: z.string().min(1),
  skillHandles: z.array(skillHandleSchema).optional(),
  chainAgentId: z.number().int().positive().optional(),
});

export const agentsListSchema = z.array(agentSchema).nonempty();

export type AgentCategory = z.infer<typeof agentCategorySchema>;
export type SkillHandle = z.infer<typeof skillHandleSchema>;
export type Agent = z.infer<typeof agentSchema>;
