import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { StardormMongoModule } from '../mongo/stardorm-mongo.module';
import { PaymentsController } from './payments.controller';
import { PaymentRequestsService } from './payment-requests.service';
import { X402FacilitatorService } from './x402-facilitator.service';
import { PaymentsPaywallService } from './payments-paywall.service';

@Module({
  imports: [StardormMongoModule, EmailModule],
  controllers: [PaymentsController],
  providers: [
    PaymentRequestsService,
    X402FacilitatorService,
    PaymentsPaywallService,
  ],
  exports: [PaymentRequestsService, X402FacilitatorService],
})
export class PaymentsModule {}
