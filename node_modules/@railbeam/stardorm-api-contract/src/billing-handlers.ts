import { z } from "zod";

/** UTC calendar day (same shape as tax report date parts). */
export const billingDatePartSchema = z.object({
  year: z.number().int().min(2020).max(2036),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
});

export type BillingDatePart = z.infer<typeof billingDatePartSchema>;

export function billingDatePartToUtc(p: BillingDatePart): Date {
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

/** Inclusive end of the UTC calendar day for `to` filters. */
export function billingRangeEndOfDay(p: BillingDatePart): Date {
  const d = billingDatePartToUtc(p);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** Mongo / service date bounds from optional handler `from` / `to` parts. */
export function billingPeriodBounds(input: {
  from?: BillingDatePart;
  to?: BillingDatePart;
}): { from?: Date; to?: Date } {
  return {
    from: input.from ? billingDatePartToUtc(input.from) : undefined,
    to: input.to ? billingRangeEndOfDay(input.to) : undefined,
  };
}

export const generatePaymentInvoiceInputSchema = z
  .object({
    from: billingDatePartSchema.optional(),
    to: billingDatePartSchema.optional(),
    invoiceTitle: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.from || !val.to) return;
    const a = billingDatePartToUtc(val.from);
    const b = billingDatePartToUtc(val.to);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid calendar date",
      });
      return;
    }
    if (a > b) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "`from` must be on or before `to`",
        path: ["from"],
      });
    }
  });

export type GeneratePaymentInvoiceInput = z.infer<
  typeof generatePaymentInvoiceInputSchema
>;

export const generateFinancialActivityReportInputSchema = z
  .object({
    from: billingDatePartSchema.optional(),
    to: billingDatePartSchema.optional(),
    reportTitle: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.from || !val.to) return;
    const a = billingDatePartToUtc(val.from);
    const b = billingDatePartToUtc(val.to);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid calendar date",
      });
      return;
    }
    if (a > b) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "`from` must be on or before `to`",
        path: ["from"],
      });
    }
  });

export type GenerateFinancialActivityReportInput = z.infer<
  typeof generateFinancialActivityReportInputSchema
>;
