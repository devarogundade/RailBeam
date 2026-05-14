import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreditCardsModule } from '../credit-cards/credit-cards.module';
import { HandlersModule } from '../handlers/handlers.module';
import { PaymentsModule } from '../payments/payments.module';
import { StripeModule } from '../stripe/stripe.module';
import { StardormMongoModule } from '../mongo/stardorm-mongo.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ConversationsSyncModule } from '../conversations-sync/conversations-sync.module';

@Module({
  imports: [
    StardormMongoModule,
    ConversationsSyncModule,
    AuthModule,
    HandlersModule,
    CreditCardsModule,
    PaymentsModule,
    StripeModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
