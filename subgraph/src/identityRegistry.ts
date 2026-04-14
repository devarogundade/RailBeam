import {
  Registered as AgentRegisteredEvent,
  URIUpdated as AgentURIUpdatedEvent,
  MetadataSet as AgentMetadataSetEvent,
  Transfer as AgentTransferEvent,
} from "../generated/IdentityRegistry/IdentityRegistry";
import { Agent, AgentMetadata } from "../generated/schema";
import { BigInt, ByteArray, Bytes, crypto } from "@graphprotocol/graph-ts";

function agentIdToBytes(agentId: BigInt): Bytes {
  return Bytes.fromByteArray(ByteArray.fromBigInt(agentId));
}

function decodeAbiEncodedAddress(value: Bytes): Bytes | null {
  if (value.length == 32) {
    return Bytes.fromUint8Array(value.subarray(12, 32));
  }
  if (value.length == 20) {
    return value;
  }
  return null;
}

function agentMetadataId(agentId: BigInt, key: string): Bytes {
  let agentBytes = agentIdToBytes(agentId);
  let keyHash = Bytes.fromByteArray(crypto.keccak256(Bytes.fromUTF8(key)));
  return Bytes.fromByteArray(crypto.keccak256(agentBytes.concat(keyHash)));
}

export function handleAgentRegistered(event: AgentRegisteredEvent): void {
  let id = agentIdToBytes(event.params.agentId);
  let agent = new Agent(id);

  agent.agentId = event.params.agentId;
  agent.owner = event.params.owner;
  agent.uri = event.params.agentURI;
  agent.agentWallet = null;

  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;

  agent.save();
}

export function handleAgentURIUpdated(event: AgentURIUpdatedEvent): void {
  let id = agentIdToBytes(event.params.agentId);
  let agent = Agent.load(id);
  if (!agent) {
    agent = new Agent(id);
    agent.agentId = event.params.agentId;
    agent.owner = Bytes.empty();
    agent.agentWallet = null;
    agent.uri = null;
  }

  agent.uri = event.params.newURI;
  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;

  agent.save();
}

export function handleAgentMetadataSet(event: AgentMetadataSetEvent): void {
  let agentBytes = agentIdToBytes(event.params.agentId);
  let agent = Agent.load(agentBytes);
  if (!agent) {
    agent = new Agent(agentBytes);
    agent.agentId = event.params.agentId;
    agent.owner = Bytes.empty();
    agent.uri = null;
    agent.agentWallet = null;
  }

  let metaId = agentMetadataId(event.params.agentId, event.params.metadataKey);
  let meta = AgentMetadata.load(metaId);
  if (!meta) {
    meta = new AgentMetadata(metaId);
    meta.agent = agentBytes;
    meta.agentId = event.params.agentId;
    meta.key = event.params.metadataKey;
  }

  meta.value = event.params.metadataValue;
  meta.updatedBy = event.transaction.from;
  meta.blockNumber = event.block.number;
  meta.blockTimestamp = event.block.timestamp;
  meta.transactionHash = event.transaction.hash;
  meta.save();

  if (event.params.metadataKey == "agentWallet") {
    agent.agentWallet = decodeAbiEncodedAddress(event.params.metadataValue);
  }

  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;
  agent.save();
}

export function handleAgentTransfer(event: AgentTransferEvent): void {
  let agentBytes = agentIdToBytes(event.params.tokenId);
  let agent = Agent.load(agentBytes);
  if (!agent) {
    agent = new Agent(agentBytes);
    agent.agentId = event.params.tokenId;
    agent.uri = null;
    agent.agentWallet = null;
  }

  agent.owner = event.params.to;
  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;
  agent.save();
}
