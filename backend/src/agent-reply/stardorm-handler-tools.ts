import type { HandlerActionId } from '../handlers/handler.types';

/** OpenAI / 0G Router `tools[]` entry shape for chat completions. */
export type OpenAiChatTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const taxDatePartJsonSchema: Record<string, unknown> = {
  type: 'object',
  description: 'UTC calendar date part.',
  properties: {
    year: { type: 'integer', minimum: 2020, maximum: 2030 },
    month: { type: 'integer', minimum: 1, maximum: 12 },
    day: { type: 'integer', minimum: 1, maximum: 31 },
  },
  required: ['year', 'month', 'day'],
};

/** Tax-report tool only: optional preview card (not sent to the tax handler). */
const taxReportCardJsonSchema: Record<string, unknown> = {
  type: 'object',
  description:
    'Optional UI card for this tax action: title override and extra rows (country/period rows are filled server-side from from/to/countryCode).',
  properties: {
    cardTitle: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
      description: 'Override card title (default: Tax report (CC)).',
    },
    supplementalRows: {
      type: 'array',
      maxItems: 6,
      description:
        'Extra rows specific to this filing (e.g. entity, form series).',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 80 },
          value: { type: 'string', minLength: 1, maxLength: 400 },
        },
        required: ['label', 'value'],
      },
    },
  },
};

const generateTaxReportTool: OpenAiChatTool = {
  type: 'function',
  function: {
    name: 'generate_tax_report',
    description:
      'Offer the user a one-tap server action to generate a tax report for the given period and country. Call only when the user clearly wants this.',
    parameters: {
      type: 'object',
      properties: {
        from: {
          ...taxDatePartJsonSchema,
          description: 'Range start (UTC calendar date).',
        },
        to: {
          ...taxDatePartJsonSchema,
          description: 'Range end (UTC calendar date).',
        },
        countryCode: {
          type: 'string',
          minLength: 2,
          maxLength: 2,
          description: 'ISO 3166-1 alpha-2 (e.g. US).',
        },
        reportCard: taxReportCardJsonSchema,
      },
      required: ['from', 'to', 'countryCode'],
    },
  },
};

const x402SupportedAssetJsonSchema: Record<string, unknown> = {
  type: 'object',
  description: 'One payable asset the user can pick in the checkout form.',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 64 },
    symbol: { type: 'string', minLength: 1, maxLength: 32 },
    icon: {
      type: 'string',
      minLength: 1,
      maxLength: 512,
      description: 'Icon URL or app path (e.g. /images/0g.png).',
    },
    decimals: { type: 'integer', minimum: 0, maximum: 36 },
    address: {
      type: 'string',
      minLength: 1,
      maxLength: 66,
      description: 'ERC-20 contract 0x…40 or chain-specific token id.',
    },
    usdValue: {
      type: 'number',
      minimum: 0,
      description: 'Optional spot hint for UI only.',
    },
  },
  required: ['name', 'symbol', 'icon', 'decimals', 'address'],
};

const x402PaymentCardJsonSchema: Record<string, unknown> = {
  type: 'object',
  description:
    'Optional invoice-style preview (not sent as handler execution fields).',
  properties: {
    invoiceTitle: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
      description: 'Invoice / card title (defaults to payment title or id).',
    },
    lineItems: {
      type: 'array',
      maxItems: 8,
      description: 'Extra invoice lines (memo, service line, etc.).',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 80 },
          value: { type: 'string', minLength: 1, maxLength: 400 },
        },
        required: ['label', 'value'],
      },
    },
  },
};

