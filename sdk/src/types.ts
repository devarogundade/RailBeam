import { Hex } from "viem";
import { Network, TransactionStatus, TransactionType } from "./enums";

export type Token = {
  name: string;
  symbol: string;
  address: Hex;
  image: string;
  decimals: number;
  aToken: Hex;
  price: number;
};

export type Metadata = {
  schemaVersion: number;
  value: string;
};

export type TransactionCallback = Transaction & {
  session: string;
};

export type GetSubscription = {
  subscriptionId: Hex;
};

export type GetSubscriptionsHash = {
  transactionHash: Hex;
};

export type GetSubscriptions = {
  merchant: Hex;
  page: number;
  limit: number;
};

export type GetTransaction = {
  transactionId: Hex;
};

export type GetTransactionHash = {
  transactionHash: Hex;
};

export type GetTransactions = {
  merchant: Hex;
  page: number;
  limit: number;
  payer?: Hex;
  amountMin?: number;
  amountMax?: number;
  timestampMin?: number;
  timestampMax?: number;
  status?: TransactionStatus;
};

/** List transactions where `payer` is the primary payer (no merchant filter). */
export type GetPayerTransactions = {
  payer: Hex;
  page: number;
  limit: number;
  status?: TransactionStatus;
  type?: TransactionType;
};

export type GetMerchant = {
  merchant: Hex;
};

export type GetUser = {
  user: Hex;
};

export type GetUsers = {
  page: number;
  limit: number;
};

export type GetUserByUsername = {
  username: string;
};

export type GetAgent = {
  id: Hex;
};

export type GetAgentByAgentId = {
  agentId: bigint | number | string;
};

export type GetAgents = {
  page: number;
  limit: number;
  owner?: Hex;
};

export type GetAgentMetadata = {
  agentId: bigint | number | string;
  key?: string;
  page?: number;
  limit?: number;
};

export type GetFeedback = {
  id: Hex;
};

export type GetFeedbacks = {
  page: number;
  limit: number;
  agentId?: bigint | number | string;
  clientAddress?: Hex;
  revoked?: boolean;
};

export type GetValidation = {
  requestHash: Hex;
};

export type GetValidations = {
  page: number;
  limit: number;
  agentId?: bigint | number | string;
  validatorAddress?: Hex;
};

export type BeamSDKOptions = {
  network: Network;
  oracle?: Hex;
  timeout?: number;
  graphURL?: string;
  transactionURL?: string;
};

export type Merchant = {
  id: Hex;
  merchant: Hex;
  metadata_schemaVersion: number;
  metadata_value: string;
  wallet: Hex;
  tokens: Hex[];
  hook: Hex;
  signers: Hex[];
  minSigners: number;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};

export type Transaction = {
  id: Hex;
  transactionId: Hex;
  payer: Hex;
  payers: Hex[];
  fulfilleds: Hex[];
  merchant: Hex;
  token: Hex;
  amounts: bigint[];
  adjustedToken: Hex;
  adjustedAmount: bigint;
  dueDate: bigint;
  amount: bigint;
  timestamp: bigint;
  description: string;
  metadata_schemaVersion: number;
  metadata_value: string;
  status: TransactionStatus;
  type: TransactionType;
  subscriptionId: Hex | null;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
  confirmations: Confirmation[];
};

export type Confirmation = {
  id: Hex;
  transactionId: Hex;
  from: Hex;
  recipient: Hex;
  token: Hex;
  amount: bigint;
  adjustedToken: Hex;
  adjustedAmount: bigint;
  description: string;
  type: number;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};

export type SubscriptionPlan = {
  id: Hex;
  subsciptionId: Hex;
  merchant: Hex;
  token: Hex;
  interval: number;
  amount: bigint;
  gracePeriod: number;
  description: string;
  catalog_metadata_schemaVersion: number;
  catalog_metadata_value: string;
  trashed: boolean;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};

export type Agent = {
  id: Hex;
  agentId: bigint;
  owner: Hex;
  uri: string | null;
  agentWallet: Hex | null;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};

export type AgentMetadata = {
  id: Hex;
  agentId: bigint;
  key: string;
  value: Hex;
  updatedBy: Hex;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};

export type User = {
  id: Hex;
  user: Hex;
  username: string;
  metadataURI: string;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};

export type Feedback = {
  id: Hex;
  agentId: bigint;
  clientAddress: Hex;
  feedbackIndex: bigint;
  value: bigint;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  endpoint: string;
  feedbackURI: string;
  feedbackHash: Hex;
  revoked: boolean;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};

export type FeedbackResponse = {
  id: Hex;
  agentId: bigint;
  clientAddress: Hex;
  feedbackIndex: bigint;
  responder: Hex;
  responseURI: string;
  responseHash: Hex;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};

export type Validation = {
  id: Hex; // requestHash
  requestHash: Hex;
  validatorAddress: Hex;
  agentId: bigint;
  requestURI: string;
  response: number | null;
  responseURI: string | null;
  responseHash: Hex | null;
  tag: string | null;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: Hex;
};
