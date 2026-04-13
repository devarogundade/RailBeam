import {
  PrepareCancelRecurrentTransaction,
  PrepareFulfillRecurrentTransaction,
  PrepareRecurrentTransaction,
} from "../params";
import type {
  TransactionCallback,
  Transaction,
  GetTransactions,
  GetTransaction,
  SubscriptionPlan,
  GetSubscription,
  GetSubscriptions,
  GetTransactionHash,
  GetSubscriptionsHash,
} from "../types";

export interface IRecurrentTransaction {
  create(params: PrepareRecurrentTransaction): Promise<TransactionCallback>;

  fulfill(
    params: PrepareFulfillRecurrentTransaction
  ): Promise<TransactionCallback>;

  cancel(
    params: PrepareCancelRecurrentTransaction
  ): Promise<TransactionCallback>;

  getSubscription(params: GetSubscription): Promise<SubscriptionPlan | null>;

  getSubscriptionFromHash(
    params: GetSubscriptionsHash
  ): Promise<SubscriptionPlan[]>;

  getSubscriptions(params: GetSubscriptions): Promise<SubscriptionPlan[]>;

  getTransaction(params: GetTransaction): Promise<Transaction | null>;

  getTransactions(params: GetTransactions): Promise<Transaction[]>;

  getTransactionsFromHash(params: GetTransactionHash): Promise<Transaction[]>;

  getRecurrentTransactions(params: GetTransactions): Promise<Transaction[]>;
}
