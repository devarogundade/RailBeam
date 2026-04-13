import {
  MerchantCreated as MerchantCreatedEvent,
  MerchantMetadataUpdated as MerchantMetadataUpdatedEvent,
  SubsciptionDeleted as SubsciptionDeletedEvent,
  SubscriptionCreated as SubscriptionCreatedEvent,
  SubscriptionUpdated as SubscriptionUpdatedEvent,
} from "../generated/Merchant/Merchant";
import { MultiSigWallet as MultiSigWalletTemplate } from "../generated/templates";
import { Merchant, SubscriptionPlan } from "../generated/schema";
import { Bytes, Value } from "@graphprotocol/graph-ts";

export function handleMerchantCreated(event: MerchantCreatedEvent): void {
  let merchant = new Merchant(event.params.merchant);

  merchant.merchant = event.params.merchant;
  merchant.metadata_schemaVersion = event.params.metadata.schemaVersion;
  merchant.metadata_value = event.params.metadata.value;
  merchant.wallet = event.params.wallet;
  merchant.tokens = Value.fromAddressArray(event.params.tokens).toBytesArray();
  merchant.hook = Bytes.empty();
  merchant.signers = Value.fromAddressArray(event.params.signers).toBytesArray();
  merchant.minSigners = event.params.minSigners;

  merchant.blockNumber = event.block.number;
  merchant.blockTimestamp = event.block.timestamp;
  merchant.transactionHash = event.transaction.hash;

  merchant.save();

  MultiSigWalletTemplate.create(event.params.wallet);
}

export function handleMerchantMetadataUpdated(
  event: MerchantMetadataUpdatedEvent
): void {
  let merchant = Merchant.load(event.params.merchant);
  if (!merchant) return;

  merchant.metadata_schemaVersion = event.params.metadata.schemaVersion;
  merchant.metadata_value = event.params.metadata.value;

  merchant.save();
}

export function handleSubsciptionDeleted(event: SubsciptionDeletedEvent): void {
  let subscription = SubscriptionPlan.load(event.params.subsciptionId);
  if (!subscription) return;

  subscription.trashed = true;
  subscription.save();
}

export function handleSubscriptionCreated(event: SubscriptionCreatedEvent): void {
  let subscription = new SubscriptionPlan(event.params.subsciptionId);

  subscription.subsciptionId = event.params.subsciptionId;
  subscription.merchant = event.params.merchant;
  subscription.token = event.params.token;
  subscription.interval = event.params.interval;
  subscription.amount = event.params.amount;
  subscription.gracePeriod = event.params.gracePeriod;
  subscription.description = event.params.description;
  subscription.catalog_metadata_schemaVersion =
    event.params.catalogMetadata.schemaVersion;
  subscription.catalog_metadata_value = event.params.catalogMetadata.value;
  subscription.trashed = false;

  subscription.blockNumber = event.block.number;
  subscription.blockTimestamp = event.block.timestamp;
  subscription.transactionHash = event.transaction.hash;

  subscription.save();
}

export function handleSubscriptionUpdated(event: SubscriptionUpdatedEvent): void {
  let subscription = SubscriptionPlan.load(event.params.subsciptionId);
  if (!subscription) return;

  subscription.amount = event.params.amount;
  subscription.gracePeriod = event.params.gracePeriod;
  subscription.description = event.params.description;
  subscription.catalog_metadata_schemaVersion =
    event.params.catalogMetadata.schemaVersion;
  subscription.catalog_metadata_value = event.params.catalogMetadata.value;

  subscription.save();
}

