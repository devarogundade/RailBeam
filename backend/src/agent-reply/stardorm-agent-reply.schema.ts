import { z } from 'zod';
import { formatUnits } from 'ethers';
import {
  isoCountryDisplayName,
  stardormChatRichBlockSchema,
} from '@beam/stardorm-api-contract';
import type { StardormChatRichBlock } from '@beam/stardorm-api-contract';
import {
  HANDLER_ACTION_IDS,
  isHandlerActionId,
  type HandlerActionId,
} from '../handlers/handler.types';
import {
  TaxesInputSchema,
  X402InputSchema,
  generateTaxReportToolArgsSchema,
  createX402PaymentToolArgsSchema,
  createOnRampTokensToolArgsSchema,
  createCreditCardToolArgsSchema,
  offerX402CheckoutFormToolArgsSchema,
  offerOnRampCheckoutFormToolArgsSchema,
  offerCreditCardCheckoutFormToolArgsSchema,
  offerSwapCheckoutFormToolArgsSchema,
  offerTransferCheckoutFormToolArgsSchema,
  x402CheckoutFormCtaParamsSchema,
  creditCardFormCtaParamsSchema,
  swapFormCtaParamsSchema,
  transferFormCtaParamsSchema,
  type GenerateTaxReportToolArgs,
  type X402Input,
  type CreateX402PaymentToolArgs,
  type CreateOnRampTokensToolArgs,
  type CreateCreditCardToolArgs,
  type X402CheckoutFormCtaParams,
} from '../handlers/handler-inputs.schema';
import {
  onRampFormCtaParamsSchema,
  onRampTokensInputSchema,
  stripeKycInputSchema,
  createCreditCardInputSchema,
  generatePaymentInvoiceInputSchema,
  generateFinancialActivityReportInputSchema,
  draftNativeTransferInputSchema,
  draftErc20TransferInputSchema,
  draftNftTransferInputSchema,
  draftTokenSwapInputSchema,
  suggestMarketplaceHireInputSchema,
} from '@beam/stardorm-api-contract';
import type { OpenAiCompletionAssistantMessage } from '../og/chat-completion.schema';
import {
  txRichFromErc20Draft,
  txRichFromNativeDraft,
  txRichFromNftDraft,
} from '../handlers/transfer-draft-rich';
import { txRichFromTokenSwapDraft } from '../handlers/swap-draft-rich';
import {
  BEAM_MAINNET_CAIP2,
  BEAM_MAINNET_SWAP_ROUTER,
  defaultBeamSwapFormPayload,
} from '../beam/beam-swap.config';
import {
  beamKnownAssetsPromptBlock,
  defaultBeamTransferFormPayload,
  normalizeErc20TransferToolArgs,
} from '../beam/beam-transfer.config';
import {
  BEAM_MARKETPLACE_SPECIALIST_DEFAULTS,
  marketplaceHireRichFromInput,
} from '../beam/beam-marketplace-specialists';
import {
  attachHandlerCtaFromUserIntent,
  marketplaceHireGuardPromptLine,
  marketplaceHireWhenHandlerMissing,
  rewriteMisroutedMarketplaceHire,
} from './handler-workspace-routing';

function formatBase10Integer(raw: string): string {
  const digits = raw.replace(/\s+/g, '');
  if (!/^\d+$/.test(digits)) return raw;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function trimDecimalZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

function shortenMiddle(s: string, maxLen: number): string {
  const t = s.trim();
  if (t.length <= maxLen) return t;
  const edge = Math.max(4, Math.floor((maxLen - 1) / 2));
  return `${t.slice(0, edge)}…${t.slice(-edge)}`;
}

function shortenEvmAddress(addr: string): string {
  const t = addr.trim();
  if (!t) return '—';
  if (!/^0x[a-fA-F0-9]{40}$/i.test(t)) {
    return shortenMiddle(t, 28);
  }
  const lower = t.toLowerCase();
  return `${lower.slice(0, 6)}…${lower.slice(-4)}`;
}

function shortenAssetDisplay(asset: string): string {
  const t = asset.trim();
  if (!t) return '—';
  if (/^0x[a-fA-F0-9]{40}$/i.test(t)) return shortenEvmAddress(t);
  if (t.length <= 24) return t;
  return shortenMiddle(t, 24);
}

/** Matches `@beam/stardorm-api-contract` `stardormChatRichBlockSchema`. */
export const agentChatRichBlockSchema = stardormChatRichBlockSchema;

export type AgentRichCard = StardormChatRichBlock;

/** CAIP-2 chain ids for 0G EVM; wired into chat system prompts for correct `network` fields. */
export const STARDORM_AGENT_CAIP2_NETWORKS =
  '0G EVM CAIP-2: `eip155:16661` on mainnet; `eip155:16602` on testnet.';

const handlerEnum = z.enum(HANDLER_ACTION_IDS);

const OFFER_X402_CHECKOUT_FORM = 'offer_x402_checkout_form' as const;
const OFFER_ON_RAMP_CHECKOUT_FORM = 'offer_on_ramp_checkout_form' as const;
const OFFER_CREDIT_CARD_CHECKOUT_FORM = 'offer_credit_card_checkout_form' as const;
const OFFER_SWAP_CHECKOUT_FORM = 'offer_swap_checkout_form' as const;
const OFFER_TRANSFER_CHECKOUT_FORM = 'offer_transfer_checkout_form' as const;

function handlerIdsForJsonContract(): string {
  return HANDLER_ACTION_IDS.map((h) => `"${h}"`).join('|');
}

function normalizeHandlerField(v: unknown): HandlerActionId | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return v as HandlerActionId;
}

function normalizeParamsField(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  return v;
}

/** Parsed model reply after `agentComputeReplySchema` transform (explicit for stable TS output). */
export type AgentComputeReply = {
  text: string;
  handler?: HandlerActionId;
  params?: unknown;
  rich?: AgentRichCard;
};

/**
 * Model-facing JSON: exactly one object. `handler` / `params` may be omitted,
 * or set to `null`, when no server CTA is needed. When `handler` is a real id,
 * `params` must match that handler’s input schema.
 */
