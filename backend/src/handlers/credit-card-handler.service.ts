import { BadRequestException, Injectable } from '@nestjs/common';
import { createCreditCardInputSchema } from '@beam/stardorm-api-contract';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { FinancialSnapshotsService } from '../mongo/financial-snapshots.service';
import type {
  HandlerContext,
  HandlerMessage,
  HandlerService,
} from './handler.types';

@Injectable()
export class CreditCardHandlerService implements HandlerService {
  readonly id = 'create_credit_card' as const;

  constructor(
    private readonly creditCards: CreditCardsService,
    private readonly financialSnapshots: FinancialSnapshotsService,
  ) {}

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = createCreditCardInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const row = await this.creditCards.createForWallet(
      ctx.walletAddress,
      parsed.data,
    );
    if (row.balanceCents > 0) {
      void this.financialSnapshots
        .recordVirtualCardFund(ctx.walletAddress, row.balanceCents)
        .catch(() => {
          /* best-effort rollup */
        });
    }
    const id = row._id.toHexString();
    const panDisplay = `•••• •••• •••• ${row.last4}`;
    const data: Record<string, unknown> = {
      creditCardId: id,
      last4: row.last4,
      panDisplay,
      networkBrand: row.networkBrand,
      balanceCents: row.balanceCents,
      currency: row.currency,
      firstName: row.firstName,
      lastName: row.lastName,
      cardLabel: row.cardLabel,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      region: row.region,
      postalCode: row.postalCode,
      countryCode: row.countryCode,
      dashboardPath: '/dashboard',
    };
    return {
      message:
        'Your virtual payment card is ready. The summary shows the cardholder and billing address on file. ' +
        'Use the dashboard to add or remove funds from the card balance.',
      data,
    };
  }
}
