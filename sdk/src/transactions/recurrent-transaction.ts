import type {
  TransactionCallback,
  GetTransactions,
  GetSubscription,
  GetSubscriptions,
  Transaction,
  SubscriptionPlan,
  GetSubscriptionsHash,
} from "../types";
import { BaseTransaction } from "./base";
import { IRecurrentTransaction } from "../interfaces/recurrent-transaction";
import { TransactionType } from "../enums";
import {
  PrepareCancelRecurrentTransaction,
  PrepareFulfillRecurrentTransaction,
  PrepareRecurrentTransaction,
} from "../params";

export class RecurrentTransaction
  extends BaseTransaction
  implements IRecurrentTransaction
{
  async create(
    params: PrepareRecurrentTransaction
  ): Promise<TransactionCallback> {
    return new Promise((resolve, reject) => {
      const session = this.createSession();
      const sessionedPaymentURL = this.buildUrl({ session });

      const paymentParams = { ...params, type: TransactionType.Recurrent };

      try {
        this.launchTabAndAwaitResult(
          sessionedPaymentURL,
          paymentParams,
          (data: TransactionCallback) => {
            if (data.session == session) {
              resolve(data);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async fulfill(
    params: PrepareFulfillRecurrentTransaction
  ): Promise<TransactionCallback> {
    return new Promise((resolve, reject) => {
      const session = this.createSession();
      const sessionedPaymentURL = this.buildUrl({ session });

      const paymentParams = {
        ...params,
        type: TransactionType.Recurrent,
      };

      try {
        this.launchTabAndAwaitResult(
          sessionedPaymentURL,
          paymentParams,
          (data: TransactionCallback) => {
            if (data.session == session) {
              resolve(data);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  cancel(
    params: PrepareCancelRecurrentTransaction
  ): Promise<TransactionCallback> {
    return new Promise((resolve, reject) => {
      const session = this.createSession();
      const sessionedPaymentURL = this.buildUrl({ session });

      const paymentParams = {
        ...params,
        type: TransactionType.Recurrent,
      };

      try {
        this.launchTabAndAwaitResult(
          sessionedPaymentURL,
          paymentParams,
          (data: TransactionCallback) => {
            if (data.session == session) {
              resolve(data);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  getSubscription(params: GetSubscription): Promise<SubscriptionPlan | null> {
    return this.graph.getSubscription(params.subscriptionId);
  }

  getSubscriptionFromHash(
    params: GetSubscriptionsHash
  ): Promise<SubscriptionPlan[]> {
    return this.graph.getSubscriptionsFromHash(params.transactionHash);
  }

  getSubscriptions(params: GetSubscriptions): Promise<SubscriptionPlan[]> {
    return this.graph.getSubscriptions(
      params.merchant,
      params.page,
      params.limit
    );
  }

  getRecurrentTransactions(params: GetTransactions): Promise<Transaction[]> {
    return this.graph.getTransactions(
      params.merchant,
      params.page,
      params.limit,
      params.payer,
      params.amountMin,
      params.amountMax,
      params.timestampMin,
      params.timestampMax,
      params.status,
      TransactionType.Recurrent
    );
  }
}