export const agentComputeReplySchema = z
  .object({
    text: z.string().min(1),
    handler: z.union([handlerEnum, z.null(), z.literal('')]).optional(),
    params: z.unknown().nullish(),
    rich: agentChatRichBlockSchema.optional(),
  })
  .superRefine((val, ctx) => {
    const handler = normalizeHandlerField(val.handler);
    const params = normalizeParamsField(val.params);

    if (handler === undefined) {
      if (params !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'params must be null or omitted when handler is null, empty, or omitted',
          path: ['params'],
        });
      }
      return;
    }
    if (params === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'params required when handler is set',
        path: ['params'],
      });
      return;
    }
    if (handler === 'generate_tax_report') {
      const r = TaxesInputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid params for generate_tax_report',
          path: ['params'],
        });
        return;
      }
    }
    if (handler === 'create_x402_payment') {
      const form = x402CheckoutFormCtaParamsSchema.safeParse(params);
      if (form.success) return;
      const r = X402InputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid params for create_x402_payment (need full payment fields or a checkout form payload)',
          path: ['params'],
        });
      }
    }
    if (handler === 'on_ramp_tokens') {
      const form = onRampFormCtaParamsSchema.safeParse(params);
      if (form.success) return;
      const r = onRampTokensInputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid params for on_ramp_tokens (need full on-ramp fields or an on-ramp checkout form payload)',
          path: ['params'],
        });
      }
    }
    if (handler === 'complete_stripe_kyc') {
      const r = stripeKycInputSchema.safeParse(
        params && typeof params === 'object' ? params : {},
      );
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid params for complete_stripe_kyc',
          path: ['params'],
        });
      }
    }
    if (handler === 'create_credit_card') {
      const form = creditCardFormCtaParamsSchema.safeParse(params);
      if (form.success) return;
      const r = createCreditCardInputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid params for create_credit_card (need full billing fields or a credit card checkout form payload)',
          path: ['params'],
        });
      }
    }
    if (handler === 'generate_payment_invoice') {
      const r = generatePaymentInvoiceInputSchema.safeParse(
        params && typeof params === 'object' ? params : {},
      );
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid params for generate_payment_invoice',
          path: ['params'],
        });
      }
    }
    if (handler === 'generate_financial_activity_report') {
      const r = generateFinancialActivityReportInputSchema.safeParse(
        params && typeof params === 'object' ? params : {},
      );
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid params for generate_financial_activity_report',
          path: ['params'],
        });
      }
    }
    if (handler === 'draft_native_transfer') {
      const r = draftNativeTransferInputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid params for draft_native_transfer',
          path: ['params'],
        });
      }
    }
    if (handler === 'draft_erc20_transfer') {
      const form = transferFormCtaParamsSchema.safeParse(params);
      if (form.success) return;
      const r = draftErc20TransferInputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid params for draft_erc20_transfer (need full transfer fields or a transfer checkout form payload)',
          path: ['params'],
        });
      }
    }
    if (handler === 'draft_nft_transfer') {
      const r = draftNftTransferInputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid params for draft_nft_transfer',
          path: ['params'],
        });
      }
    }
    if (handler === 'draft_token_swap') {
      const form = swapFormCtaParamsSchema.safeParse(params);
      if (form.success) return;
      const r = draftTokenSwapInputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid params for draft_token_swap (need full swap fields or a swap checkout form payload)',
          path: ['params'],
        });
      }
    }
    if (handler === 'suggest_marketplace_hire') {
      const r = suggestMarketplaceHireInputSchema.safeParse(params);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid params for suggest_marketplace_hire',
          path: ['params'],
        });
      }
    }
  })
  .transform((val): AgentComputeReply => {
    const text =
      typeof val.text === 'string' ? val.text : z.string().min(1).parse(val.text);
    return {
      text,
      handler: normalizeHandlerField(val.handler),
      params: normalizeParamsField(val.params),
      rich: val.rich,
    };
  });

type X402HandlerParams = X402Input | X402CheckoutFormCtaParams;
type OnRampHandlerParams =
  | z.infer<typeof onRampTokensInputSchema>
  | z.infer<typeof onRampFormCtaParamsSchema>;
type CreditCardHandlerParams =
  | z.infer<typeof createCreditCardInputSchema>
  | z.infer<typeof creditCardFormCtaParamsSchema>;

/** After validation: either text-only, or text + handler + params (no nulls). */
export type AgentComputeReplyWithParams =
  | { text: string; handler?: undefined; params?: undefined; rich?: AgentRichCard }
  | {
      text: string;
      handler: 'generate_tax_report';
      params: z.infer<typeof TaxesInputSchema>;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'create_x402_payment';
      params: X402HandlerParams;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'on_ramp_tokens';
      params: OnRampHandlerParams;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'complete_stripe_kyc';
      params: z.infer<typeof stripeKycInputSchema>;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'create_credit_card';
      params: CreditCardHandlerParams;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'generate_payment_invoice';
      params: z.infer<typeof generatePaymentInvoiceInputSchema>;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'generate_financial_activity_report';
      params: z.infer<typeof generateFinancialActivityReportInputSchema>;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'draft_native_transfer';
      params: z.infer<typeof draftNativeTransferInputSchema>;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'draft_erc20_transfer';
      params:
        | z.infer<typeof draftErc20TransferInputSchema>
        | z.infer<typeof transferFormCtaParamsSchema>;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'draft_nft_transfer';
      params: z.infer<typeof draftNftTransferInputSchema>;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'draft_token_swap';
      params:
        | z.infer<typeof draftTokenSwapInputSchema>
        | z.infer<typeof swapFormCtaParamsSchema>;
      rich?: AgentRichCard;
    }
  | {
      text: string;
      handler: 'suggest_marketplace_hire';
      params: z.infer<typeof suggestMarketplaceHireInputSchema>;
      rich?: AgentRichCard;
    };

