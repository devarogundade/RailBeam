import { Injectable, NotFoundException } from '@nestjs/common';
import type { HandlerContext, HandlerMessage } from './handler.types';
import { isHandlerActionId } from './handler.types';
import { TaxesService } from './taxes.service';
import { X402Service } from './x402.service';
import { OnRampService } from '../stripe/on-ramp.service';
import { KycStripeService } from '../stripe/kyc-stripe.service';
import { CreditCardHandlerService } from './credit-card-handler.service';
import { PaymentInvoiceService } from './payment-invoice.service';
import { FinancialActivityReportService } from './financial-activity-report.service';
import {
  DraftErc20TransferHandlerService,
  DraftNativeTransferHandlerService,
  DraftNftTransferHandlerService,
} from './transfer-draft-handlers.service';
import { DraftTokenSwapHandlerService } from './swap-draft-handlers.service';

@Injectable()
export class HandlersService {
  constructor(
    private readonly taxes: TaxesService,
    private readonly x402: X402Service,
    private readonly onRamp: OnRampService,
    private readonly kyc: KycStripeService,
    private readonly creditCard: CreditCardHandlerService,
    private readonly paymentInvoice: PaymentInvoiceService,
    private readonly financialActivityReport: FinancialActivityReportService,
    private readonly draftNative: DraftNativeTransferHandlerService,
    private readonly draftErc20: DraftErc20TransferHandlerService,
    private readonly draftNft: DraftNftTransferHandlerService,
    private readonly draftSwap: DraftTokenSwapHandlerService,
  ) {}

  async dispatch(
    handleId: string,
    body: unknown,
    ctx: HandlerContext,
  ): Promise<HandlerMessage> {
    if (!isHandlerActionId(handleId)) {
      throw new NotFoundException(`Unknown handler: ${handleId}`);
    }
    switch (handleId) {
      case 'generate_tax_report':
        return this.taxes.handle(body, ctx);
      case 'create_x402_payment':
        return this.x402.handle(body, ctx);
      case 'on_ramp_tokens':
        return this.onRamp.handle(body, ctx);
      case 'complete_stripe_kyc':
        return this.kyc.handle(body, ctx);
      case 'create_credit_card':
        return this.creditCard.handle(body, ctx);
      case 'generate_payment_invoice':
        return this.paymentInvoice.handle(body, ctx);
      case 'generate_financial_activity_report':
        return this.financialActivityReport.handle(body, ctx);
      case 'draft_native_transfer':
        return this.draftNative.handle(body, ctx);
      case 'draft_erc20_transfer':
        return this.draftErc20.handle(body, ctx);
      case 'draft_nft_transfer':
        return this.draftNft.handle(body, ctx);
      case 'draft_token_swap':
        return this.draftSwap.handle(body, ctx);
    }
  }
}
