import type { Agent, AgentMetadata, GetAgentByAgentId, GetAgents, GetAgentMetadata } from "../types";

export interface IAgents {
  getAgents(params: GetAgents): Promise<Agent[]>;
  getAgentByAgentId(params: GetAgentByAgentId): Promise<Agent | null>;
  getAgentMetadata(params: GetAgentMetadata): Promise<AgentMetadata[]>;
}