/** Narrow `AgentComputeReply` after successful schema parse. */
export function asTypedAgentReply(
  r: AgentComputeReply,
): AgentComputeReplyWithParams {
  const rich = r.rich;
  if (!r.handler) {
    return { text: r.text, rich };
  }
  if (r.handler === 'generate_tax_report') {
    const p = TaxesInputSchema.parse(r.params);
    return { text: r.text, handler: 'generate_tax_report', params: p, rich };
  }
  if (r.handler === 'create_x402_payment') {
    const formTry = x402CheckoutFormCtaParamsSchema.safeParse(r.params);
    if (formTry.success) {
      const filledRich: AgentRichCard | undefined =
        rich ??
        ({
          type: 'x402_checkout_form',
          title: 'Payment checkout',
          supportedAssets: formTry.data.supportedAssets,
          networks: formTry.data.networks,
          intro: formTry.data.intro,
          resourceUrl: formTry.data.resourceUrl,
        } as AgentRichCard);
      return {
        text: r.text,
        handler: 'create_x402_payment',
        params: formTry.data,
        rich: filledRich,
      };
    }
    const p = X402InputSchema.parse(r.params);
    return { text: r.text, handler: 'create_x402_payment', params: p, rich };
  }
  if (r.handler === 'on_ramp_tokens') {
    const formTry = onRampFormCtaParamsSchema.safeParse(r.params);
    if (formTry.success) {
      const filledRich: AgentRichCard | undefined =
        rich ??
        ({
          type: 'on_ramp_checkout_form',
          title: 'Token on-ramp',
          supportedAssets: formTry.data.supportedAssets,
          networks: formTry.data.networks,
          intro: formTry.data.intro,
        } as AgentRichCard);
      return {
        text: r.text,
        handler: 'on_ramp_tokens',
        params: formTry.data,
        rich: filledRich,
      };
    }
    const p = onRampTokensInputSchema.parse(r.params);
    return { text: r.text, handler: 'on_ramp_tokens', params: p, rich };
  }
  if (r.handler === 'complete_stripe_kyc') {
    const p = stripeKycInputSchema.parse(
      r.params && typeof r.params === 'object' ? r.params : {},
    );
    return { text: r.text, handler: 'complete_stripe_kyc', params: p, rich };
  }
  if (r.handler === 'create_credit_card') {
    const formTry = creditCardFormCtaParamsSchema.safeParse(r.params);
    if (formTry.success) {
      const filledRich: AgentRichCard | undefined =
        rich ??
        ({
          type: 'credit_card_checkout_form',
          title: 'Virtual payment card',
          intro: formTry.data.intro,
          defaultCurrency: formTry.data.defaultCurrency,
        } as unknown as AgentRichCard);
      return {
        text: r.text,
        handler: 'create_credit_card',
        params: formTry.data,
        rich: filledRich,
      };
    }
    const p = createCreditCardInputSchema.parse(r.params);
    return { text: r.text, handler: 'create_credit_card', params: p, rich };
  }
  if (r.handler === 'generate_payment_invoice') {
    const p = generatePaymentInvoiceInputSchema.parse(
      r.params && typeof r.params === 'object' ? r.params : {},
    );
    const filledRich = rich ?? agentRichFromPaymentInvoiceParams(p);
    return {
      text: r.text,
      handler: 'generate_payment_invoice',
      params: p,
      rich: filledRich,
    };
  }
  if (r.handler === 'generate_financial_activity_report') {
    const p = generateFinancialActivityReportInputSchema.parse(
      r.params && typeof r.params === 'object' ? r.params : {},
    );
    const filledRich = rich ?? agentRichFromFinancialActivityReportParams(p);
    return {
      text: r.text,
      handler: 'generate_financial_activity_report',
      params: p,
      rich: filledRich,
    };
  }
  if (r.handler === 'draft_native_transfer') {
    const p = draftNativeTransferInputSchema.parse(r.params);
    const filledRich = rich ?? txRichFromNativeDraft(p);
    return { text: r.text, handler: 'draft_native_transfer', params: p, rich: filledRich };
  }
  if (r.handler === 'draft_erc20_transfer') {
    const formTry = transferFormCtaParamsSchema.safeParse(r.params);
    if (formTry.success) {
      const defaults = defaultBeamTransferFormPayload();
      const filledRich: AgentRichCard | undefined =
        rich ??
        ({
          type: 'transfer_checkout_form',
          title: 'Token transfer',
          supportedAssets: formTry.data.supportedAssets,
          networks: formTry.data.networks ?? defaults.networks,
          intro: formTry.data.intro,
          defaultTo: formTry.data.defaultTo,
        } as unknown as AgentRichCard);
      return {
        text: r.text,
        handler: 'draft_erc20_transfer',
        params: formTry.data,
        rich: filledRich,
      };
    }
    const p = draftErc20TransferInputSchema.parse(r.params);
    const filledRich = rich ?? txRichFromErc20Draft(p);
    return { text: r.text, handler: 'draft_erc20_transfer', params: p, rich: filledRich };
  }
  if (r.handler === 'draft_nft_transfer') {
    const p = draftNftTransferInputSchema.parse(r.params);
    const filledRich = rich ?? txRichFromNftDraft(p);
    return { text: r.text, handler: 'draft_nft_transfer', params: p, rich: filledRich };
  }
  if (r.handler === 'draft_token_swap') {
    const formTry = swapFormCtaParamsSchema.safeParse(r.params);
    if (formTry.success) {
      const defaults = defaultBeamSwapFormPayload();
      const filledRich: AgentRichCard | undefined =
        rich ??
        ({
          type: 'swap_checkout_form',
          title: 'Token swap',
          supportedAssets: formTry.data.supportedAssets,
          networks: formTry.data.networks ?? defaults.networks,
          intro: formTry.data.intro,
          defaultPoolFee: formTry.data.defaultPoolFee ?? defaults.defaultPoolFee,
        } as unknown as AgentRichCard);
      return {
        text: r.text,
        handler: 'draft_token_swap',
        params: formTry.data,
        rich: filledRich,
      };
    }
    const p = draftTokenSwapInputSchema.parse(r.params);
    const filledRich = rich ?? txRichFromTokenSwapDraft(p);
    return { text: r.text, handler: 'draft_token_swap', params: p, rich: filledRich };
  }
  if (r.handler === 'suggest_marketplace_hire') {
    const p = suggestMarketplaceHireInputSchema.parse(r.params);
    const filledRich = rich ?? marketplaceHireRichFromInput(p);
    return {
      text: r.text,
      handler: 'suggest_marketplace_hire',
      params: p,
      rich: filledRich,
    };
  }
  return { text: r.text, rich };
}

export function agentAllowsHandler(
  allowed: readonly HandlerActionId[],
  handler: HandlerActionId,
): boolean {
  return allowed.includes(handler);
}

export function parseModelJsonObject(raw: string): unknown {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fence) s = fence[1].trim();
  const tryParse = (t: string) => {
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  };
  let v = tryParse(s);
  if (v !== null) return v;
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i >= 0 && j > i) v = tryParse(s.slice(i, j + 1));
  return v;
}

