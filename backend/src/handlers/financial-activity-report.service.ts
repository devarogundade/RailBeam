import { BadRequestException, Injectable } from '@nestjs/common';
import {
  billingPeriodBounds,
  generateFinancialActivityReportInputSchema,
} from '@beam/stardorm-api-contract';
import { OgStorageService } from 'src/og/og-storage.service';
import type {
  HandlerContext,
  HandlerMessage,
  HandlerService,
} from './handler.types';
import { BillingWalletDataService } from './billing-wallet-data.service';
import { buildLinesPdf } from './minimal-pdf';

function countByStatus(rows: { status: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.status] = (out[r.status] ?? 0) + 1;
  }
  return out;
}

@Injectable()
export class FinancialActivityReportService implements HandlerService {
  readonly id = 'generate_financial_activity_report' as const;

  constructor(
    private readonly ogStorage: OgStorageService,
    private readonly billingData: BillingWalletDataService,
  ) {}

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = generateFinancialActivityReportInputSchema.safeParse(
      raw && typeof raw === 'object' ? raw : {},
    );
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const wallet = ctx.walletAddress.trim().toLowerCase();
    const range = billingPeriodBounds(parsed.data);
    const snap = await this.billingData.load(wallet, range);

    const byId = new Map<string, (typeof snap.createdBy)[0]>();
    for (const p of snap.createdBy) byId.set(p.id, p);
    for (const p of snap.paidBy) byId.set(p.id, p);
    const prUnique = [...byId.values()];
    const prByStatus = countByStatus(prUnique);
    const rampByStatus = countByStatus(snap.onRamps);
    const cardBalanceTotal = snap.creditCards.reduce(
      (s, c) => s + c.balanceCents,
      0,
    );
    const fulfilledRampUsd = snap.onRamps
      .filter((r) => r.status === 'fulfilled')
      .reduce((s, r) => s + r.usdAmountCents, 0);

    const title =
      parsed.data.reportTitle?.trim() ||
      'Beam — financial activity snapshot (wallet)';
    const periodLabel =
      snap.dateRange.from && snap.dateRange.to
        ? `${snap.dateRange.from.slice(0, 10)} → ${snap.dateRange.to.slice(0, 10)} UTC`
        : snap.dateRange.from
          ? `From ${snap.dateRange.from.slice(0, 10)} UTC`
          : snap.dateRange.to
            ? `Through ${snap.dateRange.to.slice(0, 10)} UTC`
            : 'All recent rows (no date filter)';

    const fmtUsd = (cents: number) => (cents / 100).toFixed(2);

    const lines: string[] = [
      title,
      `Wallet: ${wallet}`,
      `Period: ${periodLabel}`,
      '',
      'Payment requests (merged view)',
      `  Distinct payment requests in window: ${prUnique.length} (created-by-you: ${snap.createdBy.length}, paid-by-you: ${snap.paidBy.length})`,
      `  By status: ${Object.entries(prByStatus)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ') || '—'}`,
      '',
      'On-ramp (card → token)',
      `  Sessions: ${snap.onRamps.length}; fulfilled USD (sum): $${fmtUsd(fulfilledRampUsd)}`,
      `  By status: ${Object.entries(rampByStatus)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ') || '—'}`,
      '',
      'Virtual cards',
      `  Cards on file: ${snap.creditCards.length}; combined balance (cents sum): ${cardBalanceTotal}`,
      '',
      'KYC',
      `  Status: ${snap.kyc.status}`,
      ...(snap.kyc.stripeVerificationSessionId
        ? [`  Stripe session: ${snap.kyc.stripeVerificationSessionId.slice(0, 16)}…`]
        : []),
      '',
      'This report is for operational visibility in Beam; it is not audited financial statements.',
    ];

    const pdf = buildLinesPdf(lines);
    const { rootHash } = await this.ogStorage.uploadBuffer(pdf);

    return {
      message:
        'Generated a one-page activity snapshot from your payment requests, on-ramp sessions, virtual card balances, and KYC record. Use the JSON block for precise counts; the PDF is a shareable summary.',
      data: {
        reportTitle: title,
        period: snap.dateRange,
        paymentRequests: {
          createdByYou: snap.createdBy.length,
          paidByYou: snap.paidBy.length,
          distinctInWindow: prUnique.length,
          byStatus: prByStatus,
        },
        onRamp: {
          total: snap.onRamps.length,
          fulfilledUsdCents: fulfilledRampUsd,
          byStatus: rampByStatus,
        },
        creditCards: {
          count: snap.creditCards.length,
          totalBalanceCents: cardBalanceTotal,
        },
        kyc: { status: snap.kyc.status },
        detail: {
          paymentRequestsCreated: snap.createdBy,
          paymentRequestsPaid: snap.paidBy,
          onRamps: snap.onRamps,
          creditCards: snap.creditCards,
          kyc: snap.kyc,
        },
      },
      attachments: [
        {
          rootHash,
          mimeType: 'application/pdf',
          name: 'beam-activity-report.pdf',
        },
      ],
    };
  }
}
