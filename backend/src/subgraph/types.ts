export type Agent = {
  id: string;
  agentId: number;
  owner: string;
  uri: string | null;
  agentWallet: string | null;
  /** Raw wei string from subgraph BigInt */
  feePerDay: string | null;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
  metadata: AgentMetadata[];
};

export type AgentMetadata = {
  id: string;
  agentId: number;
  key: string;
  value: string;
  updatedBy: string;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
};

export type Feedback = {
  id: string;
  agentId: number;
  clientAddress: string;
  feedbackIndex: string;
  value: string;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  endpoint: string;
  feedbackURI: string;
  feedbackHash: string;
  revoked: boolean;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
};

export type Validation = {
  id: string;
  requestHash: string;
  validatorAddress: string;
  agentId: number;
  requestURI: string;
  response: number | null;
  responseURI: string | null;
  responseHash: string | null;
  tag: string | null;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
};
