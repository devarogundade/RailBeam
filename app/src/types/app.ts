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
} from "@railbeam/beam-ts";

export { Connection } from "@railbeam/beam-ts";

export type TransactionKind = "onetime" | "recurrent";

export type CreateTransactionPayload =
  | {
      kind: "onetime";
      merchant: string;
      token: string;
      amount: string;
      description?: string;
      splitPayment?: boolean;
    }
  | {
      kind: "recurrent";
      merchant: string;
      subscriptionId: string;
      description?: string;
    };

export type TransactionView = {
  id: string;
  kind: TransactionKind;
  merchant: string;
  token?: string;
  amount?: string;
  description?: string;
  splitPayment?: boolean;
  subscriptionId?: string;
  createdAt?: string;
  updatedAt?: string;
};
