import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatEther } from 'ethers';
import { OgStorageService } from 'src/og/og-storage.service';
import { chainscanApiUrlForClientEvmChain } from 'src/og/beam-og.config';
import type { HandlerContext, HandlerMessage, HandlerService } from './handler.types';
import { taxRateForCountry } from '@beam/stardorm-api-contract';
import { TaxesInputSchema, toUtcTaxDate } from './handler-inputs.schema';
import {
  fetchChainscanLedger,
  formatTokenHuman,
  type ChainscanLedgerAggregate,
} from './chainscan-ledger';
import { buildLinesPdf } from './minimal-pdf';
import { CoinmarketcapPriceService } from '../pricing/coinmarketcap-price.service';
import { ZERO_GRAVITY_CMC_SYMBOL } from '../pricing/coinmarketcap.constants';

type TaxesOutput = {
  address: string;
  /** USD-ish totals when a native spot price is available; native leg only. */
  income: number;
  expenses: number;
  taxes: number;
  netIncome: number;
  taxRate: number;
  fromDate: Date;
  toDate: Date;
  countryCode: string;
  ledger: ChainscanLedgerAggregate;
};

function taxRangeBounds(fromDate: Date, toDate: Date): {
  rangeStartSec: number;
  rangeEndSec: number;
} {
  const rangeStartSec = Math.floor(fromDate.getTime() / 1000);
  const rangeEndSec = Math.floor(toDate.getTime() / 1000) + 86400 - 1;
  return { rangeStartSec, rangeEndSec };
}

function usdFromNativeWei(wei: bigint, usdPerNative: number): number {
  if (usdPerNative <= 0) return 0;
  const eth = Number(wei) / 1e18;
  if (!Number.isFinite(eth)) return 0;
  return eth * usdPerNative;
}

function buildTaxesOutput(
  wallet: string,
  countryCode: string,
  fromDate: Date,
  toDate: Date,
  ledger: ChainscanLedgerAggregate,
  usdPerNative: number,
): TaxesOutput {
  const taxRate = taxRateForCountry(countryCode);
  const incomeNativeUsd = usdFromNativeWei(ledger.nativeReceivedWei, usdPerNative);
  const expenseNativeUsd = usdFromNativeWei(ledger.nativeSentWei, usdPerNative);
  const income = Math.round(incomeNativeUsd);
  const expenses = Math.round(expenseNativeUsd);
  const taxable = Math.max(0, income - expenses);
  const taxes = usdPerNative > 0 ? Math.round(taxable * taxRate) : 0;
  const netIncome = income - expenses - taxes;

  return {
    address: wallet,
    income,
    expenses,
    taxes,
    netIncome,
    taxRate,
    fromDate,
    toDate,
    countryCode,
    ledger,
  };
}

@Injectable()
export class TaxesService implements HandlerService {
  readonly id = 'generate_tax_report' as const;

  constructor(
    private readonly ogStorage: OgStorageService,
    private readonly config: ConfigService,
    private readonly cmcPrice: CoinmarketcapPriceService,
  ) {}

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
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
    const apiBase = chainscanApiUrlForClientEvmChain(
      this.config,
      ctx.clientEvmChainId,
    );
    if (!apiBase?.trim()) {
      throw new ServiceUnavailableException(
        'Chainscan API URL is not configured. Set CHAINSCAN_API_URL and/or CHAINSCAN_API_URL_MAINNET / CHAINSCAN_API_URL_TESTNET.',
      );
    }
    const usdPerNative = (await this.cmcPrice.getZeroGravityUsdPrice()) ?? 0;

    const { rangeStartSec, rangeEndSec } = taxRangeBounds(fromDate, toDate);
    let ledger: ChainscanLedgerAggregate;
    try {
      ledger = await fetchChainscanLedger(apiBase, wallet, rangeStartSec, rangeEndSec);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      throw new ServiceUnavailableException(
        `Could not load on-chain activity from Chainscan (${msg}).`,
      );
    }

    const output = buildTaxesOutput(
      wallet,
      data.countryCode,
      fromDate,
      toDate,
      ledger,
      Number.isFinite(usdPerNative) && usdPerNative > 0 ? usdPerNative : 0,
    );

    const pdf = await this.buildPdf(
      output,
      usdPerNative > 0 && Number.isFinite(usdPerNative),
    );
    const { rootHash } = await this.ogStorage.uploadBuffer(pdf, {
      clientEvmChainId: ctx.clientEvmChainId,
    });

