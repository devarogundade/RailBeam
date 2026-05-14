import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  paymentSettlementBodySchema,
  type PublicPaymentRequest,
} from '@beam/stardorm-api-contract';
import { parseBody } from '../common/parse-body';
import { PaymentRequestsService } from './payment-requests.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentRequests: PaymentRequestsService) {}

  /** Public read for checkout / pay pages (no auth). */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const row = await this.paymentRequests.getPublicById(id);
    if (!row) throw new NotFoundException();
    return row;
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
