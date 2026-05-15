import { z } from "zod";

/**
 * Source of truth for backend handler ids implemented in
 * `stardorm/backend/src/handlers/handlers.service.ts`. Keep in sync.
 */
export const HANDLER_ACTION_IDS = [
  "generate_tax_report",
  "create_x402_payment",
  /** Fiat checkout via Stripe; webhook fulfills ERC-20 transfer from treasury key. */
  "on_ramp_tokens",
  /** Stripe Identity hosted verification for the signed-in wallet user. */
  "complete_stripe_kyc",
  /** Issue a virtual payment card record with billing profile and spend balance. */
  "create_credit_card",
  /** PDF + structured snapshot: payment requests, on-ramps, cards, KYC for this wallet. */
  "generate_payment_invoice",
  /** Summary report across payment requests, on-ramps, virtual cards, and KYC status. */
  "generate_financial_activity_report",
  /** Confirms a native (gas token) transfer draft; user signs in their wallet / Beam Send. */
  "draft_native_transfer",
  /** Confirms an ERC-20 transfer draft; user signs in their wallet / Beam Send. */
  "draft_erc20_transfer",
  /** Confirms an NFT (ERC-721 / ERC-1155) transfer draft; user signs in their wallet / Beam Send. */
  "draft_nft_transfer",
  /** Confirms a Uniswap V3 single-hop swap on 0G mainnet; user signs approve + router in wallet. */
  "draft_token_swap",
  /** Direct the user to hire a marketplace specialist for a task this agent cannot run. */
  "suggest_marketplace_hire",
] as const;

export type HandlerActionId = (typeof HANDLER_ACTION_IDS)[number];

export function isHandlerActionId(id: string): id is HandlerActionId {
  return (HANDLER_ACTION_IDS as readonly string[]).includes(id);
}

export const handlerActionIdSchema = z.enum(HANDLER_ACTION_IDS);

export const handlersListResponseSchema = z.object({
  handlers: z.array(handlerActionIdSchema),
});

export type HandlersListResponse = z.infer<typeof handlersListResponseSchema>;
