import { z } from "zod";
import { agentCategorySchema, agentsListSchema } from "./agent.js";

export const catalogResponseSchema = z.object({
  agents: agentsListSchema,
  categories: z.array(agentCategorySchema),
  defaultHiredIds: z.array(z.string().min(1)),
  chatSuggestions: z.array(z.string()),
});

export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
