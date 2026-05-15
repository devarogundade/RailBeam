import type { SuggestMarketplaceHireInput } from '@beam/stardorm-api-contract';
import type { StardormChatRichBlock } from '@beam/stardorm-api-contract';
import { suggestMarketplaceHireInputSchema } from '@beam/stardorm-api-contract';
import {
  creditCardFormCtaParamsSchema,
  onRampFormCtaParamsSchema,
  swapFormCtaParamsSchema,
  transferFormCtaParamsSchema,
  x402CheckoutFormCtaParamsSchema,
} from '../handlers/handler-inputs.schema';
import {
  HANDLER_ACTION_IDS,
  type HandlerActionId,
  isHandlerActionId,
} from '../handlers/handler.types';
import { defaultBeamSwapFormPayload } from '../beam/beam-swap.config';
import { defaultBeamTransferFormPayload } from '../beam/beam-transfer.config';
import {
  BEAM_MARKETPLACE_SPECIALIST_DEFAULTS,
  marketplaceHireRichFromInput,
  primaryHandlerForSpecialistKey,
  specialistAgentKeyForHandler,
} from '../beam/beam-marketplace-specialists';
import type { AgentComputeReplyWithParams } from './stardorm-agent-reply.schema';

type AgentRichCard = StardormChatRichBlock;

/** User-visible CTA line appended when we attach a handler button or form. */
const HANDLER_CTA_LINES: Partial<Record<HandlerActionId, string>> = {
  complete_stripe_kyc:
    'Tap **Start Identity verification** below to open Stripe Identity and upload your documents.',
  create_credit_card:
    'Enter your legal name and billing address in the form below, then tap **Create virtual card** to issue the card.',
  create_x402_payment:
    'Pick the token, amount, and payee in the form below, then tap **Create payment link**.',
  on_ramp_tokens:
    'Pick a supported token and network, enter amounts, then tap **Create Stripe checkout**.',
  generate_tax_report:
    'Confirm the tax period below, then tap **Generate tax PDF** to build your report.',
  generate_payment_invoice:
    'Tap **Download payment summary** below to generate a PDF from your Beam records.',
  generate_financial_activity_report:
    'Tap **Download activity report** below to build the snapshot PDF.',
  draft_native_transfer:
    'Confirm the network, recipient, and amount, then tap **Confirm transfer draft** and sign in your wallet.',
  draft_erc20_transfer:
    'Pick the token, recipient, and amount in the form below, then tap **Confirm transfer draft**.',
  draft_nft_transfer:
    'Provide collection, token id, and recipient, then tap **Confirm transfer draft** and sign in your wallet.',
  draft_token_swap:
    'Pick tokens and amounts in the swap form below (0G mainnet only), then tap **Confirm swap draft**.',
};

/** Match user text to a handler when the model returned prose only. */
const HANDLER_USER_INTENT_RULES: Array<{
  handler: HandlerActionId;
  test: RegExp;
}> = [
  {
    handler: 'complete_stripe_kyc',
    test: /\b(?:kyc|stripe\s+identity|identity\s+verification|verify\s+(?:my\s+)?(?:identity|account)|document\s+verification|start(?:\s+the)?\s+(?:stripe\s+)?identity(?:\s+verification)?)\b/i,
  },
  {
    handler: 'create_credit_card',
    test: /\b(?:virtual\s+(?:payment\s+)?card|company\s+card|billing\s+(?:address|profile)|payment\s+card)\b/i,
  },
  {
    handler: 'create_x402_payment',
    test: /\b(?:x402|payment\s+link|checkout\s+link|pay\s+link|invoice\s+link|on-?chain\s+payment)\b/i,
  },
  {
    handler: 'on_ramp_tokens',
    test: /\b(?:on-?ramp|buy\s+crypto|card\s+to\s+crypto|stripe\s+checkout.*token|pay\s+with\s+card.*token)\b/i,
  },
  {
    handler: 'generate_tax_report',
    test: /\b(?:tax\s+report|crypto\s+tax|filing\s+summary|tax\s+pdf|tax\s+export)\b/i,
  },
  {
    handler: 'generate_payment_invoice',
    test: /\b(?:payment\s+summary|payment\s+invoice|checkout\s+summary|invoice\s+pdf)\b/i,
  },
  {
    handler: 'generate_financial_activity_report',
    test: /\b(?:activity\s+report|activity\s+snapshot|treasury\s+report|financial\s+activity)\b/i,
  },
  {
    handler: 'draft_token_swap',
    test: /\b(?:swap\s+token|token\s+swap|uniswap|exchange\s+token)\b/i,
  },
  {
    handler: 'draft_erc20_transfer',
    test: /\b(?:send\s+token|transfer\s+usdc|erc-?20\s+transfer|token\s+transfer)\b/i,
  },
  {
    handler: 'draft_native_transfer',
    test: /\b(?:send\s+(?:eth|og|native|gas)|native\s+transfer|transfer\s+(?:eth|og))\b/i,
  },
  {
    handler: 'draft_nft_transfer',
    test: /\b(?:send\s+nft|transfer\s+nft|nft\s+transfer)\b/i,
  },
];

