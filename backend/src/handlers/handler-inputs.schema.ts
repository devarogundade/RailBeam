import { z } from 'zod';
import { isBeamUsdcEAsset } from '../beam/beam-usdc-e.config';
import {
  x402SupportedAssetSchema,
  onRampTokensInputSchema,
  onRampFormCtaParamsSchema,
  isOnRampFormCtaParams,
  createCreditCardInputSchema,
  isIso3166Alpha2,
  stardormChatAttachmentSchema,
  type StardormChatAttachment,
} from '@beam/stardorm-api-contract';

export { onRampFormCtaParamsSchema, isOnRampFormCtaParams };

/** Mirrors `@beam/stardorm-api-contract` `creditCardFormCtaParamsSchema` (backend avoids stale nested installs). */
export const creditCardFormCtaParamsSchema = z.object({
  _creditCardForm: z.literal(true),
  intro: z.string().max(2000).optional(),
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((c) => c.toUpperCase())
    .optional(),
});

export type CreditCardFormCtaParams = z.infer<typeof creditCardFormCtaParamsSchema>;

export function isCreditCardFormCtaParams(v: unknown): v is CreditCardFormCtaParams {
  return creditCardFormCtaParamsSchema.safeParse(v).success;
}

export const taxDatePartSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
});

export type TaxDatePart = z.infer<typeof taxDatePartSchema>;

export function toUtcTaxDate(p: TaxDatePart): Date {
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

export const TaxesInputSchema = z
  .object({
    from: taxDatePartSchema,
    to: taxDatePartSchema,
    countryCode: z
      .string()
      .length(2)
      .transform((c) => {
        const u = c.toUpperCase();
        return u === 'UK' ? 'GB' : u;
      })
      .refine(isIso3166Alpha2, {
        message: 'countryCode must be ISO 3166-1 alpha-2 (e.g. US, DE, JP)',
      }),
  })
  .superRefine((val, ctx) => {
    const from = toUtcTaxDate(val.from);
    const to = toUtcTaxDate(val.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid calendar date',
      });
      return;
    }
    if (from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '`from` must be on or before `to`',
        path: ['from'],
      });
    }
  });

export type TaxesInput = z.infer<typeof TaxesInputSchema>;

const x402AmountSchema = z.union([
  z
    .string()
    .trim()
    .regex(
      /^[1-9]\d*$/,
      'amount must be base units (positive integer string, no decimals)',
    ),
  z.number().int().positive().transform((n) => String(n)),
]);

const x402InputObjectSchema = z.object({
  checkoutType: z.enum(['x402', 'on-chain']).optional().default('x402'),
  id: z.string().min(1).max(256).optional(),
  amount: x402AmountSchema,
  currency: z
    .string()
    .min(1)
    .max(66)
    .transform((s) => {
      const t = s.trim();
      return /^0x[a-fA-F0-9]{40}$/i.test(t) ? t.toLowerCase() : t;
    }),
  network: z.string().min(1).max(64),
  payTo: z
    .string()
    .min(1)
    .refine(
      (s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()),
      'payTo must be a 0x-prefixed 20-byte address',
    )
    .transform((s) => s.trim().toLowerCase()),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  resourceUrl: z.string().url().max(2048).optional(),
  expiresAt: z.coerce.date().optional(),
  decimals: z.number().int().min(0).max(36).optional(),
  attachment: stardormChatAttachmentSchema.optional(),
});

/** Explicit type: `z.infer` on extended schemas breaks under some TS/Zod builds (Linux Docker). */
export type X402Input = {
  checkoutType: 'x402' | 'on-chain';
  id?: string;
  amount: string;
  currency: string;
  network: string;
  payTo: string;
  title?: string;
  description?: string;
  resourceUrl?: string;
  expiresAt?: Date;
  decimals?: number;
  attachment?: StardormChatAttachment;
};

function refineX402CheckoutId(val: X402Input, ctx: z.RefinementCtx): void {
  if (val.checkoutType !== 'on-chain' && !val.id?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'id is required for x402 checkouts',
      path: ['id'],
    });
  }
  if (val.checkoutType === 'x402' && !isBeamUsdcEAsset(val.currency)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'x402 checkouts only support USDC.e on 0G mainnet (0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E).',
      path: ['currency'],
    });
  }
}

/** `superRefine` breaks `z.infer` under some TS/Zod builds (e.g. Linux Docker). */
export const X402InputSchema = x402InputObjectSchema.superRefine(
  refineX402CheckoutId,
) as z.ZodType<X402Input>;

/** Optional UI hints for `generate_tax_report` tool calls only (not handler execution input). */
export const taxReportToolCardSchema = z.object({
  cardTitle: z.string().min(1).max(120).optional(),
  supplementalRows: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        value: z.string().min(1).max(400),
      }),
    )
    .max(6)
    .optional(),
});

export type TaxReportToolCard = z.infer<typeof taxReportToolCardSchema>;

/** Full tool argument object: tax handler params + optional tax-tailored card. */
export const generateTaxReportToolArgsSchema = TaxesInputSchema.and(
  z.object({
    reportCard: taxReportToolCardSchema.optional(),
  }),
);

