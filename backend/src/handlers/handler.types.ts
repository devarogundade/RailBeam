import {
  HANDLER_ACTION_IDS as CONTRACT_HANDLER_ACTION_IDS,
  type StardormChatRichBlock,
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
  /** When set, `executeHandler` prefers this over handler-specific mappers in `UserService`. */
  rich?: StardormChatRichBlock;
};

export type HandlerContext = {
  walletAddress: string;
  /** 0G EVM chain id from the Beam app (`X-Beam-Chain-Id`), when known. */
  clientEvmChainId?: number;
};

/** Re-exported from `@beam/stardorm-api-contract` so the contract stays the single source of truth. */
export const HANDLER_ACTION_IDS = CONTRACT_HANDLER_ACTION_IDS;

/** Derive from `HANDLER_ACTION_IDS` so this stays aligned with `isHandlerActionId` (avoids split `import type` vs value resolution). */
export type HandlerActionId = (typeof HANDLER_ACTION_IDS)[number];

export function isHandlerActionId(id: string): id is HandlerActionId {
  return (HANDLER_ACTION_IDS as readonly string[]).includes(id);
}

export interface HandlerService {
  readonly id: HandlerActionId;
  handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage>;
}
