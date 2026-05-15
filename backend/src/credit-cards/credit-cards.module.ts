import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import {
  CreditCard,
  CreditCardSchema,
} from '../mongo/schemas/credit-card.schema';
import {
  CreditCardFundTx,
  CreditCardFundTxSchema,
} from '../mongo/schemas/credit-card-fund-tx.schema';
import { CreditCardFundingService } from './credit-card-funding.service';
import { CreditCardsService } from './credit-cards.service';

@Module({
  imports: [
    EmailModule,
    MongooseModule.forFeature([
      { name: CreditCard.name, schema: CreditCardSchema },
      { name: CreditCardFundTx.name, schema: CreditCardFundTxSchema },
    ]),
  ],
  providers: [CreditCardsService, CreditCardFundingService],
  exports: [CreditCardsService, CreditCardFundingService],
})
export class CreditCardsModule {}