function handlerCtaLine(handler: HandlerActionId): string {
  return (
    HANDLER_CTA_LINES[handler] ??
    'Use the action below to continue — your wallet already has this capability.'
  );
}

export function appendHandlerCtaToText(
  text: string,
  handler: HandlerActionId,
): string {
  const cta = handlerCtaLine(handler);
  return text.trim() ? `${text.trim()}\n\n${cta}` : cta;
}

function defaultTaxPeriodParams(): {
  from: { year: number; month: number; day: number };
  to: { year: number; month: number; day: number };
  countryCode: string;
} {
  const now = new Date();
  return {
    from: { year: now.getUTCFullYear(), month: 1, day: 1 },
    to: {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
    },
    countryCode: 'US',
  };
}

/**
 * Build a handler CTA (and optional rich form) when the wallet already has the tool
 * via hire, subscription, or owned clone.
 */
export function buildHandlerWorkspaceOffer(
  handler: HandlerActionId,
  opts: { text: string; intro?: string },
): AgentComputeReplyWithParams | null {
  const text = appendHandlerCtaToText(opts.text, handler);
  const intro = opts.intro;

  switch (handler) {
    case 'complete_stripe_kyc':
      return { text, handler, params: {} };
    case 'create_credit_card': {
      const params = creditCardFormCtaParamsSchema.parse({
        _creditCardForm: true as const,
        ...(intro ? { intro } : {}),
      });
      const rich = {
        type: 'credit_card_checkout_form' as const,
        title: 'Virtual payment card',
        intro,
      } as unknown as AgentRichCard;
      return { text, handler, params, rich };
    }
    case 'create_x402_payment': {
      const defaults = defaultBeamTransferFormPayload();
      const params = x402CheckoutFormCtaParamsSchema.parse({
        _checkoutForm: true as const,
        supportedAssets: defaults.supportedAssets,
        networks: defaults.networks,
        ...(intro ? { intro } : {}),
      });
      const rich = {
        type: 'x402_checkout_form' as const,
        title: 'Payment checkout',
        intro,
        supportedAssets: params.supportedAssets,
        networks: params.networks,
      } as AgentRichCard;
      return { text, handler, params, rich };
    }
    case 'on_ramp_tokens': {
      const defaults = defaultBeamTransferFormPayload();
      const params = onRampFormCtaParamsSchema.parse({
        _onRampForm: true as const,
        supportedAssets: defaults.supportedAssets,
        networks: defaults.networks,
        ...(intro ? { intro } : {}),
      });
      const rich = {
        type: 'on_ramp_checkout_form' as const,
        title: 'Token on-ramp',
        intro,
        supportedAssets: params.supportedAssets,
        networks: params.networks,
      } as AgentRichCard;
      return { text, handler, params, rich };
    }
    case 'generate_tax_report':
      return {
        text,
        handler,
        params: defaultTaxPeriodParams(),
      };
    case 'generate_payment_invoice':
    case 'generate_financial_activity_report':
      return { text, handler, params: {} };
    case 'draft_erc20_transfer': {
      const defaults = defaultBeamTransferFormPayload();
      const params = transferFormCtaParamsSchema.parse({
        _transferForm: true as const,
        supportedAssets: defaults.supportedAssets,
        networks: defaults.networks,
        ...(intro ? { intro } : {}),
      });
      const rich = {
        type: 'transfer_checkout_form' as const,
        title: 'Token transfer',
        intro,
        supportedAssets: params.supportedAssets,
        networks: params.networks,
      } as AgentRichCard;
      return { text, handler, params, rich };
    }
    case 'draft_token_swap': {
      const defaults = defaultBeamSwapFormPayload();
      const params = swapFormCtaParamsSchema.parse({
        _swapForm: true as const,
        supportedAssets: defaults.supportedAssets,
        networks: defaults.networks,
        defaultPoolFee: defaults.defaultPoolFee,
        ...(intro ? { intro } : {}),
      });
      const rich = {
        type: 'swap_checkout_form' as const,
        title: 'Token swap',
        intro,
        supportedAssets: params.supportedAssets,
        networks: params.networks,
      } as AgentRichCard;
      return { text, handler, params, rich };
    }
    case 'draft_native_transfer':
    case 'draft_nft_transfer':
      return null;
    case 'suggest_marketplace_hire':
      return null;
    default:
      return null;
  }
}

