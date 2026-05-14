import { Injectable, NotFoundException } from '@nestjs/common';
import type { HandlerContext, HandlerMessage } from './handler.types';
import { isHandlerActionId } from './handler.types';
import { TaxesService } from './taxes.service';
import { X402Service } from './x402.service';
import { OnRampService } from '../stripe/on-ramp.service';
import { KycStripeService } from '../stripe/kyc-stripe.service';
import { CreditCardHandlerService } from './credit-card-handler.service';

@Injectable()
export class HandlersService {
  constructor(
    private readonly taxes: TaxesService,
    private readonly x402: X402Service,
    private readonly onRamp: OnRampService,
    private readonly kyc: KycStripeService,
    private readonly creditCard: CreditCardHandlerService,
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
      default:
        throw new NotFoundException(`Unknown handler: ${handleId}`);
    }
  }
}