    return {
      message:
        'Tax-period summary built from your wallet activity on 0G via the public Chainscan API ' +
        '(native transfers and ERC-20 `tokentx`). Figures are not legal or tax advice. ' +
        (usdPerNative > 0 && Number.isFinite(usdPerNative)
          ? `Estimated USD values use CoinMarketCap spot for ${ZERO_GRAVITY_CMC_SYMBOL} ($${usdPerNative.toFixed(4)} per native, 24h cache) on incoming/outgoing native gas token only; ERC-20 flows are listed in the PDF without fiat conversion.`
          : 'Native-token USD spot is unavailable (configure COINMARKETCAP_API_KEY and REDIS_URL); estimated tax on the native leg is zero.'),
      data: {
        countryCode: output.countryCode,
        from: output.fromDate.toISOString(),
        to: output.toDate.toISOString(),
        income: output.income,
        expenses: output.expenses,
        taxes: output.taxes,
        netIncome: output.netIncome,
        taxRate: output.taxRate,
        chainscan: {
          apiBase,
          nativeReceivedWei: output.ledger.nativeReceivedWei.toString(),
          nativeSentWei: output.ledger.nativeSentWei.toString(),
          nativeTxInCount: output.ledger.nativeTxInCount,
          nativeTxOutCount: output.ledger.nativeTxOutCount,
          tokenTxInCount: output.ledger.tokenTxInCount,
          tokenTxOutCount: output.ledger.tokenTxOutCount,
          tokenBuckets: output.ledger.tokenFlows.map((t) => ({
            contract: t.contractAddress,
            symbol: t.symbol,
            decimals: t.decimals,
            received: t.received.toString(),
            sent: t.sent.toString(),
            receivedHuman: formatTokenHuman(t.received, t.decimals),
            sentHuman: formatTokenHuman(t.sent, t.decimals),
          })),
        },
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

  private async buildPdf(
    output: TaxesOutput,
    usdModelActive: boolean,
  ): Promise<Buffer> {
    const fmt = (n: number) =>
      n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const fmtWei = (w: bigint) => {
      try {
        return `${formatEther(w)} native`;
      } catch {
        return `${w.toString()} wei`;
      }
    };
    const lines: string[] = [
      'Stardorm — on-chain tax summary (Chainscan)',
      `Wallet: ${output.address}`,
      `Country (rate hint): ${output.countryCode} (${(output.taxRate * 100).toFixed(2)}%)`,
      `Period (UTC): ${output.fromDate.toISOString().slice(0, 10)} → ${output.toDate.toISOString().slice(0, 10)}`,
      '',
      'Native (gas token) — in period',
      `  Received: ${fmtWei(output.ledger.nativeReceivedWei)} (${output.ledger.nativeTxInCount} txs in)`,
      `  Sent:     ${fmtWei(output.ledger.nativeSentWei)} (${output.ledger.nativeTxOutCount} txs out)`,
      '',
    ];
    if (usdModelActive) {
      lines.push(
        `USD-style estimate (native leg only, CoinMarketCap ${ZERO_GRAVITY_CMC_SYMBOL})`,
        `  Income (est.):     $${fmt(output.income)}`,
        `  Expenses (est.):   $${fmt(output.expenses)}`,
        `  Taxes (est.):      $${fmt(output.taxes)}`,
        `  Net after tax:     $${fmt(output.netIncome)}`,
        '',
      );
    } else {
      lines.push(
        'USD / fiat tax estimate disabled (native spot price unavailable).',
        '',
      );
    }
    lines.push('ERC-20 (top flows by volume, human units)');
    const top = output.ledger.tokenFlows.slice(0, 12);
    if (top.length === 0) {
      lines.push('  (no ERC-20 transfers in this period)', '');
    } else {
      for (const t of top) {
        const rin = formatTokenHuman(t.received, t.decimals);
        const sout = formatTokenHuman(t.sent, t.decimals);
        lines.push(`  ${t.symbol}: +${rin} / -${sout}  (${t.contractAddress.slice(0, 10)}…)`);
      }
      lines.push('');
    }
    lines.push(
      'Source: Chainscan account API (txlist + tokentx).',
      'Disclaimer: not legal, accounting, or tax advice.',
    );
    return buildLinesPdf(lines);
  }
}
