import { z } from "zod";
import { handlerActionIdSchema } from "./handlers.js";

/** Known Beam catalog specialist keys (subgraph / marketplace). */
export const marketplaceSpecialistAgentKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/i);

export const suggestMarketplaceHireInputSchema = z.object({
  specialistAgentKey: marketplaceSpecialistAgentKeySchema,
  specialistName: z.string().min(1).max(80).optional(),
  category: z
    .enum(["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"])
    .optional(),
  /** One line: what the specialist runs for the user (handler names ok). */
  capability: z.string().min(1).max(400).optional(),
  /** Short description of what the user was trying to do. */
  userTask: z.string().min(1).max(500).optional(),
  intro: z.string().max(2000).optional(),
  /** Optional handler the user needs after hiring (for display only). */
  requiredHandler: handlerActionIdSchema.optional(),
});

export type SuggestMarketplaceHireInput = z.infer<typeof suggestMarketplaceHireInputSchema>;
