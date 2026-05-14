import {
  Registered as AgentRegisteredEvent,
  URIUpdated as AgentURIUpdatedEvent,
  MetadataSet as AgentMetadataSetEvent,
  Transfer as AgentTransferEvent,
  Cloned as AgentClonedEvent,
  Subscribed as SubscribedEvent,
  Unsubscribed as UnsubscribedEvent,
  FeesSet as FeesSetEvent,
} from "../generated/IdentityRegistry/IdentityRegistry";
import {
  NewFeedback as NewFeedbackEvent,
  FeedbackRevoked as FeedbackRevokedEvent,
  ResponseAppended as ResponseAppendedEvent,
} from "../generated/ReputationRegistry/ReputationRegistry";
import {
  ValidationRequest as ValidationRequestEvent,
  ValidationResponse as ValidationResponseEvent,
} from "../generated/ValidationRegistry/ValidationRegistry";
import {
  Agent,
  AgentMetadata,
  Feedback,
  FeedbackResponse,
  UserSubscription,
  Validation,
} from "../generated/schema";
import { BigInt, ByteArray, Bytes, crypto } from "@graphprotocol/graph-ts";

const SECONDS_PER_DAY = BigInt.fromI32(86400);

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

function feedbackId(
  agentId: BigInt,
  client: Bytes,
  feedbackIndex: BigInt,
): Bytes {
  let payload = Bytes.fromUTF8(
    agentId.toString() +
      "-" +
      client.toHexString() +
      "-" +
      feedbackIndex.toString(),
  );
  return Bytes.fromByteArray(crypto.keccak256(payload));
}

function userSubscriptionId(user: Bytes, agentId: BigInt): Bytes {
  return Bytes.fromByteArray(
    crypto.keccak256(
      user.concat(Bytes.fromByteArray(ByteArray.fromBigInt(agentId))),
    ),
  );
}

export function handleAgentRegistered(event: AgentRegisteredEvent): void {
  let id = agentIdToBytes(event.params.agentId);
  let agent = Agent.load(id);
  if (agent == null) {
    agent = new Agent(id);
  }

  agent.agentId = event.params.agentId;
  agent.owner = event.params.owner;
  agent.uri = event.params.agentURI;
  if (agent.agentWallet === null) {
    agent.agentWallet = event.params.owner;
  }
  agent.isCloned = false;
  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;

  agent.save();
}

