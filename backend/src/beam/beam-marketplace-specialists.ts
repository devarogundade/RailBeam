import type { SuggestMarketplaceHireInput } from '@beam/stardorm-api-contract';
import type { StardormChatRichBlock } from '@beam/stardorm-api-contract';
import {
  resolveStardormAgentKey,
  resolveStardormChainAgentId,
} from '@beam/stardorm-api-contract';
import type { HandlerActionId } from '../handlers/handler.types';
import { isHandlerActionId } from '../handlers/handler.types';

type SpecialistMeta = {
  name: string;
  category: SuggestMarketplaceHireInput['category'];
  capability: string;
  /** Primary server handler this specialist unlocks (used for hire routing). */
  primaryHandler: HandlerActionId;
};

/** Defaults when the model only passes `specialistAgentKey`. */
export const BEAM_MARKETPLACE_SPECIALIST_DEFAULTS: Record<string, SpecialistMeta> =
  {
    passport: {
      name: 'Passport',
      category: 'Compliance',
      capability: 'Stripe Identity verification (`complete_stripe_kyc`)',
      primaryHandler: 'complete_stripe_kyc',
    },
    ledger: {
      name: 'Ledger',
      category: 'Payments',
      capability:
        'x402 payment links, checkout pages, and wallet payment summaries (`create_x402_payment`, `generate_payment_invoice`)',
      primaryHandler: 'create_x402_payment',
    },
    ramp: {
      name: 'Ramp',
      category: 'Payments',
      capability: 'Card on-ramp to receive tokens on 0G (`on_ramp_tokens`)',
      primaryHandler: 'on_ramp_tokens',
    },
    fiscus: {
      name: 'Fiscus',
      category: 'Taxes',
      capability: 'Tax reports and filing PDFs (`generate_tax_report`)',
      primaryHandler: 'generate_tax_report',
    },
    capita: {
      name: 'Capita',
      category: 'Payments',
      capability:
        'Virtual payment cards and billing profiles (`create_credit_card`)',
      primaryHandler: 'create_credit_card',
    },
    scribe: {
      name: 'Scribe',
      category: 'Reports',
      capability:
        'Financial activity snapshots (`generate_financial_activity_report`)',
      primaryHandler: 'generate_financial_activity_report',
    },
    audita: {
      name: 'Audita',
      category: 'Reports',
      capability:
        'Activity and treasury-style reports (`generate_financial_activity_report`)',
      primaryHandler: 'generate_financial_activity_report',
    },
    settler: {
      name: 'Settler',
      category: 'Payments',
      capability:
        'Settlements and payment operations (`generate_payment_invoice`)',
      primaryHandler: 'generate_payment_invoice',
    },
    courier: {
      name: 'Courier',
      category: 'Payments',
      capability:
        'Native, ERC-20, and NFT transfer drafts (`draft_native_transfer`, `draft_erc20_transfer`, `draft_nft_transfer`)',
      primaryHandler: 'draft_erc20_transfer',
    },
  };

/** Extract `handler_id` from capability copy like ``(`create_credit_card`)``. */
export function parseHandlerIdFromCapabilityText(
  capability: string,
): HandlerActionId | undefined {
  const m = /\(`([a-z_]+)`\)/.exec(capability);
  if (!m || !isHandlerActionId(m[1])) return undefined;
  return m[1];
}

export function primaryHandlerForSpecialistKey(
  specialistAgentKey: string,
): HandlerActionId | undefined {
  const key = specialistAgentKey.trim().toLowerCase();
  const row = BEAM_MARKETPLACE_SPECIALIST_DEFAULTS[key];
  if (row?.primaryHandler) return row.primaryHandler;
  if (row?.capability) {
    return parseHandlerIdFromCapabilityText(row.capability);
  }
  return undefined;
}

/** First marketplace specialist row that lists `handler` as its primary capability. */
export function specialistAgentKeyForHandler(
  handler: HandlerActionId,
): string | undefined {
  for (const [key, meta] of Object.entries(BEAM_MARKETPLACE_SPECIALIST_DEFAULTS)) {
    if (meta.primaryHandler === handler) return key;
    const parsed = parseHandlerIdFromCapabilityText(meta.capability);
    if (parsed === handler) return key;
  }
  return undefined;
}

export function agentProfilePathForKey(agentKey: string): string | undefined {
  const trimmed = agentKey.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'beam-default') return undefined;

  const chainId = resolveStardormChainAgentId(trimmed);
  if (chainId != null && chainId > 1) {
    const catalogSlug = resolveStardormAgentKey(chainId);
    if (catalogSlug && !catalogSlug.startsWith('chain-')) {
      /** `/agents/{agentKey}` matches EIP-8004 `agentKey` in the registration URI (stable across deployments). */
      return `/agents/${catalogSlug}`;
    }
    return `/agents/chain-${chainId}`;
  }

  if (/^chain-\d+$/i.test(trimmed)) {
    return `/agents/${lower}`;
  }
  if (trimmed) {
    return `/agents/${trimmed}`;
  }
  return undefined;
}

export function marketplaceHireRichFromInput(
  input: SuggestMarketplaceHireInput,
): Extract<StardormChatRichBlock, { type: 'marketplace_hire' }> {
  const key = input.specialistAgentKey.trim().toLowerCase();
  const defaults = BEAM_MARKETPLACE_SPECIALIST_DEFAULTS[key];
  const specialistName = input.specialistName?.trim() || defaults?.name || key;
  const category = input.category ?? defaults?.category;
  const capability = input.capability?.trim() || defaults?.capability;
  const profilePath = agentProfilePathForKey(key);
  const task = input.userTask?.trim();
  const title = task
    ? `Hire ${specialistName} — ${task.slice(0, 80)}`
    : `Hire ${specialistName} from the marketplace`;

  const requiredHandler =
    input.requiredHandler?.trim() ||
    defaults?.primaryHandler ||
    (capability ? parseHandlerIdFromCapabilityText(capability) : undefined);

  return {
    type: 'marketplace_hire',
    title,
    ...(input.intro?.trim() ? { intro: input.intro.trim() } : {}),
    specialistName,
    specialistAgentKey: key,
    ...(category ? { category } : {}),
    ...(capability ? { capability } : {}),
    ...(input.userTask?.trim() ? { userTask: input.userTask.trim() } : {}),
    marketplacePath: '/marketplace',
    ...(profilePath ? { agentProfilePath: profilePath } : {}),
    ...(requiredHandler ? { requiredHandler } : {}),
  };
}