const createX402PaymentTool: OpenAiChatTool = {
  type: 'function',
  function: {
    name: 'create_x402_payment',
    description:
      'Create the x402 payment request immediately when the USER already stated every required value in their message(s): a stable `id`/slug, `amount` as wei (positive integer string, no decimals), `currency` (0x token contract or symbol), `network`, and full `payTo` (0x + 40 hex). If any of these would be inferred or guessed, do NOT call this tool—use offer_x402_checkout_form instead.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 256 },
        amount: {
          type: 'string',
          description:
            'Amount in base units (positive integer string, no decimals).',
          pattern: '^[1-9]\\d*$',
        },
        currency: {
          type: 'string',
          minLength: 1,
          maxLength: 66,
          description: 'Token symbol or 0x-prefixed token contract address.',
        },
        network: { type: 'string', minLength: 1, maxLength: 64 },
        payTo: {
          type: 'string',
          minLength: 1,
          description: '0x-prefixed 20-byte recipient address.',
          pattern: '^0x[a-fA-F0-9]{40}$',
        },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', minLength: 1, maxLength: 2000 },
        resourceUrl: { type: 'string', maxLength: 2048 },
        expiresAt: { type: 'string', description: 'ISO 8601 datetime.' },
        decimals: { type: 'integer', minimum: 0, maximum: 36 },
        paymentCard: x402PaymentCardJsonSchema,
      },
      required: ['id', 'amount', 'currency', 'network', 'payTo'],
    },
  },
};

const offerX402CheckoutFormTool: OpenAiChatTool = {
  type: 'function',
  function: {
    name: 'offer_x402_checkout_form',
    description:
      'Show the checkout form when the user wants a shareable /pay link but their message does NOT already spell out every required field (wei `amount`, `payTo` 0x…40, `currency`/token, `network`, and a stable `id`). Pass only `supportedAssets` (and optional `networks`); the user fills missing fields in the UI. Never invent wei, payTo, or token addresses.',
    parameters: {
      type: 'object',
      properties: {
        formTitle: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description: 'Card title shown above the form.',
        },
        intro: {
          type: 'string',
          maxLength: 2000,
          description: 'Short instructions shown under the title.',
        },
        supportedAssets: {
          type: 'array',
          minItems: 1,
          maxItems: 24,
          items: x402SupportedAssetJsonSchema,
        },
        networks: {
          type: 'array',
          maxItems: 16,
          description: 'CAIP-2 or app network ids with labels (e.g. eip155:16602).',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1, maxLength: 64 },
              label: { type: 'string', minLength: 1, maxLength: 120 },
            },
            required: ['id', 'label'],
          },
        },
      },
      required: ['supportedAssets'],
    },
  },
};

const createOnRampTokensTool: OpenAiChatTool = {
  type: 'function',
  function: {
    name: 'on_ramp_tokens',
    description:
      'Create a Stripe Checkout session when the USER already stated every required on-ramp field: `recipientWallet` (0x…40), `network` (CAIP-2), `tokenAddress`, `tokenDecimals`, `tokenSymbol`, `tokenAmountWei` (positive integer string base units), `usdAmountCents` (integer cents, min 100), and optional `usdValue`. If anything would be guessed, use offer_on_ramp_checkout_form instead.',
    parameters: {
      type: 'object',
      properties: {
        recipientWallet: {
          type: 'string',
          minLength: 1,
          pattern: '^0x[a-fA-F0-9]{40}$',
        },
        network: { type: 'string', minLength: 1, maxLength: 64 },
        tokenAddress: {
          type: 'string',
          minLength: 1,
          pattern: '^0x[a-fA-F0-9]{40}$',
        },
        tokenDecimals: { type: 'integer', minimum: 0, maximum: 36 },
        tokenSymbol: { type: 'string', minLength: 1, maxLength: 32 },
        tokenAmountWei: {
          type: 'string',
          pattern: '^[1-9]\\d*$',
          description: 'Token amount in base units (integer string).',
        },
        usdValue: {
          type: 'number',
          minimum: 0,
          description: 'Optional spot reference for UI / analytics.',
        },
        usdAmountCents: {
          type: 'integer',
          minimum: 100,
          maximum: 10000000,
          description: 'Total USD charged on the card, in cents (min $1.00).',
        },
        paymentCard: x402PaymentCardJsonSchema,
      },
      required: [
        'recipientWallet',
        'network',
        'tokenAddress',
        'tokenDecimals',
        'tokenSymbol',
        'tokenAmountWei',
        'usdAmountCents',
      ],
    },
  },
};

