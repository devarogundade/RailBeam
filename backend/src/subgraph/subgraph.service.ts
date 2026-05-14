import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  fetchActiveSubscribedChainAgentIdsForUser,
  getAgentByChainAgentId as fetchAgentByChainAgentId,
  getAgentById as fetchAgentById,
  getFeedbacksByAgentId as fetchFeedbacksByAgentId,
  getValidationByRequestHash as fetchValidationByRequestHash,
  getValidationsByAgentId as fetchValidationsByAgentId,
} from './client';
import type { Agent, Feedback, Validation } from './types';

@Injectable()
export class SubgraphService {
  constructor(private readonly config: ConfigService) {}

  private url(): string | undefined {
    return this.config.get<string>('STARDORM_SUBGRAPH_URL')?.trim() || undefined;
  }

  getAgentByGraphEntityId(id: string): Promise<Agent | null> {
    return fetchAgentById(id, this.url());
  }

  getAgentByChainAgentId(agentId: bigint | number | string): Promise<Agent | null> {
    return fetchAgentByChainAgentId(agentId, this.url());
  }

  getFeedbacksByAgentId(
    agentId: bigint | number | string,
    paging?: { first?: number; skip?: number },
  ): Promise<Feedback[]> {
    return fetchFeedbacksByAgentId(agentId, {
      subgraphUrl: this.url(),
      ...paging,
    });
  }

  getValidationsByAgentId(
    agentId: bigint | number | string,
    paging?: { first?: number; skip?: number },
  ): Promise<Validation[]> {
    return fetchValidationsByAgentId(agentId, {
      subgraphUrl: this.url(),
      ...paging,
    });
  }

  getValidationByRequestHash(requestHash: string): Promise<Validation | null> {
    return fetchValidationByRequestHash(requestHash, this.url());
  }

  /**
   * Active on-chain hires for `walletAddress` (subscription `endDate` in the future).
   * Returns an empty list when subgraph URL is unset or the query fails.
   */
  async getActiveSubscribedChainAgentIdsForUser(
    walletAddress: string,
  ): Promise<number[]> {
    const url = this.url();
    if (!url) return [];
    const w = walletAddress.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(w)) return [];
    try {
      return await fetchActiveSubscribedChainAgentIdsForUser(
        w as `0x${string}`,
        url,
      );
    } catch {
      return [];
    }
  }
}
