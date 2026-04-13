import type {
  Merchant,
  Transaction,
  Confirmation,
  Subscription,
  CatalogPlan,
} from "../types";
import type { Hex } from "viem";
import { TransactionStatus, TransactionType } from "../enums";
import { BeamClient } from "../client";
import { catalogFromMetadata } from "./catalog";

export class Graph {
  private client: BeamClient;

  constructor(client: BeamClient) {
    this.client = client;
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

  async getSubscription(subsciptionId: Hex): Promise<Subscription | null> {
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
  ): Promise<Subscription[]> {
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
  ): Promise<Subscription[]> {
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

  async getPlans(merchant: Hex, first = 1000): Promise<CatalogPlan[]> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
          subscriptionPlans(
            where: { merchant: "${merchant.toLowerCase()}", trashed: false }
            orderBy: blockTimestamp
            orderDirection: desc
            first: ${first}
          ) {
            id
            subsciptionId
            merchant
            token
            interval
            amount
            gracePeriod
            description
            catalog_metadata_value
            transactionHash
            blockTimestamp
          }
        }`,
      });
      const rows = data?.data?.subscriptionPlans as
        | {
            subsciptionId: string;
            merchant: string;
            token: string;
            interval: string;
            amount: string;
            gracePeriod: string;
            description: string;
            catalog_metadata_value: string;
            transactionHash: string;
            blockTimestamp: string;
          }[]
        | undefined;
      if (!rows) return [];
      return rows.map((s) => {
        const c = catalogFromMetadata(s.catalog_metadata_value);
        return {
          _id: s.subsciptionId,
          transactionHash: s.transactionHash as Hex,
          merchant: s.merchant as Hex,
          name: c.name || s.description,
          description: c.description || s.description,
          images: c.images,
          category: c.category,
          gracePeriod: Number(s.gracePeriod),
          available: true,
          interval: Number(s.interval),
          amount: Number(s.amount),
          token: s.token as Hex,
          sold: 0,
          createdAt: new Date(Number(s.blockTimestamp) * 1000),
          updatedAt: null,
        };
      });
    } catch {
      return [];
    }
  }

  async getPlan(id: string): Promise<CatalogPlan | null> {
    try {
      const data = await this.client.graphCall<any>({
        query: `{
          subscriptionPlan(id: "${id.toLowerCase()}") {
            id
            subsciptionId
            merchant
            token
            interval
            amount
            gracePeriod
            description
            catalog_metadata_value
            transactionHash
            blockTimestamp
          }
        }`,
      });
      const s = data?.data?.subscriptionPlan as
        | {
            subsciptionId: string;
            merchant: string;
            token: string;
            interval: string;
            amount: string;
            gracePeriod: string;
            description: string;
            catalog_metadata_value: string;
            transactionHash: string;
            blockTimestamp: string;
          }
        | null
        | undefined;
      if (!s) return null;
      const c = catalogFromMetadata(s.catalog_metadata_value);
      return {
        _id: s.subsciptionId,
        transactionHash: s.transactionHash as Hex,
        merchant: s.merchant as Hex,
        name: c.name || s.description,
        description: c.description || s.description,
        images: c.images,
        category: c.category,
        gracePeriod: Number(s.gracePeriod),
        available: true,
        interval: Number(s.interval),
        amount: Number(s.amount),
        token: s.token as Hex,
        sold: 0,
        createdAt: new Date(Number(s.blockTimestamp) * 1000),
        updatedAt: null,
      };
    } catch {
      return null;
    }
  }
}