export function buildAgentOutputContract(
  allowed: readonly HandlerActionId[],
): string {
  const list = allowed.length
    ? allowed.join(', ')
    : '(none — never set handler)';
  const routing =
    allowed.length === 0
      ? [
          '- This chat agent has NO server handler tools. Never set "handler" or "params" to a real id.',
          '- If the user asks for x402 payment links, checkout pages, invoices, or on-chain payment requests: in "text", briefly explain you cannot create those here and tell them to open the marketplace, hire the **Ledger** agent (agentKey `ledger`, Payments), switch the active chat agent to Ledger, then ask again.',
          '- If the user asks for tax reports, tax PDFs, filing summaries, or crypto tax exports: tell them to hire **Fiscus** (agentKey `fiscus`, Taxes), switch to that agent, then ask again.',
          '- If the user asks for card-to-crypto on-ramp or Stripe checkout for tokens: tell them to hire **Ramp** (agentKey `ramp`, Payments), switch to that agent, then ask again.',
          '- If the user asks for KYC or identity verification: tell them to hire **Passport** (agentKey `passport`, Compliance), switch to that agent, then ask again.',
          '- If the user asks for a virtual company payment card, billing profile on file, or card spend balance: tell them to hire **Capita** (agentKey `capita`, Payments), switch to that agent, then ask again.',
          '- If the user asks for a wallet invoice or PDF covering their checkouts, on-ramp, cards, and KYC: tell them to hire **Ledger** (agentKey `ledger`, Payments), switch to that agent, then ask again.',
          '- If the user asks for an activity snapshot or treasury-style counts across payments, on-ramp, cards, and KYC: tell them to hire **Scribe** or **Audita** (Reports), or **Settler** (Payments for settlements), switch agents, then ask again.',
          '- Whenever any bullet above applies, set handler `suggest_marketplace_hire` with `specialistAgentKey` and matching `rich` type `marketplace_hire`. Do not answer with text alone.',
        ].join('\n')
      : '';
  return [
    'You are a Stardorm financial agent.',
    STARDORM_AGENT_CAIP2_NETWORKS,
    beamKnownAssetsPromptBlock(),
    beamMarketplaceSpecialistsPromptBlock(),
    'Your entire reply MUST be a single JSON object only (no markdown, no prose outside JSON).',
    `JSON shape: {"text": string, "handler"?: ${handlerIdsForJsonContract()}|null, "params"?: object|null, "rich"?: …}`,
    'Rules:',
    '- "text" is user-visible markdown-free summary.',
    '- When no CTA is needed: omit "handler" and "params", or set both to null.',
    '- When a CTA is needed: set "handler" and "params" (non-null) so the client can run server-side code.',
    '- If "handler" is a real id, "params" is required and must validate for that handler.',
    '- Optional "rich" is a small summary card for the UI; omit if not helpful.',
    `- You may ONLY propose handlers in this list: ${list}.`,
    routing,
    allowed.includes('generate_tax_report')
      ? '- generate_tax_report params: {"from":{"year","month","day"},"to":{"year","month","day"},"countryCode":"US"} (ISO 3166-1 alpha-2).'
      : '',
    allowed.includes('create_x402_payment')
      ? [
          '- create_x402_payment (JSON-only): use when the user message explicitly contains every required field: `id`, `amount` (wei integer string), `currency` (USDC.e only), `network` (0G mainnet `eip155:16661`), `payTo` (0x…40), plus optional `title`, `resourceUrl`, `decimals`. Never invent values.',
          '- Checkout form mode (JSON-only): use when anything is missing or ambiguous: params `{"_checkoutForm":true,"supportedAssets":[USDC.e only], ...}` (optional `resourceUrl`) and matching `rich` type `x402_checkout_form` so the client collects the rest.',
        ].join('\n')
      : '',
    allowed.includes('on_ramp_tokens')
      ? [
          '- on_ramp_tokens (JSON-only): use only when the user message already states `recipientWallet`, `network` (CAIP-2), `tokenAddress`, `tokenDecimals`, `tokenSymbol`, `tokenAmountWei` (base units string), `usdAmountCents` (integer cents), and optional `usdValue`. Never invent wallet addresses, token contracts, or amounts.',
          '- On-ramp checkout form: params `{"_onRampForm":true,"supportedAssets":[...], ...}` and matching `rich` type `on_ramp_checkout_form` when any required field is missing or ambiguous.',
        ].join('\n')
      : '',
    allowed.includes('complete_stripe_kyc')
      ? '- complete_stripe_kyc params: optional `returnPath` (app path for Stripe return_url); may be `{}`.'
      : '',
    allowed.includes('create_credit_card')
      ? [
          '- create_credit_card (JSON-only): use only when the user message already states `firstName`, `lastName`, `line1`, optional `line2`, `city`, `region`, `postalCode`, `countryCode` (ISO 3166-1 alpha-2), optional `cardLabel`, optional `currency` (3-letter ISO), optional `initialBalanceCents`. Never invent PII.',
          '- Virtual card billing form: params `{"_creditCardForm":true}` (optional `intro`, optional `defaultCurrency`) and matching `rich` type `credit_card_checkout_form` when any required field is missing or ambiguous.',
        ].join('\n')
      : '',
    allowed.includes('generate_payment_invoice')
      ? '- generate_payment_invoice params: optional `from`/`to` each `{"year","month","day"}` (UTC), optional `invoiceTitle`; may be `{}` for all recent rows.'
      : '',
    allowed.includes('generate_financial_activity_report')
      ? '- generate_financial_activity_report params: optional `from`/`to` each `{"year","month","day"}` (UTC), optional `reportTitle`; may be `{}` for all recent rows.'
      : '',
    allowed.includes('draft_native_transfer')
      ? '- draft_native_transfer params: `network` (CAIP-2 `eip155:<chainId>`), `to` (0x…40 recipient), `valueWei` (positive integer string wei), optional `note`. Never invent addresses or amounts.'
      : '',
    allowed.includes('draft_erc20_transfer')
      ? [
          '- draft_erc20_transfer (JSON-only): use when the user message states `network` (or mainnet/testnet), `to` (0x…40), human or wei amount, and token (USDC.e / USDC.e contract — never ask for USDC.e address on 0G).',
          '- Transfer checkout form: params `{"_transferForm":true,"supportedAssets":[...], ...}` and matching `rich` type `transfer_checkout_form` when any required field is missing; use only tokens from the supported list.',
        ].join('\n')
      : '',
    allowed.includes('draft_nft_transfer')
      ? '- draft_nft_transfer params: `network` (CAIP-2), `contract` (NFT collection 0x…40), `standard` (`erc721` default or `erc1155`), `to` (0x…40), `tokenId` (decimal string). For ERC-1155 include required positive integer string `amount`; omit `amount` for ERC-721. Optional `note`. Never invent token ids or contracts.'
      : '',
    allowed.includes('draft_token_swap')
      ? [
          '- draft_token_swap (JSON-only): use only on **0G mainnet** (`network` must be `eip155:16661`). Never target testnet (`eip155:16602`) — those intents are blocked.',
          '- When the user already states `tokenIn`, `tokenInDecimals`, `tokenOut`, `tokenOutDecimals`, `amountInWei` (base units), optional `amountOutMinimumWei`, optional `poolFee` (500|3000|10000), call **draft_token_swap** with those exact values (optional symbols).',
          '- Swap checkout form: params `{"_swapForm":true,"supportedAssets":[...], ...}` and matching `rich` type `swap_checkout_form` when any field is missing; use only tokens from the supported list.',
        ].join('\n')
      : '',
    '- suggest_marketplace_hire params: `specialistAgentKey` (required), optional `specialistName`, `category`, `capability`, `userTask`, `intro`, `requiredHandler`. Use matching `rich` type `marketplace_hire`.',
    marketplaceHireGuardPromptLine(allowed),
  ]
    .filter(Boolean)
    .join('\n');
}

export function structuredReplyFromModelContent(
  content: string,
  allowedHandlers: readonly HandlerActionId[],
): AgentComputeReplyWithParams {
  const raw = parseModelJsonObject(content);
  const base = agentComputeReplySchema.safeParse(raw);
  if (!base.success) {
    return { text: content.trim() || 'No reply.' };
  }
  const d = base.data;
  if (d.handler != null && !agentAllowsHandler(allowedHandlers, d.handler)) {
    return { text: d.text, ...(d.rich ? { rich: d.rich } : {}) };
  }
  return asTypedAgentReply(d);
}

/**
 * Shown when the model calls a handler tool but leaves `content` empty.
 * Keep in sync with `HANDLER_CTA_LINES` in `handler-workspace-routing.ts`.
 */
function defaultHandlerOfferText(handler: HandlerActionId): string {
  if (handler === 'generate_tax_report') {
    return 'Confirm the tax period below, then tap **Generate tax PDF** to build your report.';
  }
  if (handler === 'create_x402_payment') {
    return 'Enter the USDC.e amount and payee in the form below, then tap **Create payment link**.';
  }
  if (handler === 'on_ramp_tokens') {
    return 'Pick a supported token and network, enter amounts, then tap **Create Stripe checkout**.';
  }
  if (handler === 'complete_stripe_kyc') {
    return "I'll start the Stripe Identity verification process for you. Tap **Start Identity verification** to begin the secure KYC flow.";
  }
  if (handler === 'create_credit_card') {
    return 'Enter your legal name and billing address in the form below, then tap **Create virtual card** to issue the card.';
  }
  if (handler === 'generate_payment_invoice') {
    return 'Tap **Download payment summary** below to generate a PDF from your Beam records.';
  }
  if (handler === 'generate_financial_activity_report') {
    return 'Tap **Download activity report** below to build the snapshot PDF.';
  }
  if (handler === 'draft_native_transfer') {
    return 'Confirm the network, recipient, and amount, then tap **Confirm transfer draft** and sign in your wallet.';
  }
  if (handler === 'draft_erc20_transfer') {
    return 'Pick the token, recipient, and amount in the form below, then tap **Confirm transfer draft**.';
  }
  if (handler === 'draft_nft_transfer') {
    return 'Provide collection, token id, and recipient, then tap **Confirm transfer draft** and sign in your wallet.';
  }
  if (handler === 'draft_token_swap') {
    return 'Pick tokens and amounts in the swap form below (0G mainnet only), then tap **Confirm swap draft**.';
  }
  if (handler === 'suggest_marketplace_hire') {
    return 'You need a marketplace specialist for this — use the card below to hire them and continue.';
  }
  return 'Use the action below to continue.';
}

