import type { SuggestMarketplaceHireInput } from '@beam/stardorm-api-contract';
import type { StardormChatRichBlock } from '@beam/stardorm-api-contract';
import { resolveStardormChainAgentId } from '@beam/stardorm-api-contract';

type SpecialistMeta = {
  name: string;
  category: SuggestMarketplaceHireInput['category'];
  capability: string;
};

/** Defaults when the model only passes `specialistAgentKey`. */
export const BEAM_MARKETPLACE_SPECIALIST_DEFAULTS: Record<string, SpecialistMeta> = {
  passport: {
    name: 'Passport',
    category: 'Compliance',
    capability: 'Stripe Identity verification (`complete_stripe_kyc`)',
  },
  ledger: {
    name: 'Ledger',
    category: 'Payments',
    capability: 'x402 payment links, checkout pages, and wallet payment summaries',
  },
  ramp: {
    name: 'Ramp',
    category: 'Payments',
    capability: 'Card on-ramp to receive tokens on 0G (`on_ramp_tokens`)',
  },
  fiscus: {
    name: 'Fiscus',
    category: 'Taxes',
    capability: 'Tax reports and filing PDFs (`generate_tax_report`)',
  },
  capita: {
    name: 'Capita',
    category: 'Payments',
    capability: 'Virtual payment cards and billing profiles (`create_credit_card`)',
  },
  scribe: {
    name: 'Scribe',
    category: 'Reports',
    capability: 'Financial activity snapshots (`generate_financial_activity_report`)',
  },
  audita: {
    name: 'Audita',
    category: 'Reports',
    capability: 'Activity and treasury-style reports',
  },
  settler: {
    name: 'Settler',
    category: 'Payments',
    capability: 'Settlements and payment operations',
  },
  courier: {
    name: 'Courier',
    category: 'Payments',
    capability: 'Native, ERC-20, and NFT transfer drafts',
  },
};

export function agentProfilePathForKey(agentKey: string): string | undefined {
  const trimmed = agentKey.trim();
  const chainId = resolveStardormChainAgentId(trimmed);
  if (chainId != null && chainId > 1) {
    return `/agents/chain-${chainId}`;
  }
  if (/^chain-\d+$/i.test(trimmed)) {
    return `/agents/${trimmed.toLowerCase()}`;
  }
  if (trimmed && trimmed !== 'beam-default') {
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

  return {
    type: 'marketplace_hire',
    title,
    intro: input.intro,
    specialistName,
    specialistAgentKey: key,
    ...(category ? { category } : {}),
    ...(capability ? { capability } : {}),
    ...(input.userTask?.trim() ? { userTask: input.userTask.trim() } : {}),
    marketplacePath: '/marketplace',
    ...(profilePath ? { agentProfilePath: profilePath } : {}),
    ...(input.requiredHandler ? { requiredHandler: input.requiredHandler } : {}),
  };
}
