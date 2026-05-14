import { Module } from '@nestjs/common';
import { StardormMongoModule } from '../mongo/stardorm-mongo.module';
import { PaymentsController } from './payments.controller';
import { PaymentRequestsService } from './payment-requests.service';
import { X402FacilitatorService } from './x402-facilitator.service';

@Module({
  imports: [StardormMongoModule],
  controllers: [PaymentsController],
  providers: [PaymentRequestsService, X402FacilitatorService],
  exports: [PaymentRequestsService, X402FacilitatorService],
})
export class PaymentsModule {}