function beamMarketplaceSpecialistsPromptBlock(): string {
  const rows = Object.entries(BEAM_MARKETPLACE_SPECIALIST_DEFAULTS).map(
    ([key, meta]) => `${key} (${meta.category}): ${meta.capability}`,
  );
  return ['Beam marketplace specialists (agentKey → capability):', ...rows].join('\n');
}

function fmtTaxDatePart(p: { year: number; month: number; day: number }): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function billingPeriodLabelFromParts(input: {
  from?: { year: number; month: number; day: number };
  to?: { year: number; month: number; day: number };
}): string {
  const a = input.from ? fmtTaxDatePart(input.from) : undefined;
  const b = input.to ? fmtTaxDatePart(input.to) : undefined;
  if (a && b) return `${a} → ${b} (UTC)`;
  if (a) return `From ${a} UTC`;
  if (b) return `Through ${b} UTC`;
  return 'All recent activity (no date filter)';
}

function agentRichFromPaymentInvoiceParams(
  p: z.infer<typeof generatePaymentInvoiceInputSchema>,
): AgentRichCard {
  return {
    type: 'invoice',
    title:
      p.invoiceTitle?.trim() ||
      'Beam — payment & checkout summary',
    rows: [
      {
        label: 'Includes',
        value: 'Checkouts, on-ramp, virtual cards, KYC',
      },
      { label: 'Period', value: billingPeriodLabelFromParts(p) },
    ],
  };
}

function agentRichFromFinancialActivityReportParams(
  p: z.infer<typeof generateFinancialActivityReportInputSchema>,
): AgentRichCard {
  return {
    type: 'report',
    title:
      p.reportTitle?.trim() ||
      'Beam — financial activity snapshot',
    rows: [
      {
        label: 'Includes',
        value: 'Payment counts, on-ramp, cards, KYC',
      },
      { label: 'Period', value: billingPeriodLabelFromParts(p) },
    ],
  };
}

function agentRichFromTaxReportToolArgs(
  data: GenerateTaxReportToolArgs,
): AgentRichCard {
  const period = `${fmtTaxDatePart(data.from)} → ${fmtTaxDatePart(data.to)}`;
  const countryName = isoCountryDisplayName(data.countryCode);
  const baseRows = [
    {
      label: 'Country',
      value:
        countryName !== data.countryCode
          ? `${countryName} (${data.countryCode})`
          : data.countryCode,
    },
    { label: 'Filing period', value: period },
  ];
  const extras = data.reportCard?.supplementalRows ?? [];
  const title =
    data.reportCard?.cardTitle ?? `Tax report (${data.countryCode})`;
  return {
    type: 'report',
    title,
    rows: [...baseRows, ...extras],
  };
}

function agentRichFromX402PaymentToolArgs(
  data: CreateX402PaymentToolArgs,
): AgentRichCard | undefined {
  if (data.paymentCard === undefined) return undefined;
  const payTo = data.payTo;
  const payToShort = shortenEvmAddress(payTo);
  const amt = String(data.amount);
  const rows: Array<{ label: string; value: string }> = [];
  if (data.decimals != null) {
    try {
      const human = trimDecimalZeros(formatUnits(BigInt(amt), data.decimals));
      rows.push({ label: 'Amount', value: human });
    } catch {
      rows.push({ label: 'Amount', value: '—' });
    }
  } else {
    rows.push({ label: 'Amount', value: '—' });
  }
  rows.push({
    label: /^0x[a-fA-F0-9]{40}$/i.test(data.currency)
      ? 'Token contract'
      : 'Asset',
    value: shortenAssetDisplay(data.currency),
  });
  rows.push({
    label: 'Network',
    value: shortenMiddle(data.network, 48),
  });
  rows.push({ label: 'Pay to', value: payToShort });
  const extras = data.paymentCard.lineItems ?? [];
  const idLabel = data.id
    ? data.id.length > 12
      ? `${data.id.slice(0, 12)}…`
      : data.id
    : data.checkoutType === 'on-chain'
      ? 'on-chain'
      : 'checkout';
  const title =
    data.paymentCard.invoiceTitle ?? data.title ?? `Payment · ${idLabel}`;
  return {
    type: 'invoice',
    title,
    rows: [...rows, ...extras],
  };
}

function agentRichFromOnRampTokensToolArgs(
  data: CreateOnRampTokensToolArgs,
): AgentRichCard | undefined {
  if (data.paymentCard === undefined) return undefined;
  const amt = String(data.tokenAmountWei);
  const rows: Array<{ label: string; value: string }> = [];
  try {
    const human = trimDecimalZeros(
      formatUnits(BigInt(amt), data.tokenDecimals),
    );
    rows.push({
      label: `Amount (${data.tokenSymbol})`,
      value: human,
    });
  } catch {
    rows.push({ label: `Amount (${data.tokenSymbol})`, value: '—' });
  }
  rows.push({
    label: 'Token',
    value: `${data.tokenSymbol} · ${shortenEvmAddress(data.tokenAddress)}`,
  });
  rows.push({
    label: 'Network',
    value: shortenMiddle(data.network, 48),
  });
  rows.push({ label: 'Recipient', value: shortenEvmAddress(data.recipientWallet) });
  rows.push({
    label: 'Card charge (USD)',
    value: `$${(data.usdAmountCents / 100).toFixed(2)}`,
  });
  if (data.usdValue !== undefined) {
    rows.push({
      label: 'Reference spot (USD)',
      value: `$${data.usdValue.toFixed(4)}`,
    });
  }
  const extras = data.paymentCard.lineItems ?? [];
  const title =
    data.paymentCard.invoiceTitle ?? `On-ramp · ${data.tokenSymbol}`;
  return {
    type: 'invoice',
    title,
    rows: [...rows, ...extras],
  };
}

function agentRichFromCreateCreditCardToolArgs(
  data: CreateCreditCardToolArgs,
): AgentRichCard {
  const holder = `${data.firstName} ${data.lastName}`.trim();
  const street = [data.line1, data.line2].filter(Boolean).join(', ');
  const cityLine = [data.city, data.region, data.postalCode, data.countryCode]
    .filter(Boolean)
    .join(', ');
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Cardholder', value: holder || '—' },
    { label: 'Street', value: street || '—' },
    { label: 'City / region / ZIP', value: cityLine || '—' },
  ];
  if (data.cardLabel?.trim()) {
    rows.push({ label: 'Card label', value: data.cardLabel.trim() });
  }
  rows.push({
    label: 'Currency',
    value: data.currency ?? 'USD',
  });
  if (data.initialBalanceCents != null && data.initialBalanceCents > 0) {
    rows.push({
      label: 'Opening balance',
      value: `$${(data.initialBalanceCents / 100).toFixed(2)}`,
    });
  }
  const extras = data.cardPreview?.supplementalRows ?? [];
  const title =
    data.cardPreview?.cardTitle ??
    `Virtual payment card · ${data.countryCode}`;
  return {
    type: 'credit_card',
    title,
    rows: [...rows, ...extras],
  };
}