export function primaryHandlerForMarketplaceHire(
  params: SuggestMarketplaceHireInput,
): HandlerActionId | undefined {
  const required = params.requiredHandler?.trim();
  if (required && isHandlerActionId(required)) return required;
  return primaryHandlerForSpecialistKey(params.specialistAgentKey);
}

/** Model returned `suggest_marketplace_hire` but the wallet already has the target handler. */
export function rewriteMisroutedMarketplaceHire(args: {
  allowedHandlers: readonly HandlerActionId[];
  reply: AgentComputeReplyWithParams;
}): AgentComputeReplyWithParams {
  const { allowedHandlers, reply } = args;
  if (reply.handler !== 'suggest_marketplace_hire') return reply;
  const parsed = suggestMarketplaceHireInputSchema.safeParse(reply.params);
  if (!parsed.success) return reply;
  const primary = primaryHandlerForMarketplaceHire(parsed.data);
  if (!primary || !allowedHandlers.includes(primary)) return reply;
  const offered = buildHandlerWorkspaceOffer(primary, {
    text: reply.text,
    intro: parsed.data.intro,
  });
  return offered ?? reply;
}

/** User asked for a capability the active agent lacks — route to marketplace hire. */
export function marketplaceHireWhenHandlerMissing(args: {
  userContent: string;
  allowedHandlers: readonly HandlerActionId[];
  reply: AgentComputeReplyWithParams;
}): AgentComputeReplyWithParams {
  const { userContent, allowedHandlers, reply } = args;
  if (reply.handler != null || reply.rich != null) return reply;
  const u = userContent.trim();
  if (!u) return reply;

  for (const rule of HANDLER_USER_INTENT_RULES) {
    if (allowedHandlers.includes(rule.handler)) continue;
    if (!rule.test.test(u)) continue;
    const specialistKey = specialistAgentKeyForHandler(rule.handler);
    if (!specialistKey) continue;
    const meta = BEAM_MARKETPLACE_SPECIALIST_DEFAULTS[specialistKey];
    const rich = marketplaceHireRichFromInput({
      specialistAgentKey: specialistKey,
      userTask: u.slice(0, 120),
      capability: meta?.capability,
      requiredHandler: rule.handler,
    });
    const canned = `Open the marketplace, hire **${meta?.name ?? specialistKey}**, set them as this chat’s active agent, then ask again—you will get the one-tap action for this task.`;
    const text =
      looksLikeToolDenialAssistantText(reply.text) || !reply.text.trim()
        ? canned
        : reply.text;
    return {
      text,
      handler: 'suggest_marketplace_hire',
      params: {
        specialistAgentKey: specialistKey,
        userTask: u.slice(0, 120),
        capability: meta?.capability,
        requiredHandler: rule.handler,
      },
      rich,
    };
  }

  return reply;
}

/** Prose-only model reply while the wallet already has a matching handler tool. */
export function attachHandlerCtaFromUserIntent(args: {
  userContent: string;
  allowedHandlers: readonly HandlerActionId[];
  reply: AgentComputeReplyWithParams;
}): AgentComputeReplyWithParams {
  const { userContent, allowedHandlers, reply } = args;
  if (reply.handler != null) return reply;
  const u = userContent.trim();
  if (!u) return reply;

  for (const rule of HANDLER_USER_INTENT_RULES) {
    if (!allowedHandlers.includes(rule.handler)) continue;
    if (!rule.test.test(u)) continue;
    const offered = buildHandlerWorkspaceOffer(rule.handler, { text: reply.text });
    if (offered) return offered;
  }

  return reply;
}

export function marketplaceHireGuardPromptLine(
  allowed: readonly HandlerActionId[],
): string {
  const actionable = allowed.filter((h) => h !== 'suggest_marketplace_hire');
  if (actionable.length === 0) return '';
  return [
    `Never call **suggest_marketplace_hire** when the user’s task matches a handler you already have (${actionable.join(', ')}).`,
    'Call that handler directly, or its checkout-form tool when required fields are missing.',
    'Marketplace hire is only for capabilities outside your allowed handler list.',
  ].join(' ');
}

function looksLikeToolDenialAssistantText(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\bno tool\b/.test(t) ||
    /\bnot have (?:a )?tool\b/.test(t) ||
    /\bdon't have (?:a )?tool\b/.test(t) ||
    /\bdo not have (?:a )?tool\b/.test(t) ||
    /\bno tools?\b.*\bavailab/.test(t) ||
    /\bunable to initiate\b/.test(t)
  );
}

/** All handlers that can be offered in workspace (excludes marketplace routing itself). */
export const WORKSPACE_OFFERABLE_HANDLERS = HANDLER_ACTION_IDS.filter(
  (h) => h !== 'suggest_marketplace_hire',
);