export type GenerateTaxReportToolArgs = z.infer<
  typeof generateTaxReportToolArgsSchema
>;

/** Optional UI hints for `create_x402_payment` tool calls only. */
export const x402PaymentToolCardSchema = z.object({
  invoiceTitle: z.string().min(1).max(120).optional(),
  lineItems: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        value: z.string().min(1).max(400),
      }),
    )
    .max(8)
    .optional(),
});

export type X402PaymentToolCard = z.infer<typeof x402PaymentToolCardSchema>;

const createX402PaymentToolArgsObjectSchema = x402InputObjectSchema.extend({
  paymentCard: x402PaymentToolCardSchema.optional(),
});

export type CreateX402PaymentToolArgs = X402Input & {
  paymentCard?: X402PaymentToolCard;
};

export const createX402PaymentToolArgsSchema =
  createX402PaymentToolArgsObjectSchema.superRefine(
    refineX402CheckoutId,
  ) as z.ZodType<CreateX402PaymentToolArgs>;

const x402CheckoutFormNetworksSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(64),
      label: z.string().min(1).max(120),
    }),
  )
  .max(16)
  .optional();

/** OpenAI tool `offer_x402_checkout_form` arguments (no payment amounts guessed by the model). */
export const offerX402CheckoutFormToolArgsSchema = z.object({
  formTitle: z.string().min(1).max(200).optional(),
  intro: z.string().max(2000).optional(),
  resourceUrl: z.string().url().max(2048).optional(),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: x402CheckoutFormNetworksSchema,
});

export type OfferX402CheckoutFormToolArgs = z.infer<
  typeof offerX402CheckoutFormToolArgsSchema
>;

/** Persisted on the chat CTA row until the user submits the checkout form. */
export const x402CheckoutFormCtaParamsSchema = z.object({
  _checkoutForm: z.literal(true),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: x402CheckoutFormNetworksSchema,
  intro: z.string().max(2000).optional(),
  resourceUrl: z.string().url().max(2048).optional(),
});

export type X402CheckoutFormCtaParams = z.infer<
  typeof x402CheckoutFormCtaParamsSchema
>;

export function isX402CheckoutFormCtaParams(
  v: unknown,
): v is X402CheckoutFormCtaParams {
  return x402CheckoutFormCtaParamsSchema.safeParse(v).success;
}

export const onRampPaymentToolCardSchema = z.object({
  invoiceTitle: z.string().min(1).max(120).optional(),
  lineItems: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        value: z.string().min(1).max(400),
      }),
    )
    .max(8)
    .optional(),
});

export type OnRampPaymentToolCard = z.infer<typeof onRampPaymentToolCardSchema>;

export const createOnRampTokensToolArgsSchema = onRampTokensInputSchema.extend({
  paymentCard: onRampPaymentToolCardSchema.optional(),
});

export type CreateOnRampTokensToolArgs = z.infer<
  typeof createOnRampTokensToolArgsSchema
>;

const creditCardToolPreviewSchema = z.object({
  cardTitle: z.string().min(1).max(120).optional(),
  supplementalRows: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        value: z.string().min(1).max(400),
      }),
    )
    .max(10)
    .optional(),
});

export type CreditCardToolPreview = z.infer<typeof creditCardToolPreviewSchema>;

export const createCreditCardToolArgsSchema = createCreditCardInputSchema.and(
  z.object({
    cardPreview: creditCardToolPreviewSchema.optional(),
  }),
);

export type CreateCreditCardToolArgs = z.infer<typeof createCreditCardToolArgsSchema>;

/** Same shape as x402 offer form; used by `offer_on_ramp_checkout_form`. */
export const offerOnRampCheckoutFormToolArgsSchema =
  offerX402CheckoutFormToolArgsSchema;

export type OfferOnRampCheckoutFormToolArgs = z.infer<
  typeof offerOnRampCheckoutFormToolArgsSchema
>;

/** OpenAI tool `offer_credit_card_checkout_form` arguments (no PII invented by the model). */
export const offerCreditCardCheckoutFormToolArgsSchema = z.object({
  formTitle: z.string().min(1).max(200).optional(),
  intro: z.string().max(2000).optional(),
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((c) => c.toUpperCase())
    .optional(),
});

export type OfferCreditCardCheckoutFormToolArgs = z.infer<
  typeof offerCreditCardCheckoutFormToolArgsSchema
>;

/** OpenAI tool `offer_swap_checkout_form` arguments. */
export const offerSwapCheckoutFormToolArgsSchema = z.object({
  formTitle: z.string().min(1).max(200).optional(),
  intro: z.string().max(2000).optional(),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: x402CheckoutFormNetworksSchema,
  defaultPoolFee: z.union([z.literal(500), z.literal(3000), z.literal(10000)]).optional(),
});

export type OfferSwapCheckoutFormToolArgs = z.infer<
  typeof offerSwapCheckoutFormToolArgsSchema
>;

export { swapFormCtaParamsSchema, isSwapFormCtaParams } from '@beam/stardorm-api-contract';
export type { SwapFormCtaParams } from '@beam/stardorm-api-contract';
