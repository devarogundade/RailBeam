import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { StardormMongoModule } from '../mongo/stardorm-mongo.module';
import {
  CreditCard,
  CreditCardSchema,
} from '../mongo/schemas/credit-card.schema';
import {
  CreditCardFundTx,
  CreditCardFundTxSchema,
} from '../mongo/schemas/credit-card-fund-tx.schema';
import { CreditCardFundingService } from './credit-card-funding.service';
import { CreditCardFundPaywallService } from './credit-card-fund-paywall.service';
import { PaymentsModule } from '../payments/payments.module';
import { CreditCardsService } from './credit-cards.service';

@Module({
  imports: [
    EmailModule,
    StardormMongoModule,
    PaymentsModule,
    MongooseModule.forFeature([
      { name: CreditCard.name, schema: CreditCardSchema },
      { name: CreditCardFundTx.name, schema: CreditCardFundTxSchema },
    ]),
  ],
  providers: [
    CreditCardsService,
    CreditCardFundingService,
    CreditCardFundPaywallService,
  ],
  exports: [
    CreditCardsService,
    CreditCardFundingService,
    CreditCardFundPaywallService,
  ],
})
export class CreditCardsModule {}
