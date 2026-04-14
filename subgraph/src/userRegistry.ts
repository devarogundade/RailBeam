import {
  UserRegistered as UserRegisteredEvent,
  UsernameUpdated as UsernameUpdatedEvent,
  MetadataURIUpdated as MetadataURIUpdatedEvent,
} from "../generated/UserRegistry/UserRegistry";
import { User } from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

function loadOrCreateUser(userAddress: Bytes): User {
  let user = User.load(userAddress);
  if (!user) {
    user = new User(userAddress);
    user.user = userAddress;
    user.username = "";
    user.metadataURI = "";
    user.blockNumber = BigInt.zero();
    user.blockTimestamp = BigInt.zero();
    user.transactionHash = Bytes.empty();
  }
  return user;
}

export function handleUserRegistered(event: UserRegisteredEvent): void {
  let user = User.load(event.params.user);
  if (!user) {
    user = new User(event.params.user);
    user.user = event.params.user;
  }

  user.username = event.params.username;
  user.metadataURI = event.params.metadataURI;
  user.blockNumber = event.block.number;
  user.blockTimestamp = event.block.timestamp;
  user.transactionHash = event.transaction.hash;
  user.save();
}

export function handleUsernameUpdated(event: UsernameUpdatedEvent): void {
  let user = loadOrCreateUser(event.params.user);
  user.username = event.params.newUsername;
  user.blockNumber = event.block.number;
  user.blockTimestamp = event.block.timestamp;
  user.transactionHash = event.transaction.hash;
  user.save();
}

export function handleMetadataURIUpdated(event: MetadataURIUpdatedEvent): void {
  let user = loadOrCreateUser(event.params.user);
  user.metadataURI = event.params.newMetadataURI;
  user.blockNumber = event.block.number;
  user.blockTimestamp = event.block.timestamp;
  user.transactionHash = event.transaction.hash;
  user.save();
}

