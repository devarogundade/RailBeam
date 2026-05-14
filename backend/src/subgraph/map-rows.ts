import type {
  Agent,
  AgentMetadata,
  Feedback,
  Validation,
} from './types';

function parseBigIntString(s: string): number {
  const n = Number(s);
  if (!Number.isFinite(n)) {
    throw new Error(`Expected finite number from subgraph bigint string: ${s}`);
  }
  return n;
}

function mapMetadataRow(m: Record<string, unknown>): AgentMetadata {
  return {
    id: String(m.id),
    agentId: parseBigIntString(String(m.agentId)),
    key: String(m.key),
    value: String(m.value),
    updatedBy: String(m.updatedBy),
    blockNumber: parseBigIntString(String(m.blockNumber)),
    blockTimestamp: parseBigIntString(String(m.blockTimestamp)),
    transactionHash: String(m.transactionHash),
  };
}

export function mapAgentRow(raw: Record<string, unknown>): Agent {
  const metadata = Array.isArray(raw.metadata)
    ? raw.metadata.map((x) => mapMetadataRow(x as Record<string, unknown>))
    : [];

  return {
    id: String(raw.id),
    agentId: parseBigIntString(String(raw.agentId)),
    owner: String(raw.owner),
    uri: raw.uri == null ? null : String(raw.uri),
    agentWallet: raw.agentWallet == null ? null : String(raw.agentWallet),
    feePerDay: raw.feePerDay == null ? null : String(raw.feePerDay),
    blockNumber: parseBigIntString(String(raw.blockNumber)),
    blockTimestamp: parseBigIntString(String(raw.blockTimestamp)),
    transactionHash: String(raw.transactionHash),
    metadata,
  };
}

export function mapFeedbackRow(raw: Record<string, unknown>): Feedback {
  return {
    id: String(raw.id),
    agentId: parseBigIntString(String(raw.agentId)),
    clientAddress: String(raw.clientAddress),
    feedbackIndex: String(raw.feedbackIndex),
    value: String(raw.value),
    valueDecimals: Number(raw.valueDecimals),
    tag1: String(raw.tag1),
    tag2: String(raw.tag2),
    endpoint: String(raw.endpoint),
    feedbackURI: String(raw.feedbackURI),
    feedbackHash: String(raw.feedbackHash),
    revoked: Boolean(raw.revoked),
    blockNumber: parseBigIntString(String(raw.blockNumber)),
    blockTimestamp: parseBigIntString(String(raw.blockTimestamp)),
    transactionHash: String(raw.transactionHash),
  };
}

export function mapValidationRow(raw: Record<string, unknown>): Validation {
  return {
    id: String(raw.id),
    requestHash: String(raw.requestHash),
    validatorAddress: String(raw.validatorAddress),
    agentId: parseBigIntString(String(raw.agentId)),
    requestURI: String(raw.requestURI),
    response: raw.response == null ? null : Number(raw.response),
    responseURI: raw.responseURI == null ? null : String(raw.responseURI),
    responseHash: raw.responseHash == null ? null : String(raw.responseHash),
    tag: raw.tag == null ? null : String(raw.tag),
    blockNumber: parseBigIntString(String(raw.blockNumber)),
    blockTimestamp: parseBigIntString(String(raw.blockTimestamp)),
    transactionHash: String(raw.transactionHash),
  };
}
