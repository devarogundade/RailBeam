import {
  ValidationRequest as ValidationRequestEvent,
  ValidationResponse as ValidationResponseEvent,
} from "../generated/ValidationRegistry/ValidationRegistry";
import { Validation } from "../generated/schema";

export function handleValidationRequest(event: ValidationRequestEvent): void {
  let v = Validation.load(event.params.requestHash);
  if (!v) {
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
  if (!v) {
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

