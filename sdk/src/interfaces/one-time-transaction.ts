import {
  PrepareFulfillOneTimeTransaction,
  PrepareOneTimeTransaction,
} from "../params";
import type {
  TransactionCallback,
  GetPayerTransactions,
  GetTransaction,
  GetTransactions,
  Transaction,
  GetTransactionHash,
} from "../types";

export interface IOneTimeTransaction {
  create(params: PrepareOneTimeTransaction): Promise<TransactionCallback>;

  fulfill(
    params: PrepareFulfillOneTimeTransaction
  ): Promise<TransactionCallback>;

  getTransaction(params: GetTransaction): Promise<Transaction | null>;

  getTransactions(params: GetTransactions): Promise<Transaction[]>;

  getTransactionsFromHash(params: GetTransactionHash): Promise<Transaction[]>;

  getPayerTransactions(params: GetPayerTransactions): Promise<Transaction[]>;

  getOneTimeTransactions(params: GetTransactions): Promise<Transaction[]>;
}
