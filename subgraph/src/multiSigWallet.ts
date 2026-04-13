import {
  SignersUpdated as SignersUpdatedEvent,
  TokensUpdated as TokensUpdatedEvent,
  WithdrawRequestApproved as WithdrawRequestApprovedEvent,
  WithdrawRequestCreated as WithdrawRequestCreatedEvent,
  WithdrawRequestExecuted as WithdrawRequestExecutedEvent,
} from "../generated/templates/MultiSigWallet/MultiSigWallet";
import { Merchant, Transaction, Confirmation } from "../generated/schema";
import { Value } from "@graphprotocol/graph-ts";

export function handleSignersUpdated(event: SignersUpdatedEvent): void {
  let merchant = Merchant.load(event.params.merchant);
  if (!merchant) return;

  merchant.signers = Value.fromAddressArray(event.params.signers).toBytesArray();
  merchant.minSigners = event.params.minSigners;
  merchant.save();
}

export function handleTokensUpdated(event: TokensUpdatedEvent): void {
  let merchant = Merchant.load(event.params.merchant);
  if (!merchant) return;

  merchant.tokens = Value.fromAddressArray(event.params.tokens).toBytesArray();
  merchant.save();
}

export function handleWithdrawRequestApproved(
  event: WithdrawRequestApprovedEvent
): void {
  let transaction = Transaction.load(
    event.params.merchant.concatI32(event.params.requestId.toI32())
  );
  if (!transaction) return;

  transaction.fulfilleds.push(Value.fromAddress(event.params.signer).toBytes());
  transaction.save();

  let confirmation = new Confirmation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  confirmation.transactionId = event.params.merchant.concatI32(
    event.params.requestId.toI32()
  );
  confirmation.from = event.params.merchant;
  confirmation.recipient = transaction.recipient;
  confirmation.token = transaction.token;
  confirmation.amount = transaction.amount;
  confirmation.type = 1;

  confirmation.blockNumber = event.block.number;
  confirmation.blockTimestamp = event.block.timestamp;
  confirmation.transactionHash = event.transaction.hash;

  confirmation.transaction = event.params.merchant.concatI32(
    event.params.requestId.toI32()
  );

  confirmation.save();
}

export function handleWithdrawRequestCreated(
  event: WithdrawRequestCreatedEvent
): void {
  let transaction = new Transaction(
    event.params.merchant.concatI32(event.params.requestId.toI32())
  );

  transaction.transactionId = event.params.merchant.concatI32(
    event.params.requestId.toI32()
  );
  transaction.merchant = event.params.merchant;
  transaction.token = event.params.token;
  transaction.amount = event.params.amount;
  transaction.recipient = event.params.recipient;
  transaction.signers = Value.fromAddressArray(event.params.signers).toBytesArray();
  transaction.executed = event.params.executed;
  transaction.type = 2;

  transaction.blockNumber = event.block.number;
  transaction.blockTimestamp = event.block.timestamp;
  transaction.transactionHash = event.transaction.hash;

  transaction.payers = [];
  transaction.fulfilleds = [];

  transaction.save();

  let confirmation = new Confirmation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  confirmation.transactionId = event.params.merchant.concatI32(
    event.params.requestId.toI32()
  );
  confirmation.from = event.params.merchant;
  confirmation.recipient = transaction.recipient;
  confirmation.token = transaction.token;
  confirmation.amount = transaction.amount;
  confirmation.type = 0;

  confirmation.blockNumber = event.block.number;
  confirmation.blockTimestamp = event.block.timestamp;
  confirmation.transactionHash = event.transaction.hash;

  confirmation.transaction = event.params.merchant.concatI32(
    event.params.requestId.toI32()
  );

  confirmation.save();
}

export function handleWithdrawRequestExecuted(
  event: WithdrawRequestExecutedEvent
): void {
  let transaction = Transaction.load(
    event.params.merchant.concatI32(event.params.requestId.toI32())
  );
  if (!transaction) return;

  transaction.executed = true;
  transaction.save();

  let confirmation = new Confirmation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  confirmation.transactionId = event.params.merchant.concatI32(
    event.params.requestId.toI32()
  );
  confirmation.from = event.params.merchant;
  confirmation.recipient = transaction.recipient;
  confirmation.token = transaction.token;
  confirmation.amount = transaction.amount;
  confirmation.type = 2;

  confirmation.blockNumber = event.block.number;
  confirmation.blockTimestamp = event.block.timestamp;
  confirmation.transactionHash = event.transaction.hash;

  confirmation.transaction = event.params.merchant.concatI32(
    event.params.requestId.toI32()
  );

  confirmation.save();
}

