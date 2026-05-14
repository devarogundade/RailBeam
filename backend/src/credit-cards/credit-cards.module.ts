import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CreditCard,
  CreditCardSchema,
} from '../mongo/schemas/credit-card.schema';
import { CreditCardsService } from './credit-cards.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CreditCard.name, schema: CreditCardSchema }]),
  ],
  providers: [CreditCardsService],
  exports: [CreditCardsService],
})
export class CreditCardsModule {}
