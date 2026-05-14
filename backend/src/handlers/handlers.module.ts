import { Module } from '@nestjs/common';
import { CreditCardsModule } from '../credit-cards/credit-cards.module';
import { PaymentsModule } from '../payments/payments.module';
import { HandlersController } from './handlers.controller';
import { HandlersService } from './handlers.service';
import { TaxesService } from './taxes.service';
import { X402Service } from './x402.service';
import { CreditCardHandlerService } from './credit-card-handler.service';
import { StripeModule } from '../stripe/stripe.module';
import { BillingWalletDataService } from './billing-wallet-data.service';
import { PaymentInvoiceService } from './payment-invoice.service';
import { FinancialActivityReportService } from './financial-activity-report.service';

@Module({
  imports: [PaymentsModule, StripeModule, CreditCardsModule],
  controllers: [HandlersController],
  providers: [
    HandlersService,
    TaxesService,
    X402Service,
    CreditCardHandlerService,
    BillingWalletDataService,
    PaymentInvoiceService,
    FinancialActivityReportService,
  ],
  exports: [HandlersService, TaxesService, X402Service],
})
export class HandlersModule {}
