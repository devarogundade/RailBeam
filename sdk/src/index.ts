import { BeamClient } from "./client";
import { OneTimeTransaction } from "./transactions/one-time-transaction";
import { RecurrentTransaction } from "./transactions/recurrent-transaction";
import { IMerchant } from "./interfaces/merchant";
import { Merchant } from "./merchant/index";
import { IRecurrentTransaction } from "./interfaces/recurrent-transaction";
import { IOneTimeTransaction } from "./interfaces/one-time-transaction";
import type { IAgents } from "./interfaces/agents";
import { Agents } from "./agents";
import type { IUsers } from "./interfaces/users";
import { Users } from "./users";
import type { BeamSDKOptions } from "./types";
export {
  ContractAddresses,
  getToken,
  getTokens,
  SCHEMA_JSON,
  SCHEMA_URL,
  sleep
} from "./utils/constants";

export type {
  Token,
  Metadata,
  Merchant,
  Confirmation,
  Transaction,
  SubscriptionPlan,
  Agent,
  AgentMetadata,
  Feedback,
  FeedbackResponse,
  Validation,
  GetPayerTransactions,
  User,
  GetUser,
  GetUserByUsername,
  GetUsers,
  TransactionCallback,
} from "./types";
export { Network, TransactionStatus, TransactionType } from "./enums";
export type {
  Notification,
  ClientMerchant,
  Plan,
  CreatePlan,
  CreateMerchant,
  UpdateWebhooks,
  ChatResponse,
  CreateEncryptedMetadataResponse,
  X402ResourceView,
  CreateX402LinkPayload,
  CreateX402FileMetaPayload,
  CatalogMetadata,
} from "./app-types";
export { Connection, mapSubscriptionPlanToPlan, parseCatalogMetadata } from "./app-types";
export {
  PrepareOneTimeTransaction,
  PrepareFulfillOneTimeTransaction,
  PrepareRecurrentTransaction,
  PrepareCancelRecurrentTransaction,
  CancelRecurrentTransaction,
  CreateOneTimeTransaction,
  CreateRecurrentTransaction,
  FulfillOneTimeTransaction,
  FulfillRecurrentTransaction,
  MintReceipt,
} from "./params";

class BeamSDK {
  private readonly options: BeamSDKOptions;

  public merchant: IMerchant;
  public oneTimeTransaction: IOneTimeTransaction;
  public recurrentTransaction: IRecurrentTransaction;
  public agents: IAgents;
  public users: IUsers;

  constructor(options: BeamSDKOptions) {
    this.options = options;

    const client = new BeamClient(this.options);

    this.merchant = new Merchant(client);
    this.oneTimeTransaction = new OneTimeTransaction(client);
    this.recurrentTransaction = new RecurrentTransaction(client);
    this.agents = new Agents(client);
    this.users = new Users(client);
  }
}

export default BeamSDK;
