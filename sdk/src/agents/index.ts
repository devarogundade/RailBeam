import type { IAgents } from "../interfaces/agents";
import type { Agent, AgentMetadata, GetAgentByAgentId, GetAgents, GetAgentMetadata } from "../types";
import { BaseAgents } from "./base";

export class Agents extends BaseAgents implements IAgents {
  getAgents(params: GetAgents): Promise<Agent[]> {
    return this.graph.getAgents(params.page, params.limit, params.owner);
  }

  getAgentByAgentId(params: GetAgentByAgentId): Promise<Agent | null> {
    return this.graph.getAgentByAgentId(params.agentId);
  }

  getAgentMetadata(params: GetAgentMetadata): Promise<AgentMetadata[]> {
    return this.graph.getAgentMetadata(params.agentId, params.key, params.page, params.limit);
  }
}