const offerOnRampCheckoutFormTool: OpenAiChatTool = {
  type: 'function',
  function: {
    name: 'offer_on_ramp_checkout_form',
    description:
      'Show the on-ramp form when the user wants card checkout but their message does NOT spell out every required field (recipient, network, token contract, decimals, symbol, wei amount, USD cents). Pass `supportedAssets` (and optional `networks`); the user fills the rest. Never invent addresses or amounts.',
    parameters: offerX402CheckoutFormTool.function.parameters,
  },
};

const completeStripeKycTool: OpenAiChatTool = {
  type: 'function',
  function: {
    name: 'complete_stripe_kyc',
    description:
      'Offer Stripe Identity verification for the signed-in user. Call when the user clearly wants to complete KYC. Optional `returnPath` is an app path for Stripe return_url.',
    parameters: {
      type: 'object',
      properties: {
        returnPath: {
          type: 'string',
          minLength: 1,
          maxLength: 512,
          description: 'App path only, e.g. /chat',
        },
      },
    },
  },
};

const creditCardToolPreviewJsonSchema: Record<string, unknown> = {
  type: 'object',
  description:
    'Optional UI card for this issuance (not persisted as separate fields beyond tool args).',
  properties: {
    cardTitle: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
      description: 'Override the preview title.',
    },
    supplementalRows: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 80 },
          value: { type: 'string', minLength: 1, maxLength: 400 },
        },
        required: ['label', 'value'],
      },
    },
  },
};

const createCreditCardTool: OpenAiChatTool = {
  type: 'function',
  function: {
    name: 'create_credit_card',
    description:
      'Issue a virtual payment card for this wallet when the user has explicitly confirmed legal first and last name, full billing street address, city, region/state, postal code, ISO country (2 letters), and optional opening balance in cents. Never invent personal data. Optional `cardPreview` adds invoice-style rows for the chat card.',
    parameters: {
      type: 'object',
      properties: {
        firstName: { type: 'string', minLength: 1, maxLength: 80 },
        lastName: { type: 'string', minLength: 1, maxLength: 80 },
        line1: { type: 'string', minLength: 1, maxLength: 120 },
        line2: { type: 'string', minLength: 1, maxLength: 120 },
        city: { type: 'string', minLength: 1, maxLength: 80 },
        region: { type: 'string', minLength: 1, maxLength: 80 },
        postalCode: { type: 'string', minLength: 1, maxLength: 20 },
        countryCode: {
          type: 'string',
          minLength: 2,
          maxLength: 2,
          description: 'ISO 3166-1 alpha-2 (e.g. US).',
        },
        cardLabel: { type: 'string', minLength: 1, maxLength: 80 },
        currency: {
          type: 'string',
          minLength: 3,
          maxLength: 3,
          description: 'ISO 4217 alphabetic code (default USD if omitted).',
        },
        initialBalanceCents: {
          type: 'integer',
          minimum: 0,
          maximum: 100000000,
          description: 'Optional opening balance in minor units (e.g. USD cents).',
        },
        cardPreview: creditCardToolPreviewJsonSchema,
      },
      required: [
        'firstName',
        'lastName',
        'line1',
        'city',
        'region',
        'postalCode',
        'countryCode',
      ],
    },
  },
};

export function buildOpenAiHandlerTools(
  allowed: readonly HandlerActionId[],
): OpenAiChatTool[] {
  const out: OpenAiChatTool[] = [];
  if (allowed.includes('generate_tax_report')) {
    out.push(generateTaxReportTool);
  }
  if (allowed.includes('create_x402_payment')) {
    out.push(createX402PaymentTool);
    out.push(offerX402CheckoutFormTool);
  }
  if (allowed.includes('on_ramp_tokens')) {
    out.push(createOnRampTokensTool);
    out.push(offerOnRampCheckoutFormTool);
  }
  if (allowed.includes('complete_stripe_kyc')) {
    out.push(completeStripeKycTool);
  }
  if (allowed.includes('create_credit_card')) {
    out.push(createCreditCardTool);
  }
  return out;
}
