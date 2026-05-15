import { BadRequestException, Injectable } from '@nestjs/common';
import {
  billingPeriodBounds,
  generatePaymentInvoiceInputSchema,
} from '@beam/stardorm-api-contract';
import { OgStorageService } from 'src/og/og-storage.service';
import type {
  HandlerContext,
  HandlerMessage,
  HandlerService,
} from './handler.types';
import { BillingWalletDataService } from './billing-wallet-data.service';
import { buildLinesPdf } from './minimal-pdf';

@Injectable()
export class PaymentInvoiceService implements HandlerService {
  readonly id = 'generate_payment_invoice' as const;

  constructor(
    private readonly ogStorage: OgStorageService,
    private readonly billingData: BillingWalletDataService,
  ) {}

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = generatePaymentInvoiceInputSchema.safeParse(
      raw && typeof raw === 'object' ? raw : {},
    );
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const wallet = ctx.walletAddress.trim().toLowerCase();
    const range = billingPeriodBounds(parsed.data);
    const snap = await this.billingData.load(wallet, range);

    const title =
      parsed.data.invoiceTitle?.trim() || 'Beam — payment & checkout summary';
    const periodLabel =
      snap.dateRange.from && snap.dateRange.to
        ? `${snap.dateRange.from.slice(0, 10)} → ${snap.dateRange.to.slice(0, 10)} (UTC)`
        : snap.dateRange.from
          ? `From ${snap.dateRange.from.slice(0, 10)} UTC`
          : snap.dateRange.to
            ? `Through ${snap.dateRange.to.slice(0, 10)} UTC`
            : 'All recent activity (no date filter)';

    const lines: string[] = [
      title,
      `Wallet: ${wallet}`,
      `Period: ${periodLabel}`,
      '',
      '— Checkout links you created —',
    ];
    const pushRows = (rows: { id: string; title: string; status: string }[]) => {
      if (!rows.length) {
        lines.push('  (none)');
        return;
      }
      const max = 12;
      for (const row of rows.slice(0, max)) {
        lines.push(`  • ${row.title.slice(0, 56)} [${row.status}] id=${row.id.slice(0, 8)}…`);
      }
      if (rows.length > max) {
        lines.push(`  … and ${rows.length - max} more (see JSON in chat).`);
      }
    };

    pushRows(
      snap.createdBy.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
      })),
    );
    lines.push('');
    lines.push('— Checkouts you paid —');
    pushRows(
      snap.paidBy.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
      })),
    );

    lines.push('');
    lines.push('— Card on-ramp (Stripe → tokens) —');
    if (!snap.onRamps.length) {
      lines.push('  (none)');
    } else {
      const max = 10;
      for (const r of snap.onRamps.slice(0, max)) {
        const usd = (r.usdAmountCents / 100).toFixed(2);
        lines.push(
          `  • ${r.tokenSymbol} ${r.status} — $${usd} — ${r.network}`,
        );
      }
      if (snap.onRamps.length > max) {
        lines.push(`  … and ${snap.onRamps.length - max} more.`);
      }
    }

    lines.push('');
    lines.push('— Virtual payment cards —');
    if (!snap.creditCards.length) {
      lines.push('  (none)');
    } else {
      let total = 0;
      for (const c of snap.creditCards.slice(0, 8)) {
        total += c.balanceCents;
        lines.push(
          `  • ${c.networkBrand} •••• ${c.last4} — ${(c.balanceCents / 100).toFixed(2)} ${c.currency}`,
        );
      }
      if (snap.creditCards.length > 8) {
        lines.push(`  … +${snap.creditCards.length - 8} more cards.`);
      }
      lines.push(
        `  Combined balance (shown cards): ${(total / 100).toFixed(2)} (minor units summed; demo cards).`,
      );
    }

    lines.push('');
    lines.push(`— KYC (Stripe Identity) — status: ${snap.kyc.status}`);
    lines.push('');
    lines.push(
      'Note: Line items reflect Mongo-backed app state (x402 / on-chain checkouts, on-ramp, cards, KYC). Not legal tax or accounting advice.',
    );

    const pdf = await buildLinesPdf(lines.slice(0, 48));
    const { rootHash } = await this.ogStorage.uploadBuffer(pdf, {
      clientEvmChainId: ctx.clientEvmChainId,
    });

    return {
      message:
        'Here is a wallet-scoped invoice-style PDF built from your payment requests, on-ramp history, virtual cards, and current KYC status. Amounts for on-chain rows are in token base units on the live checkout objects—open the dashboard for full detail.',
      data: {
        invoiceTitle: title,
        period: snap.dateRange,
        paymentRequestsCreated: snap.createdBy,
        paymentRequestsPaid: snap.paidBy,
        onRamps: snap.onRamps,
        creditCards: snap.creditCards,
        kyc: snap.kyc,
      },
      attachments: [
        {
          rootHash,
          mimeType: 'application/pdf',
          name: 'beam-payment-summary.pdf',
        },
      ],
    };
  }
}
