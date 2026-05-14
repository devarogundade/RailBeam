import {
  HANDLER_ACTION_IDS as CONTRACT_HANDLER_ACTION_IDS,
  isHandlerActionId as contractIsHandlerActionId,
  type HandlerActionId as ContractHandlerActionId,
} from '@beam/stardorm-api-contract';

export type HandlerAttachment = {
  rootHash: string;
  mimeType: string;
  name: string;
};

export type HandlerMessage = {
  message: string;
  attachments?: HandlerAttachment[];
  data?: Record<string, unknown>;
};

export type HandlerContext = {
  walletAddress: string;
  /** 0G EVM chain id from the Beam app (`X-Beam-Chain-Id`), when known. */
  clientEvmChainId?: number;
};

/** Re-exported from `@beam/stardorm-api-contract` so the contract stays the single source of truth. */
export const HANDLER_ACTION_IDS = CONTRACT_HANDLER_ACTION_IDS;

export type HandlerActionId = ContractHandlerActionId;

export const isHandlerActionId = contractIsHandlerActionId;

export interface HandlerService {
  readonly id: HandlerActionId;
  handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage>;
}
