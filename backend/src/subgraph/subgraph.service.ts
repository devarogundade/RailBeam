import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beamEvmTierFromChainId } from '../beam/beam-evm-chain';
import {
  fetchActiveSubscribedChainAgentIdsForUser,
  fetchOwnedCloneChainAgentIdsForUser,
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

  /**
   * Subgraph HTTP endpoint for the client’s selected 0G EVM chain (`X-Beam-Chain-Id`).
   * Uses `STARDORM_SUBGRAPH_URL_MAINNET` / `STARDORM_SUBGRAPH_URL_TESTNET` only.
   */
  subgraphUrlForClientEvmChain(clientEvmChainId?: number | null): string | undefined {
    const main = this.config.get<string>('STARDORM_SUBGRAPH_URL_MAINNET')?.trim();
    const test = this.config.get<string>('STARDORM_SUBGRAPH_URL_TESTNET')?.trim();
    const tier = beamEvmTierFromChainId(clientEvmChainId ?? undefined);
    if (tier === 'mainnet') return main || undefined;
    if (tier === 'testnet') return test || undefined;
    return main || test || undefined;
  }

  getAgentByGraphEntityId(
    id: string,
    clientEvmChainId?: number | null,
  ): Promise<Agent | null> {
    const url = this.subgraphUrlForClientEvmChain(clientEvmChainId);
    if (!url) return Promise.resolve(null);
    return fetchAgentById(id, url);
  }

  getAgentByChainAgentId(
    agentId: bigint | number | string,
    clientEvmChainId?: number | null,
  ): Promise<Agent | null> {
    const url = this.subgraphUrlForClientEvmChain(clientEvmChainId);
    if (!url) return Promise.resolve(null);
    return fetchAgentByChainAgentId(agentId, url);
  }

  getFeedbacksByAgentId(
    agentId: bigint | number | string,
    paging?: { first?: number; skip?: number; clientEvmChainId?: number | null },
  ): Promise<Feedback[]> {
    const url = this.subgraphUrlForClientEvmChain(paging?.clientEvmChainId);
    if (!url) return Promise.resolve([]);
    return fetchFeedbacksByAgentId(agentId, {
      subgraphUrl: url,
      first: paging?.first,
      skip: paging?.skip,
    });
  }

  getValidationsByAgentId(
    agentId: bigint | number | string,
    paging?: { first?: number; skip?: number; clientEvmChainId?: number | null },
  ): Promise<Validation[]> {
    const url = this.subgraphUrlForClientEvmChain(paging?.clientEvmChainId);
    if (!url) return Promise.resolve([]);
    return fetchValidationsByAgentId(agentId, {
      subgraphUrl: url,
      first: paging?.first,
      skip: paging?.skip,
    });
  }

  getValidationByRequestHash(
    requestHash: string,
    clientEvmChainId?: number | null,
  ): Promise<Validation | null> {
    const url = this.subgraphUrlForClientEvmChain(clientEvmChainId);
    if (!url) return Promise.resolve(null);
    return fetchValidationByRequestHash(requestHash, url);
  }

  /**
   * Active on-chain hires for `walletAddress`: subscription `endDate` in the future on a
   * **canonical** registry agent (`isCloned` is not true). Clone-token subscriptions are omitted.
   * Returns an empty list when subgraph URL is unset or the query fails.
   */
  async getActiveSubscribedChainAgentIdsForUser(
    walletAddress: string,
    clientEvmChainId?: number | null,
  ): Promise<number[]> {
    const url = this.subgraphUrlForClientEvmChain(clientEvmChainId);
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

  /**
   * Registry clone tokens owned by the wallet (`isCloned: true`). These are excluded
   * from hire subscriptions but should still unlock handler tools in chat.
   */
  async getOwnedCloneChainAgentIdsForUser(
    walletAddress: string,
    clientEvmChainId?: number | null,
  ): Promise<number[]> {
    const url = this.subgraphUrlForClientEvmChain(clientEvmChainId);
    if (!url) return [];
    const w = walletAddress.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(w)) return [];
    try {
      return await fetchOwnedCloneChainAgentIdsForUser(
        w as `0x${string}`,
        url,
      );
    } catch {
      return [];
    }
  }
}
