import {
  NewFeedback as NewFeedbackEvent,
  FeedbackRevoked as FeedbackRevokedEvent,
  ResponseAppended as ResponseAppendedEvent,
} from "../generated/ReputationRegistry/ReputationRegistry";
import { Feedback, FeedbackResponse } from "../generated/schema";
import { BigInt, Bytes, crypto } from "@graphprotocol/graph-ts";

function feedbackId(agentId: BigInt, client: Bytes, feedbackIndex: BigInt): Bytes {
  let payload = Bytes.fromUTF8(
    agentId.toString() + "-" + client.toHexString() + "-" + feedbackIndex.toString()
  );
  return Bytes.fromByteArray(crypto.keccak256(payload));
}

export function handleNewFeedback(event: NewFeedbackEvent): void {
  let id = feedbackId(
    event.params.agentId,
    event.params.clientAddress,
    event.params.feedbackIndex
  );

  let fb = new Feedback(id);
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
    event.params.feedbackIndex
  );
  let fb = Feedback.load(id);
  if (!fb) return;

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
    event.params.feedbackIndex
  );

  let fb = Feedback.load(fbId);
  if (!fb) {
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
    event.transaction.hash.concatI32(event.logIndex.toI32())
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