export function handleAgentURIUpdated(event: AgentURIUpdatedEvent): void {
  let id = agentIdToBytes(event.params.agentId);
  let agent = Agent.load(id);
  if (agent == null) {
    agent = new Agent(id);
    agent.agentId = event.params.agentId;
    agent.owner = Bytes.empty();
    agent.agentWallet = null;
    agent.uri = null;
    agent.isCloned = false;
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
  if (agent == null) {
    agent = new Agent(agentBytes);
    agent.agentId = event.params.agentId;
    agent.owner = Bytes.empty();
    agent.uri = null;
    agent.agentWallet = null;
    agent.isCloned = false;
  }

  let metaId = agentMetadataId(event.params.agentId, event.params.metadataKey);
  let meta = AgentMetadata.load(metaId);
  if (meta == null) {
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
    let decodedWallet = decodeAbiEncodedAddress(event.params.metadataValue);
    if (!(decodedWallet === null)) {
      agent.agentWallet = decodedWallet;
    }
  }

  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;
  agent.save();
}

export function handleAgentTransfer(event: AgentTransferEvent): void {
  let agentBytes = agentIdToBytes(event.params.tokenId);
  let agent = Agent.load(agentBytes);
  if (agent == null) {
    agent = new Agent(agentBytes);
    agent.agentId = event.params.tokenId;
    agent.uri = null;
    agent.agentWallet = null;
    agent.isCloned = false;
  }

  agent.owner = event.params.to;
  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;
  agent.save();
}

export function handleAgentCloned(event: AgentClonedEvent): void {
  let newId = agentIdToBytes(event.params.newTokenId);
  let srcId = agentIdToBytes(event.params.sourceTokenId);

  let agent = Agent.load(newId);
  if (agent == null) {
    agent = new Agent(newId);
  }

  agent.agentId = event.params.newTokenId;
  agent.owner = event.params.to;
  agent.isCloned = true;
  let src = Agent.load(srcId);
  if (src == null) {
    agent.uri = null;
  } else {
    agent.uri = src.uri;
  }
  agent.agentWallet = null;

  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;
  agent.save();

  /** Re-attach handler capability metadata so backends can resolve tools for cloned ids. */
  let capsKey = "handlerCapabilities";
  let srcCapsId = agentMetadataId(event.params.sourceTokenId, capsKey);
  let srcCaps = AgentMetadata.load(srcCapsId);
  if (srcCaps != null) {
    let newCapsId = agentMetadataId(event.params.newTokenId, capsKey);
    let newCaps = AgentMetadata.load(newCapsId);
    if (newCaps == null) {
      newCaps = new AgentMetadata(newCapsId);
      newCaps.agent = newId;
      newCaps.agentId = event.params.newTokenId;
      newCaps.key = capsKey;
    }
    newCaps.value = srcCaps.value;
    newCaps.updatedBy = event.transaction.from;
    newCaps.blockNumber = event.block.number;
    newCaps.blockTimestamp = event.block.timestamp;
    newCaps.transactionHash = event.transaction.hash;
    newCaps.save();
  }
}

export function handleSubscribed(event: SubscribedEvent): void {
  let agentBytes = agentIdToBytes(event.params.agentId);
  let agent = Agent.load(agentBytes);
  if (agent == null) {
    agent = new Agent(agentBytes);
    agent.agentId = event.params.agentId;
    agent.owner = Bytes.empty();
    agent.uri = null;
    agent.agentWallet = null;
    agent.isCloned = false;
  }

  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;
  agent.save();

  let sid = userSubscriptionId(event.params.user, event.params.agentId);
  let sub = UserSubscription.load(sid);
  if (sub == null) {
    sub = new UserSubscription(sid);
    sub.user = event.params.user;
    sub.agent = agentBytes;
    sub.agentId = event.params.agentId;
    sub.endDate = BigInt.zero();
    sub.paidAmount = BigInt.zero();
    sub.windowStart = BigInt.zero();
  }

  let now = event.block.timestamp;
  let duration = event.params.numDays.times(SECONDS_PER_DAY);
  let amountPaid = event.params.amountPaid;

  if (sub.endDate.equals(BigInt.zero()) || sub.endDate.le(now)) {
    sub.windowStart = now;
    sub.endDate = now.plus(duration);
    sub.paidAmount = amountPaid;
  } else {
    sub.endDate = sub.endDate.plus(duration);
    sub.paidAmount = sub.paidAmount.plus(amountPaid);
  }

  sub.blockNumber = event.block.number;
  sub.blockTimestamp = event.block.timestamp;
  sub.transactionHash = event.transaction.hash;
  sub.save();
}

export function handleUnsubscribed(event: UnsubscribedEvent): void {
  let sid = userSubscriptionId(event.params.user, event.params.agentId);
  let sub = UserSubscription.load(sid);
  if (sub == null) {
    return;
  }

  sub.endDate = BigInt.zero();
  sub.paidAmount = BigInt.zero();
  sub.windowStart = BigInt.zero();
  sub.blockNumber = event.block.number;
  sub.blockTimestamp = event.block.timestamp;
  sub.transactionHash = event.transaction.hash;
  sub.save();
}

export function handleFeesSet(event: FeesSetEvent): void {
  let agentBytes = agentIdToBytes(event.params.agentId);
  let agent = Agent.load(agentBytes);
  if (agent == null) {
    agent = new Agent(agentBytes);
    agent.agentId = event.params.agentId;
    agent.owner = Bytes.empty();
    agent.uri = null;
    agent.agentWallet = null;
    agent.isCloned = false;
  }

  agent.feePerDay = event.params.feePerDay;
  agent.blockNumber = event.block.number;
  agent.blockTimestamp = event.block.timestamp;
  agent.transactionHash = event.transaction.hash;
  agent.save();
}

export function handleNewFeedback(event: NewFeedbackEvent): void {
  let id = feedbackId(
    event.params.agentId,
    event.params.clientAddress,
    event.params.feedbackIndex,
  );

  let fb = Feedback.load(id);
  if (fb == null) {
    fb = new Feedback(id);
  }

  fb.agentId = event.params.agentId;
  fb.clientAddress = event.params.clientAddress;
  fb.feedbackIndex = event.params.feedbackIndex;
  fb.value = event.params.value;
  fb.valueDecimals = event.params.valueDecimals;
  fb.tag1 = event.params.tag1;
  fb.tag2 = event.params.tag2;
  fb.endpoint = event.params.endpoint;
  fb.feedbackURI = event.params.feedbackURI;
  fb.feedbackHash = event.params.feedbackHash;
  fb.revoked = false;

  fb.blockNumber = event.block.number;
  fb.blockTimestamp = event.block.timestamp;
  fb.transactionHash = event.transaction.hash;
  fb.save();
}

export function handleFeedbackRevoked(event: FeedbackRevokedEvent): void {
  let id = feedbackId(
    event.params.agentId,
    event.params.clientAddress,
    event.params.feedbackIndex,
  );
  let fb = Feedback.load(id);
  if (fb == null) {
    return;
  }

  fb.revoked = true;
  fb.blockNumber = event.block.number;
  fb.blockTimestamp = event.block.timestamp;
  fb.transactionHash = event.transaction.hash;
  fb.save();
}

export function handleResponseAppended(event: ResponseAppendedEvent): void {
  let fbId = feedbackId(
    event.params.agentId,
    event.params.clientAddress,
    event.params.feedbackIndex,
  );

  let fb = Feedback.load(fbId);
  if (fb == null) {
    fb = new Feedback(fbId);
    fb.agentId = event.params.agentId;
    fb.clientAddress = event.params.clientAddress;
    fb.feedbackIndex = event.params.feedbackIndex;
    fb.value = BigInt.zero();
    fb.valueDecimals = 0;
    fb.tag1 = "";
    fb.tag2 = "";
    fb.endpoint = "";
    fb.feedbackURI = "";
    fb.feedbackHash = Bytes.empty();
    fb.revoked = false;
    fb.blockNumber = event.block.number;
    fb.blockTimestamp = event.block.timestamp;
    fb.transactionHash = event.transaction.hash;
    fb.save();
  }

  let response = new FeedbackResponse(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  response.feedback = fbId;
  response.agentId = event.params.agentId;
  response.clientAddress = event.params.clientAddress;
  response.feedbackIndex = event.params.feedbackIndex;
  response.responder = event.params.responder;
  response.responseURI = event.params.responseURI;
  response.responseHash = event.params.responseHash;

  response.blockNumber = event.block.number;
  response.blockTimestamp = event.block.timestamp;
  response.transactionHash = event.transaction.hash;
  response.save();
}

export function handleValidationRequest(event: ValidationRequestEvent): void {
  let v = Validation.load(event.params.requestHash);
  if (v == null) {
    v = new Validation(event.params.requestHash);
    v.requestHash = event.params.requestHash;
  }

  v.validatorAddress = event.params.validatorAddress;
  v.agentId = event.params.agentId;
  v.requestURI = event.params.requestURI;

  v.blockNumber = event.block.number;
  v.blockTimestamp = event.block.timestamp;
  v.transactionHash = event.transaction.hash;

  v.save();
}

export function handleValidationResponse(event: ValidationResponseEvent): void {
  let v = Validation.load(event.params.requestHash);
  if (v == null) {
    v = new Validation(event.params.requestHash);
    v.requestHash = event.params.requestHash;
    v.validatorAddress = event.params.validatorAddress;
    v.agentId = event.params.agentId;
    v.requestURI = "";
  }

  v.validatorAddress = event.params.validatorAddress;
  v.agentId = event.params.agentId;
  v.response = event.params.response;
  v.responseURI = event.params.responseURI;
  v.responseHash = event.params.responseHash;
  v.tag = event.params.tag;

  v.blockNumber = event.block.number;
  v.blockTimestamp = event.block.timestamp;
  v.transactionHash = event.transaction.hash;

  v.save();
}