/**
 * Build the persisted / API-facing agent turn (text, optional rich card,
 * optional handler CTA) from a validated assistant message.
 */
export function agentReplyFromChatCompletion(
  assistant: OpenAiCompletionAssistantMessage,
  allowedHandlers: readonly HandlerActionId[],
): AgentComputeReplyWithParams {
  const content = assistant.content;
  const toolCalls = assistant.tool_calls;

  if (toolCalls?.length) {
    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const name = tc.function?.name;
      if (
        !name ||
        !isHandlerActionId(name) ||
        !agentAllowsHandler(allowedHandlers, name)
      ) {
        continue;
      }
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(tc.function.arguments?.trim() || '{}');
      } catch {
        continue;
      }
      if (!parsedArgs || typeof parsedArgs !== 'object') continue;
      const rec = parsedArgs as Record<string, unknown>;

      const text = content.trim() || defaultHandlerOfferText(name);

      if (name === 'generate_tax_report') {
        const full = generateTaxReportToolArgsSchema.safeParse(rec);
        if (!full.success) continue;
        const params = TaxesInputSchema.parse(full.data);
        const rich = agentRichFromTaxReportToolArgs(full.data);
        return { text, handler: 'generate_tax_report', params, rich };
      }
      if (name === 'create_x402_payment') {
        const full = createX402PaymentToolArgsSchema.safeParse(rec);
        if (!full.success) continue;
        const toolArgs: CreateX402PaymentToolArgs = full.data;
        const params = X402InputSchema.parse(toolArgs);
        const rich = agentRichFromX402PaymentToolArgs(toolArgs);
        return { text, handler: 'create_x402_payment', params, rich };
      }
      if (name === 'on_ramp_tokens') {
        const full = createOnRampTokensToolArgsSchema.safeParse(rec);
        if (!full.success) continue;
        const params = onRampTokensInputSchema.parse(full.data);
        const rich = agentRichFromOnRampTokensToolArgs(full.data);
        return { text, handler: 'on_ramp_tokens', params, rich };
      }
      if (name === 'complete_stripe_kyc') {
        const full = stripeKycInputSchema.safeParse(rec);
        if (!full.success) continue;
        return { text, handler: 'complete_stripe_kyc', params: full.data, rich: undefined };
      }
      if (name === 'create_credit_card') {
        const full = createCreditCardToolArgsSchema.safeParse(rec);
        if (!full.success) continue;
        const { cardPreview: _cp, ...rest } = full.data;
        void _cp;
        const params = createCreditCardInputSchema.parse(rest);
        const rich = agentRichFromCreateCreditCardToolArgs(full.data);
        return { text, handler: 'create_credit_card', params, rich };
      }
      if (name === 'generate_payment_invoice') {
        const full = generatePaymentInvoiceInputSchema.safeParse(rec);
        if (!full.success) continue;
        const richCard = agentRichFromPaymentInvoiceParams(full.data);
        return {
          text,
          handler: 'generate_payment_invoice',
          params: full.data,
          rich: richCard,
        };
      }
      if (name === 'generate_financial_activity_report') {
        const full = generateFinancialActivityReportInputSchema.safeParse(rec);
        if (!full.success) continue;
        const richCard = agentRichFromFinancialActivityReportParams(full.data);
        return {
          text,
          handler: 'generate_financial_activity_report',
          params: full.data,
          rich: richCard,
        };
      }
      if (name === 'draft_native_transfer') {
        const full = draftNativeTransferInputSchema.safeParse(rec);
        if (!full.success) continue;
        const richCard = txRichFromNativeDraft(full.data);
        return {
          text,
          handler: 'draft_native_transfer',
          params: full.data,
          rich: richCard,
        };
      }
      if (name === 'draft_erc20_transfer') {
        const normalized = normalizeErc20TransferToolArgs(rec);
        const full = draftErc20TransferInputSchema.safeParse(normalized);
        if (!full.success) continue;
        const richCard = txRichFromErc20Draft(full.data);
        return {
          text,
          handler: 'draft_erc20_transfer',
          params: full.data,
          rich: richCard,
        };
      }
      if (name === 'draft_nft_transfer') {
        const full = draftNftTransferInputSchema.safeParse(rec);
        if (!full.success) continue;
        const richCard = txRichFromNftDraft(full.data);
        return {
          text,
          handler: 'draft_nft_transfer',
          params: full.data,
          rich: richCard,
        };
      }
      if (name === 'draft_token_swap') {
        const full = draftTokenSwapInputSchema.safeParse({
          ...rec,
          network: rec.network ?? BEAM_MAINNET_CAIP2,
          router: rec.router ?? BEAM_MAINNET_SWAP_ROUTER,
        });
        if (!full.success) continue;
        const richCard = txRichFromTokenSwapDraft(full.data);
        return {
          text,
          handler: 'draft_token_swap',
          params: full.data,
          rich: richCard,
        };
      }
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const name = tc.function?.name;
      if (
        name !== OFFER_X402_CHECKOUT_FORM ||
        !allowedHandlers.includes('create_x402_payment')
      ) {
        continue;
      }
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(tc.function.arguments?.trim() || '{}');
      } catch {
        continue;
      }
      if (!parsedArgs || typeof parsedArgs !== 'object') continue;
      const rec = parsedArgs as Record<string, unknown>;
      const parsed = offerX402CheckoutFormToolArgsSchema.safeParse(rec);
      if (!parsed.success) continue;
      const params = x402CheckoutFormCtaParamsSchema.parse({
        _checkoutForm: true as const,
        supportedAssets: parsed.data.supportedAssets,
        networks: parsed.data.networks,
        intro: parsed.data.intro,
        resourceUrl: parsed.data.resourceUrl,
      });
      const rich = {
        type: 'x402_checkout_form' as const,
        title: parsed.data.formTitle ?? 'Payment checkout',
        intro: parsed.data.intro,
        supportedAssets: parsed.data.supportedAssets,
        networks: parsed.data.networks,
        resourceUrl: parsed.data.resourceUrl,
      } as AgentRichCard;
      const text =
        content.trim() ||
        'Enter the USDC.e amount and recipient in the form below, then tap **Create payment link** to generate a shareable checkout URL.';
      return { text, handler: 'create_x402_payment', params, rich };
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const name = tc.function?.name;
      if (
        name !== OFFER_ON_RAMP_CHECKOUT_FORM ||
        !allowedHandlers.includes('on_ramp_tokens')
      ) {
        continue;
      }
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(tc.function.arguments?.trim() || '{}');
      } catch {
        continue;
      }
      if (!parsedArgs || typeof parsedArgs !== 'object') continue;
      const rec = parsedArgs as Record<string, unknown>;
      const parsed = offerOnRampCheckoutFormToolArgsSchema.safeParse(rec);
      if (!parsed.success) continue;
      const params = onRampFormCtaParamsSchema.parse({
        _onRampForm: true as const,
        supportedAssets: parsed.data.supportedAssets,
        networks: parsed.data.networks,
        intro: parsed.data.intro,
      });
      const rich = {
        type: 'on_ramp_checkout_form' as const,
        title: parsed.data.formTitle ?? 'Token on-ramp',
        intro: parsed.data.intro,
        supportedAssets: parsed.data.supportedAssets,
        networks: parsed.data.networks,
      } as AgentRichCard;
      const text =
        content.trim() ||
        'Pick a supported token and network, enter the amount to receive and the USD card charge, then tap **Create Stripe checkout** to pay with Stripe and receive tokens after settlement.';
      return { text, handler: 'on_ramp_tokens', params, rich };
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const name = tc.function?.name;
      if (
        name !== OFFER_CREDIT_CARD_CHECKOUT_FORM ||
        !allowedHandlers.includes('create_credit_card')
      ) {
        continue;
      }
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(tc.function.arguments?.trim() || '{}');
      } catch {
        continue;
      }
      if (!parsedArgs || typeof parsedArgs !== 'object') continue;
      const rec = parsedArgs as Record<string, unknown>;
      const parsed = offerCreditCardCheckoutFormToolArgsSchema.safeParse(rec);
      if (!parsed.success) continue;
      const params = creditCardFormCtaParamsSchema.parse({
        _creditCardForm: true as const,
        intro: parsed.data.intro,
        defaultCurrency: parsed.data.defaultCurrency,
      });
      const rich = {
        type: 'credit_card_checkout_form' as const,
        title: parsed.data.formTitle ?? 'Virtual payment card',
        intro: parsed.data.intro,
        defaultCurrency: parsed.data.defaultCurrency,
      } as unknown as AgentRichCard;
      const text =
        content.trim() ||
        'Enter your legal name and billing address in the form below, then tap **Create virtual card** to issue the card.';
      return { text, handler: 'create_credit_card', params, rich };
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const name = tc.function?.name;
      if (
        name !== OFFER_SWAP_CHECKOUT_FORM ||
        !allowedHandlers.includes('draft_token_swap')
      ) {
        continue;
      }
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(tc.function.arguments?.trim() || '{}');
      } catch {
        continue;
      }
      if (!parsedArgs || typeof parsedArgs !== 'object') continue;
      const rec = parsedArgs as Record<string, unknown>;
      const parsed = offerSwapCheckoutFormToolArgsSchema.safeParse(rec);
      if (!parsed.success) continue;
      const defaults = defaultBeamSwapFormPayload();
      const params = swapFormCtaParamsSchema.parse({
        _swapForm: true as const,
        supportedAssets: parsed.data.supportedAssets,
        networks: parsed.data.networks ?? defaults.networks,
        intro: parsed.data.intro,
        defaultPoolFee: parsed.data.defaultPoolFee ?? defaults.defaultPoolFee,
      });
      const rich = {
        type: 'swap_checkout_form' as const,
        title: parsed.data.formTitle ?? 'Token swap',
        intro: parsed.data.intro,
        supportedAssets: params.supportedAssets,
        networks: params.networks,
        defaultPoolFee: params.defaultPoolFee,
      } as unknown as AgentRichCard;
      const text =
        content.trim() ||
        'Pick the tokens and amount in the form below (0G mainnet only), then tap **Confirm swap draft**. Your wallet will approve the router if needed, then sign the swap.';
      return { text, handler: 'draft_token_swap', params, rich };
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const name = tc.function?.name;
      if (
        name !== OFFER_TRANSFER_CHECKOUT_FORM ||
        !allowedHandlers.includes('draft_erc20_transfer')
      ) {
        continue;
      }
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(tc.function.arguments?.trim() || '{}');
      } catch {
        continue;
      }
      if (!parsedArgs || typeof parsedArgs !== 'object') continue;
      const rec = parsedArgs as Record<string, unknown>;
      const parsed = offerTransferCheckoutFormToolArgsSchema.safeParse(rec);
      if (!parsed.success) continue;
      const defaults = defaultBeamTransferFormPayload();
      const params = transferFormCtaParamsSchema.parse({
        _transferForm: true as const,
        supportedAssets: parsed.data.supportedAssets,
        networks: parsed.data.networks ?? defaults.networks,
        intro: parsed.data.intro,
        defaultTo: parsed.data.defaultTo,
      });
      const rich = {
        type: 'transfer_checkout_form' as const,
        title: parsed.data.formTitle ?? 'Token transfer',
        intro: parsed.data.intro,
        supportedAssets: params.supportedAssets,
        networks: params.networks,
        defaultTo: params.defaultTo,
      } as AgentRichCard;
      const offerText =
        content.trim() ||
        'Pick the token, recipient, and amount in the form below (0G mainnet or testnet), then tap **Confirm transfer draft**. Your wallet will sign the ERC-20 transfer.';
      return { text: offerText, handler: 'draft_erc20_transfer', params, rich };
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const name = tc.function?.name;
      if (name !== 'suggest_marketplace_hire') continue;
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(tc.function.arguments?.trim() || '{}');
      } catch {
        continue;
      }
      if (!parsedArgs || typeof parsedArgs !== 'object') continue;
      const full = suggestMarketplaceHireInputSchema.safeParse(parsedArgs);
      if (!full.success) continue;
      const rich = marketplaceHireRichFromInput(full.data);
      const text =
        content.trim() ||
        `Hire **${rich.specialistName}** on the marketplace, set them as this chat’s active agent, then ask again.`;
      return {
        text,
        handler: 'suggest_marketplace_hire',
        params: full.data,
        rich,
      };
    }
  }
  return structuredReplyFromModelContent(content, allowedHandlers);
}

