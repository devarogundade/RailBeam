import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ConversationsSyncModule } from '../conversations-sync/conversations-sync.module';
import { StardormMongoModule } from '../mongo/stardorm-mongo.module';
import { OnRampService } from './on-ramp.service';
import { KycStripeService } from './kyc-stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [StardormMongoModule, EmailModule, ConversationsSyncModule],
  controllers: [StripeWebhookController],
  providers: [OnRampService, KycStripeService],
  exports: [OnRampService, KycStripeService],
})
export class StripeModule {}
