import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  paymentSettlementBodySchema,
  type PublicPaymentRequest,
} from '@beam/stardorm-api-contract';
import { parseBody } from '../common/parse-body';
import { PaymentRequestsService } from './payment-requests.service';
import { PaymentsPaywallService } from './payments-paywall.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentRequests: PaymentRequestsService,
    private readonly paywall: PaymentsPaywallService,
  ) {}

  /** Public read for checkout / pay pages (no auth). */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const row = await this.paymentRequests.getPublicById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  /**
   * x402 paywall for browser checkout: 402 until the payer wallet signs and retries
   * with PAYMENT-SIGNATURE (handled by @x402/axios on the client).
   */
  @Get(':id/access')
  async access(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.paywall.handleAccess(id, req, res);
  }

  /**
   * Records on-chain settlement for a checkout row (x402 or plain on-chain).
   * Call after the wallet transaction is broadcast.
   */
  @Post(':id/pay')
  async pay(
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<PublicPaymentRequest> {
    const body = parseBody(paymentSettlementBodySchema, raw);
    return this.paymentRequests.confirmSettlement(id, body);
  }
}