/**
 * System instructions when the model receives `tools` / `tool_choice` for
 * handler CTAs (see 0G Router chat completions tool calling).
 */
export function buildAgentToolCallingSystemPrompt(
  allowed: readonly HandlerActionId[],
): string {
  const toolNames = [
    ...(allowed.includes('generate_tax_report') ? ['generate_tax_report'] : []),
    ...(allowed.includes('create_x402_payment')
      ? ['create_x402_payment', 'offer_x402_checkout_form']
      : []),
    ...(allowed.includes('on_ramp_tokens')
      ? ['on_ramp_tokens', 'offer_on_ramp_checkout_form']
      : []),
    ...(allowed.includes('complete_stripe_kyc') ? ['complete_stripe_kyc'] : []),
    ...(allowed.includes('create_credit_card')
      ? ['create_credit_card', 'offer_credit_card_checkout_form']
      : []),
    ...(allowed.includes('generate_payment_invoice')
      ? ['generate_payment_invoice']
      : []),
    ...(allowed.includes('generate_financial_activity_report')
      ? ['generate_financial_activity_report']
      : []),
    ...(allowed.includes('draft_native_transfer') ? ['draft_native_transfer'] : []),
    ...(allowed.includes('draft_erc20_transfer')
      ? ['draft_erc20_transfer', 'offer_transfer_checkout_form']
      : []),
    ...(allowed.includes('draft_nft_transfer') ? ['draft_nft_transfer'] : []),
    ...(allowed.includes('draft_token_swap')
      ? ['draft_token_swap', 'offer_swap_checkout_form']
      : []),
    ...(allowed.includes('suggest_marketplace_hire')
      ? ['suggest_marketplace_hire']
      : []),
  ].join(', ');
  return [
    'You are Stardorm chat: a concise financial assistant.',
    STARDORM_AGENT_CAIP2_NETWORKS,
    beamKnownAssetsPromptBlock(),
    beamMarketplaceSpecialistsPromptBlock(),
    'Put the user-visible answer in the message content (plain language).',
    toolNames
      ? `When a one-tap server action is appropriate, call at most one function tool from this list: ${toolNames}.`
      : 'This agent has no callable tools — do not call tools.',
    'If no action button is needed, do not call tools.',
    'Tool arguments must match each tool JSON schema. For generate_tax_report you may add optional `reportCard` (tax-specific preview). For create_x402_payment you may add optional `paymentCard` (invoice-style preview). For on_ramp_tokens you may add optional `paymentCard` (invoice-style preview). For create_credit_card you may add optional `cardPreview` (title + supplemental rows for the chat card).',
    allowed.includes('create_x402_payment')
      ? [
          'For x402 checkout: if the user’s message(s) already state every required value — stable `id`, wei `amount` (integer string), `currency` (USDC.e only on 0G mainnet), `network` (`eip155:16661`), full `payTo` (0x…40) — call **create_x402_payment** with those exact arguments (optional `paymentCard` for an invoice-style preview).',
          'If any required value is missing, vague, or would be a guess, call **offer_x402_checkout_form** with USDC.e-only `supportedAssets` (and optional `resourceUrl`); never invent wei, payTo, or other tokens.',
          'When a handler CTA appears, remind the user to tap **Create payment link** to obtain the `/pay/...` checkout URL for their payer.',
        ].join(' ')
      : '',
    allowed.includes('on_ramp_tokens')
      ? [
          'For on-ramp: if the user already states `recipientWallet`, `network` (CAIP-2), `tokenAddress`, `tokenDecimals`, `tokenSymbol`, `tokenAmountWei` (base units string), `usdAmountCents`, and optional `usdValue`, call **on_ramp_tokens** with those exact arguments (optional `paymentCard`).',
          'If any required value is missing or ambiguous, call **offer_on_ramp_checkout_form** with `supportedAssets` (and optional `networks`); never invent addresses, wei amounts, or card charge amounts.',
          'After proposing on_ramp_tokens, remind the user to tap **Create Stripe checkout** to pay with Stripe.',
        ].join(' ')
      : '',
    allowed.includes('complete_stripe_kyc')
      ? 'For KYC: when the user asks to start, continue, or complete identity verification, you MUST call **complete_stripe_kyc** (params `{}` or optional `returnPath` only). Never answer with prose alone—always emit the tool so the chat shows **Start Identity verification**.'
      : '',
    allowed.includes('create_credit_card')
      ? [
          'For virtual payment cards: if the user message already states legal first/last name, street line 1, city, region/state, postal code, and ISO country, call **create_credit_card** with those exact arguments (optional `initialBalanceCents`, optional `cardPreview`).',
          'If any required billing field is missing or ambiguous, call **offer_credit_card_checkout_form** with optional `formTitle`, `intro`, and optional `defaultCurrency`; never invent names or addresses.',
          'After proposing create_credit_card or the billing form, remind the user to tap **Create virtual card** to mint the card.',
        ].join(' ')
      : '',
    allowed.includes('generate_tax_report')
      ? 'After proposing generate_tax_report, remind the user they must tap **Generate tax PDF** to run the server job and attach the PDF to the thread.'
      : '',
    allowed.includes('generate_payment_invoice')
      ? 'After proposing generate_payment_invoice, remind the user to tap **Download payment summary** to build the PDF from live Beam records.'
      : '',
    allowed.includes('generate_financial_activity_report')
      ? 'After proposing generate_financial_activity_report, remind the user to tap **Download activity report** to build the snapshot PDF.'
      : '',
    allowed.includes('draft_native_transfer')
      ? 'For native transfers: call **draft_native_transfer** only when the user message states `network` (CAIP-2), full `to` address, and `valueWei` as a positive integer wei string. Remind them to tap **Confirm transfer draft** — the server records the plan; they sign in Beam Send or their wallet.'
      : '',
    allowed.includes('draft_erc20_transfer')
      ? [
          'For ERC-20 transfers: USDC.e on 0G mainnet is `0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E` (6 decimals). Map “mainnet” → `eip155:16661`, “testnet” → `eip155:16602`. Never ask the user for the USDC.e contract if they said USDC.e / USDCE on 0G.',
          'If the user already states network (or mainnet/testnet), recipient `to`, amount (convert to `amountWei`), and token (symbol or address), call **draft_erc20_transfer** with those exact values.',
          'If anything is missing, call **offer_transfer_checkout_form** with `supportedAssets` (and optional `networks`, optional `defaultTo` when they gave a recipient only).',
          'After proposing a transfer draft, remind them to tap **Send token transfer** (or confirm the form first) — the chat card will show the transaction hash when the wallet broadcast completes.',
        ].join(' ')
      : '',
    allowed.includes('draft_nft_transfer')
      ? 'For NFT transfers: call **draft_nft_transfer** when the user states `network`, collection `contract`, `to`, `tokenId`, and `standard` (erc721 vs erc1155). For ERC-1155 include `amount`. Remind them to tap **Confirm transfer draft** then sign the safeTransferFrom (or equivalent) in their wallet.'
      : '',
    allowed.includes('draft_token_swap')
      ? [
          'For token swaps on 0G: only **mainnet** (`eip155:16661`). Never call swap tools with `eip155:16602` — testnet swap intents are blocked.',
          'If the user already states `tokenIn`, `tokenOut`, both decimals, and `amountInWei` (and optional min-out / pool fee), call **draft_token_swap** with `network` `eip155:16661`.',
          'If anything is missing, call **offer_swap_checkout_form** with `supportedAssets` from the deployment (USDC.e and wrapped native when listed); never invent contracts.',
          'After proposing a swap, remind them to tap **Approve & swap** — approve ERC-20 allowance on token-in when needed, then `exactInputSingle` on the Beam router.',
        ].join(' ')
      : '',
    marketplaceHireGuardPromptLine(allowed),
    'When the user asks for any capability you do not have tools for (see your allowed handler list), call **suggest_marketplace_hire** with the right specialistAgentKey instead of asking them to guess contract addresses or listing steps only in prose.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * When the active agent cannot run a handler but the user clearly asked for it,
 * attach a marketplace routing card so the client shows a rich summary (not only prose).
 */
export function enrichAgentReplyWithMarketplaceRouting(args: {
  userContent: string;
  allowedHandlers: readonly HandlerActionId[];
  reply: AgentComputeReplyWithParams;
}): AgentComputeReplyWithParams {
  return marketplaceHireWhenHandlerMissing(args);
}

/**
 * When the active agent can run a handler but the model replied with prose only,
 * attach the handler CTA so the client shows the one-tap button.
 */
function enrichAgentReplyWithHandlerCta(args: {
  userContent: string;
  allowedHandlers: readonly HandlerActionId[];
  reply: AgentComputeReplyWithParams;
}): AgentComputeReplyWithParams {
  const routed = rewriteMisroutedMarketplaceHire(args);
  const reply = enrichAgentReplyWithMarketplaceRouting({
    ...args,
    reply: routed,
  });
  if (reply.handler != null) return reply;
  return attachHandlerCtaFromUserIntent({ ...args, reply });
}

/** Post-process model output before persisting an agent chat bubble. */
export function enrichAgentReplyForChat(
  args: Parameters<typeof enrichAgentReplyWithMarketplaceRouting>[0],
): AgentComputeReplyWithParams {
  return enrichAgentReplyWithHandlerCta(args);
}
