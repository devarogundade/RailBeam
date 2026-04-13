import type { OgComputeChatResult } from '../og/og-compute.service';

export type AgentCardRegistrationV1 = {
  type?: string;
  name?: string;
  description?: string;
  image?: string;
  services?: Array<{ name?: string; endpoint?: string; version?: string }>;
  x402Support?: boolean;
  active?: boolean;
  registrations?: Array<{ agentId: number; agentRegistry: string }>;
  supportedTrust?: string[];
};

export type ChainAgent = {
  parsedTokenURI: AgentCardRegistrationV1 | null;
  decryptedConfig: string | null;
};

export type ChatWithAgentResponse = {
  type: 'text' | 'x402';
  content: string;
  compute: Pick<
    OgComputeChatResult,
    'model' | 'verified' | 'chatId' | 'provider' | 'computeNetwork'
  >;
};
