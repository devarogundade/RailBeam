import type {
  Merchant,
  Transaction,
  Confirmation,
  SubscriptionPlan,
  Agent,
  AgentMetadata,
  Feedback,
  FeedbackResponse,
  Validation,
} from "../types";
import type { Hex } from "viem";
import { TransactionStatus, TransactionType } from "../enums";
import { BeamClient } from "../client";

export class Graph {
  private client: BeamClient;

  constructor(client: BeamClient) {
    this.client = client;
  }

  private bigIntValue(v: bigint | number | string): string {
    return typeof v === "bigint" ? v.toString() : String(v);
  }

  async getMerchant(merchant: Hex): Promise<Merchant | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
            merchant(id: "${merchant.toLowerCase()}") {
                id
                merchant
                metadata_schemaVersion
                metadata_value
                wallet
                tokens
                hook
                signers
                minSigners
                blockNumber
                blockTimestamp
                transactionHash
            }
        }`,
      });

      return data.data.merchant;
    } catch (error) {
      return null;
    }
  }

  async getAgent(id: Hex): Promise<Agent | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
          agent(id: "${id.toLowerCase()}") {
            id
            agentId
            owner
            uri
            agentWallet
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      return (data?.data?.agent as Agent | null) ?? null;
    } catch {
      return null;
    }
  }

  async getAgentByAgentId(agentId: bigint | number | string): Promise<Agent | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
          agents(where: { agentId: ${this.bigIntValue(agentId)} }, first: 1) {
            id
            agentId
            owner
            uri
            agentWallet
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      const rows = (data?.data?.agents as Agent[] | undefined) ?? [];
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }

  async getAgents(
    page: number,
    limit: number,
    owner?: Hex
  ): Promise<Agent[]> {
    try {
      const where = owner ? `where: { owner: "${owner.toLowerCase()}" }` : "";
      const data = await this.client.graphCall<any>({
        query: `{
          agents(
            ${where}
            first: ${limit}
            skip: ${(page - 1) * limit}
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            agentId
            owner
            uri
            agentWallet
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      return (data?.data?.agents as Agent[] | undefined) ?? [];
    } catch {
      return [];
    }
  }

  async getAgentMetadata(
    agentId: bigint | number | string,
    key?: string,
    page = 1,
    limit = 100
  ): Promise<AgentMetadata[]> {
    try {
      let filters = `agentId: ${this.bigIntValue(agentId)}`;
      if (key) filters += `, key: "${key}"`;

      const data = await this.client.graphCall<any>({
        query: `{
          agentMetadatas(
            where: { ${filters} }
            first: ${limit}
            skip: ${(page - 1) * limit}
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            agentId
            key
            value
            updatedBy
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      return (data?.data?.agentMetadatas as AgentMetadata[] | undefined) ?? [];
    } catch {
      return [];
    }
  }

  async getFeedback(id: Hex): Promise<Feedback | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
          feedback(id: "${id.toLowerCase()}") {
            id
            agentId
            clientAddress
            feedbackIndex
            value
            valueDecimals
            tag1
            tag2
            endpoint
            feedbackURI
            feedbackHash
            revoked
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      return (data?.data?.feedback as Feedback | null) ?? null;
    } catch {
      return null;
    }
  }

  async getFeedbackResponses(feedbackId: Hex): Promise<FeedbackResponse[]> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
          feedbackResponses(where: { feedback: "${feedbackId.toLowerCase()}" }, orderBy: blockTimestamp, orderDirection: desc, first: 1000) {
            id
            agentId
            clientAddress
            feedbackIndex
            responder
            responseURI
            responseHash
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      return (data?.data?.feedbackResponses as FeedbackResponse[] | undefined) ?? [];
    } catch {
      return [];
    }
  }

  async getFeedbacks(
    page: number,
    limit: number,
    agentId?: bigint | number | string,
    clientAddress?: Hex,
    revoked?: boolean
  ): Promise<Feedback[]> {
    try {
      let filters: string[] = [];
      if (agentId !== undefined) filters.push(`agentId: ${this.bigIntValue(agentId)}`);
      if (clientAddress) filters.push(`clientAddress: "${clientAddress.toLowerCase()}"`);
      if (revoked !== undefined) filters.push(`revoked: ${revoked}`);

      const where = filters.length ? `where: { ${filters.join(", ")} }` : "";
      const data = await this.client.graphCall<any>({
        query: `{
          feedbacks(
            ${where}
            first: ${limit}
            skip: ${(page - 1) * limit}
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            agentId
            clientAddress
            feedbackIndex
            value
            valueDecimals
            tag1
            tag2
            endpoint
            feedbackURI
            feedbackHash
            revoked
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      return (data?.data?.feedbacks as Feedback[] | undefined) ?? [];
    } catch {
      return [];
    }
  }

  async getValidation(requestHash: Hex): Promise<Validation | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
          validation(id: "${requestHash.toLowerCase()}") {
            id
            requestHash
            validatorAddress
            agentId
            requestURI
            response
            responseURI
            responseHash
            tag
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      return (data?.data?.validation as Validation | null) ?? null;
    } catch {
      return null;
    }
  }

  async getValidations(
    page: number,
    limit: number,
    agentId?: bigint | number | string,
    validatorAddress?: Hex
  ): Promise<Validation[]> {
    try {
      let filters: string[] = [];
      if (agentId !== undefined) filters.push(`agentId: ${this.bigIntValue(agentId)}`);
      if (validatorAddress) filters.push(`validatorAddress: "${validatorAddress.toLowerCase()}"`);

      const where = filters.length ? `where: { ${filters.join(", ")} }` : "";
      const data = await this.client.graphCall<any>({
        query: `{
          validations(
            ${where}
            first: ${limit}
            skip: ${(page - 1) * limit}
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            requestHash
            validatorAddress
            agentId
            requestURI
            response
            responseURI
            responseHash
            tag
            blockNumber
            blockTimestamp
            transactionHash
          }
        }`,
      });

      return (data?.data?.validations as Validation[] | undefined) ?? [];
    } catch {
      return [];
    }
  }

  async getTransaction(transactionId: Hex): Promise<Transaction | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
            transaction(id: "${transactionId.toLowerCase()}") {
                id
                transactionId
                payer
                payers
                fulfilleds
                merchant
                token
                amounts
                adjustedToken
                adjustedAmount
                dueDate
                amount
                timestamp
                description
                metadata_schemaVersion
                metadata_value
                status
                type
                subscriptionId
                blockNumber
                blockTimestamp
                transactionHash
                confirmations {
                  id
                  transactionId
                  from
                  recipient
                  token
                  amount
                  adjustedToken
                  adjustedAmount
                  description
                  type      
                  blockNumber
                  blockTimestamp
                  transactionHash
                }
            }
        }`,
      });

      return data.data.transaction;
    } catch (error) {
      return null;
    }
  }

  async getTransactionsFromHash(transactionHash: Hex): Promise<Transaction[]> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
            transactions(where: {transactionHash: "${transactionHash.toLowerCase()}"}) {
                id
                transactionId
                payer
                payers
                fulfilleds
                merchant
                token
                amounts
                adjustedToken
                adjustedAmount
                dueDate
                amount
                timestamp
                description
                metadata_schemaVersion
                metadata_value
                status
                type
                subscriptionId
                blockNumber
                blockTimestamp
                transactionHash
                confirmations {
                  id
                  transactionId
                  from
                  recipient
                  token
                  amount
                  adjustedToken
                  adjustedAmount
                  description
                  type      
                  blockNumber
                  blockTimestamp
                  transactionHash
                }
            }
        }`,
      });

      return data.data.transactions;
    } catch (error) {
      return [];
    }
  }

  async getTransactions(
    merchant: Hex,
    page: number,
    limit: number,
    payer?: Hex,
    amountMin?: number,
    amountMax?: number,
    timestampMin?: number,
    timestampMax?: number,
    status?: TransactionStatus,
    type?: TransactionType
  ): Promise<Transaction[]> {
    try {
      let filters = `merchant: "${merchant.toLowerCase()}"`;

      if (payer) filters += `, payer: "${payer.toLowerCase()}"`;
      if (amountMin !== undefined) filters += `, amount_gte: ${amountMin}`;
      if (amountMax !== undefined) filters += `, amount_lte: ${amountMax}`;
      if (timestampMin !== undefined)
        filters += `, timestamp_gte: ${timestampMin}`;
      if (timestampMax !== undefined)
        filters += `, timestamp_lte: ${timestampMax}`;
      if (status !== undefined) filters += `, status: ${status}`;
      if (type !== undefined) filters += `, type: ${type}`;

      const data = await this.client.graphCall<any>({
        query: `{
        transactions(
          where: { ${filters} }
          first: ${limit}
          skip: ${(page - 1) * limit}
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transactionId
          payer
          payers
          fulfilleds
          merchant
          token
          amounts
          adjustedToken
          adjustedAmount
          dueDate
          amount
          timestamp
          description
          metadata_schemaVersion
          metadata_value
          status
          type
          subscriptionId
          blockNumber
          blockTimestamp
          transactionHash
          confirmations {
            id
            transactionId
            from
            recipient
            token
            amount
            adjustedToken
            adjustedAmount
            description
            type      
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      }`,
      });

      return data?.data?.transactions ?? [];
    } catch (error) {
      console.error("Error fetching payments:", error);
      return [];
    }
  }

  async getConfirmation(id: Hex): Promise<Confirmation | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
            confirmation(id: "${id.toLowerCase()}") {
                id
                transactionId
                from
                recipient
                token
                amount
                adjustedToken
                adjustedAmount
                description
                type
                blockNumber
                blockTimestamp
                transactionHash
            }
        }`,
      });

      return data.data.confirmation;
    } catch (error) {
      return null;
    }
  }

  async getTransactionConfirmations(
    transactionId: Hex
  ): Promise<Confirmation[]> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
            confirmations(where: {transactionId: "${transactionId.toLowerCase()}"}) {
                id
                transactionId
                from
                recipient
                token
                amount
                adjustedToken
                adjustedAmount
                description
                type
                blockNumber
                blockTimestamp
                transactionHash
            }
        }`,
      });

      return data.data.confirmations;
    } catch (error) {
      return [];
    }
  }

  async getConfirmations(account: Hex): Promise<Confirmation[]> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
            confirmations(where: {recipient: "${account.toLowerCase()}"}) {
                id
                transactionId
                from
                recipient
                token
                amount
                adjustedToken
                adjustedAmount
                description
                type
                blockNumber
                blockTimestamp
                transactionHash
            }
        }`,
      });

      return data.data.confirmations;
    } catch (error) {
      return [];
    }
  }

  async getSubscription(subsciptionId: Hex): Promise<SubscriptionPlan | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
            subscriptionPlan(id: "${subsciptionId.toLowerCase()}") {
                id
                subsciptionId
                merchant
                token
                interval
                amount
                gracePeriod
                description
                catalog_metadata_schemaVersion
                catalog_metadata_value
                trashed
                blockNumber
                blockTimestamp
                transactionHash
            }
        }`,
      });

      return data.data.subscriptionPlan;
    } catch (error) {
      return null;
    }
  }

  async getSubscriptionsFromHash(
    transactionHash: Hex
  ): Promise<SubscriptionPlan[]> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
            subscriptionPlans(where: {transactionHash: "${transactionHash.toLowerCase()}"}) {
                id
                subsciptionId
                merchant
                token
                interval
                amount
                gracePeriod
                description
                catalog_metadata_schemaVersion
                catalog_metadata_value
                trashed
                blockNumber
                blockTimestamp
                transactionHash
            }
        }`,
      });

      return data.data.subscriptionPlans;
    } catch (error) {
      return [];
    }
  }

  async getSubscriptions(
    merchant: Hex,
    page: number,
    limit: number
  ): Promise<SubscriptionPlan[]> {
    try {
      const skip = (page - 1) * limit;

      const data = await this.client.graphCall<any>({
        query: `{
        subscriptionPlans(
          where: {merchant: "${merchant}"},
          first: ${limit},
          skip: ${skip},
          orderBy: blockTimestamp,
          orderDirection: desc
        ) {
          id
          subsciptionId
          merchant
          token
          interval
          amount
          gracePeriod
          description
          catalog_metadata_schemaVersion
          catalog_metadata_value
          trashed
          blockNumber
          blockTimestamp
          transactionHash
        }
      }`,
      });

      return data?.data?.subscriptionPlans ?? [];
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      return [];
    }
  }
}
