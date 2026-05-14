import { BadRequestException, Injectable } from '@nestjs/common';
import { OgStorageService } from 'src/og/og-storage.service';
import type { HandlerContext, HandlerMessage, HandlerService } from './handler.types';
import { TaxesInputSchema, toUtcTaxDate } from './handler-inputs.schema';
import { buildLinesPdf } from './minimal-pdf';

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function defaultTaxRate(country: string): number {
  const c = country.toUpperCase();
  if (c === 'US') return 0.22;
  if (c === 'GB' || c === 'UK') return 0.2;
  if (c === 'DE' || c === 'FR') return 0.25;
  if (c === 'SG') return 0.17;
  return 0.2;
}

type TaxesOutput = {
  address: string;
  expenses: number;
  income: number;
  taxes: number;
  netIncome: number;
  taxRate: number;
  fromDate: Date;
  toDate: Date;
  countryCode: string;
};

function deriveStubLedger(
  wallet: string,
  from: Date,
  to: Date,
  countryCode: string,
): TaxesOutput {
  const ms = Math.max(0, +to - +from);
  const days = Math.max(1, Math.round(ms / 86400000));
  const seed = fnv1a32(`${wallet}|${+from}|${+to}|${countryCode}`);
  const scale = days / 365;
  const income = Math.round((25000 + (seed % 75000)) * scale);
  const expenseRatio = 0.08 + (seed % 17) / 100;
  const expenses = Math.round(income * expenseRatio);
  const taxable = Math.max(0, income - expenses);
  const taxRate = defaultTaxRate(countryCode);
  const taxes = Math.round(taxable * taxRate);
  const netIncome = income - expenses - taxes;

  return {
    address: wallet,
    income,
    expenses,
    taxes,
    netIncome,
    taxRate,
    fromDate: from,
    toDate: to,
    countryCode,
  };
}

@Injectable()
export class TaxesService implements HandlerService {
  readonly id = 'generate_tax_report' as const;

  constructor(private readonly ogStorage: OgStorageService) {}

  async handle(
    raw: unknown,
    ctx: HandlerContext,
  ): Promise<HandlerMessage> {
    const parsed = TaxesInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    const fromDate = toUtcTaxDate(data.from);
    const toDate = toUtcTaxDate(data.to);
    if (fromDate > toDate) {
      throw new BadRequestException('`from` must be on or before `to`');
    }

    const wallet = ctx.walletAddress.trim().toLowerCase();
    const output = deriveStubLedger(wallet, fromDate, toDate, data.countryCode);

    const pdf = this.buildPdf(output);
    const { rootHash } = await this.ogStorage.uploadBuffer(pdf);

    return {
      message:
        'Here is a draft tax-style summary for your reporting period, based on your wallet ' +
        'and the dates you chose. The amounts are sample numbers for demos only—they are not ' +
        'real tax calculations and are not tax or legal advice. Download the PDF below when you are ready.',
      data: {
        countryCode: output.countryCode,
        from: output.fromDate.toISOString(),
        to: output.toDate.toISOString(),
        income: output.income,
        expenses: output.expenses,
        taxes: output.taxes,
        netIncome: output.netIncome,
        taxRate: output.taxRate,
      },
      attachments: [
        {
          rootHash,
          mimeType: 'application/pdf',
          name: 'tax-summary.pdf',
        },
      ],
    };
  }

  private buildPdf(output: TaxesOutput): Buffer {
    const fmt = (n: number) =>
      n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const lines = [
      'Stardorm — crypto activity tax summary (demo)',
      `Wallet: ${output.address}`,
      `Country: ${output.countryCode}`,
      `Period: ${output.fromDate.toISOString().slice(0, 10)} → ${output.toDate.toISOString().slice(0, 10)}`,
      '',
      `Income (est.):     ${fmt(output.income)}`,
      `Expenses (est.):   ${fmt(output.expenses)}`,
      `Effective tax rate: ${(output.taxRate * 100).toFixed(2)}%`,
      `Taxes (est.):      ${fmt(output.taxes)}`,
      `Net after tax:     ${fmt(output.netIncome)}`,
      '',
      'Disclaimer: illustrative numbers for product demos only.',
    ];
    return buildLinesPdf(lines);
  }
}
