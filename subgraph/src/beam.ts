import {
  OneTimeTransactionCreated as OneTimeTransactionCreatedEvent,
  OneTimeTransactionFulfilled as OneTimeTransactionFulfilledEvent,
  RecurrentTransactionCancelled as RecurrentTransactionCancelledEvent,
  RecurrentTransactionCreated as RecurrentTransactionCreatedEvent,
  RecurrentTransactionFulfilled as RecurrentTransactionFulfilledEvent,
} from "../generated/Beam/Beam";
import { Transaction, Confirmation } from "../generated/schema";
import { BigInt, Value } from "@graphprotocol/graph-ts";

export function handleOneTimeTransactionCreated(
  event: OneTimeTransactionCreatedEvent
): void {
  let transaction = new Transaction(event.params.transactionId);

  transaction.transactionId = event.params.transactionId;
  transaction.payer = event.params.payer;
  transaction.payers = Value.fromAddressArray(event.params.payers).toBytesArray();
  transaction.fulfilleds = [Value.fromAddress(event.params.payer).toBytes()];
  transaction.merchant = event.params.merchant;
  transaction.token = event.params.token;
  transaction.amounts = event.params.amounts;
  transaction.adjustedToken = event.params.adjustedToken;
  transaction.adjustedAmount = event.params.adjustedAmount;

  transaction.timestamp = event.params.timestamp;
  transaction.description = event.params.description;
  transaction.metadata_schemaVersion = event.params.metadata.schemaVersion;
  transaction.metadata_value = event.params.metadata.value;
  transaction.status = event.params.status;
  transaction.type = 0;
  transaction.subscriptionId = null;

  transaction.signers = [];

  transaction.blockNumber = event.block.number;
  transaction.blockTimestamp = event.block.timestamp;
  transaction.transactionHash = event.transaction.hash;

  transaction.save();

  let payerAmount = new BigInt(0);
  for (let index = 0; index < event.params.payers.length; index++) {
    if (event.params.payers[index] == event.params.payer) {
      payerAmount = event.params.amounts[index];
      break;
    }
  }

  let confirmation = new Confirmation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  confirmation.transactionId = event.params.transactionId;
  confirmation.from = event.params.payer;
  confirmation.recipient = event.params.merchant;
  confirmation.token = transaction.token;
  confirmation.amount = payerAmount;
  confirmation.adjustedToken = event.params.adjustedToken;
  confirmation.adjustedAmount = event.params.adjustedAmount;
  confirmation.description = transaction.description;
  confirmation.type = 0;

  confirmation.blockNumber = event.block.number;
  confirmation.blockTimestamp = event.block.timestamp;
  confirmation.transactionHash = event.transaction.hash;

  confirmation.transaction = event.params.transactionId;

  confirmation.save();
}

export function handleOneTimeTransactionFulfilled(
  event: OneTimeTransactionFulfilledEvent
): void {
  let transaction = Transaction.load(event.params.transactionId);
  if (!transaction) return;

  transaction.fulfilleds.push(Value.fromAddress(event.params.payer).toBytes());
  transaction.status = event.params.status;
  transaction.save();

  let confirmation = new Confirmation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  confirmation.transactionId = event.params.transactionId;
  confirmation.from = event.params.payer;
  confirmation.recipient = event.params.merchant;
  confirmation.token = transaction.token;
  confirmation.amount = event.params.amount;
  confirmation.adjustedToken = event.params.adjustedToken;
  confirmation.adjustedAmount = event.params.adjustedAmount;
  confirmation.description = transaction.description;
  confirmation.type = 0;

  confirmation.blockNumber = event.block.number;
  confirmation.blockTimestamp = event.block.timestamp;
  confirmation.transactionHash = event.transaction.hash;

  confirmation.transaction = event.params.transactionId;

  confirmation.save();
}

export function handleRecurrentTransactionCancelled(
  event: RecurrentTransactionCancelledEvent
): void {
  let transaction = Transaction.load(event.params.transactionId);
  if (!transaction) return;

  transaction.transactionId = event.params.transactionId;
  transaction.status = 3;
  transaction.save();

  let confirmation = new Confirmation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  confirmation.transactionId = event.params.transactionId;
  confirmation.token = transaction.token;
  confirmation.description = transaction.description;
  confirmation.type = 3;

  confirmation.blockNumber = event.block.number;
  confirmation.blockTimestamp = event.block.timestamp;
  confirmation.transactionHash = event.transaction.hash;

  confirmation.transaction = event.params.transactionId;

  confirmation.save();
}

export function handleRecurrentTransactionCreated(
  event: RecurrentTransactionCreatedEvent
): void {
  let transaction = new Transaction(event.params.transactionId);

  transaction.transactionId = event.params.transactionId;
  transaction.payer = event.params.payer;
  transaction.merchant = event.params.merchant;
  transaction.token = event.params.token;
  transaction.adjustedToken = event.params.adjustedToken;
  transaction.adjustedAmount = event.params.adjustedAmount;
  transaction.dueDate = event.params.dueDate;
  transaction.amount = event.params.amount;
  transaction.timestamp = event.params.timestamp;
  transaction.description = event.params.description;
  transaction.metadata_schemaVersion = event.params.metadata.schemaVersion;
  transaction.metadata_value = event.params.metadata.value;
  transaction.status = event.params.status;
  transaction.type = 1;
  transaction.subscriptionId = event.params.subscriptionId;

  transaction.blockNumber = event.block.number;
  transaction.blockTimestamp = event.block.timestamp;
  transaction.transactionHash = event.transaction.hash;

  transaction.payers = [];
  transaction.signers = [];
  transaction.fulfilleds = [];

  transaction.save();

  let confirmation = new Confirmation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  confirmation.transactionId = event.params.transactionId;
  confirmation.from = event.params.payer;
  confirmation.recipient = event.params.merchant;
  confirmation.token = transaction.token;
  confirmation.amount = event.params.amount;
  confirmation.adjustedToken = event.params.adjustedToken;
  confirmation.adjustedAmount = event.params.adjustedAmount;
  confirmation.description = transaction.description;
  confirmation.type = 0;

  confirmation.blockNumber = event.block.number;
  confirmation.blockTimestamp = event.block.timestamp;
  confirmation.transactionHash = event.transaction.hash;

  confirmation.transaction = event.params.transactionId;

  confirmation.save();
}

export function handleRecurrentTransactionFulfilled(
  event: RecurrentTransactionFulfilledEvent
): void {
  let transaction = Transaction.load(event.params.transactionId);
  if (!transaction) return;

  transaction.dueDate = event.params.dueDate;
  transaction.status = event.params.status;
  transaction.subscriptionId = event.params.subscriptionId;
  transaction.save();

  let confirmation = new Confirmation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  confirmation.transactionId = event.params.transactionId;
  confirmation.from = event.params.payer;
  confirmation.recipient = event.params.merchant;
  confirmation.token = event.params.token;
  confirmation.amount = event.params.amount;
  confirmation.adjustedToken = event.params.adjustedToken;
  confirmation.adjustedAmount = event.params.adjustedAmount;
  confirmation.description = transaction.description;
  confirmation.type = 1;

  confirmation.blockNumber = event.block.number;
  confirmation.blockTimestamp = event.block.timestamp;
  confirmation.transactionHash = event.transaction.hash;

  confirmation.transaction = event.params.transactionId;

  confirmation.save();
}

