import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  HandlerContext,
  HandlerMessage,
  HandlerService,
} from './handler.types';
import { X402InputSchema } from './handler-inputs.schema';
import { PaymentRequestsService } from '../payments/payment-requests.service';

/**
 * Builds x402-style payment instructions for a paywalled HTTP resource
 * and persists a {@link PaymentRequest} row for `/payments/:id` + `/pay/:id`.
 * @see https://www.x402.org/
 */
@Injectable()
export class X402Service implements HandlerService {
  readonly id = 'create_x402_payment' as const;

  constructor(private readonly paymentRequests: PaymentRequestsService) {}

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = X402InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const {
      id,
      amount,
      currency,
      network,
      payTo,
      title,
      description,
      resourceUrl,
      expiresAt,
      decimals,
    } = parsed.data;

    const payer = ctx.walletAddress.trim().toLowerCase();
    const resourceKey = `${network}:${id}`;
    const displayTitle = title ?? `Resource ${id}`;

    const handlerData: Record<string, unknown> = {
      x402Version: 1,
      resource: {
        id,
        key: resourceKey,
        title: displayTitle,
        resourceUrl,
      },
      payerWallet: payer,
      payment: {
        scheme: 'exact',
        network,
        asset: currency,
        amount,
        payTo,
      },
      accepts: [
        {
          scheme: 'exact',
          network,
          maxAmountRequired: amount,
          asset: currency,
          payTo,
          resource: resourceKey,
          description: description ?? title ?? `Payment for ${id}`,
        },
      ],
    };

    const row = await this.paymentRequests.createX402Payment({
      title: displayTitle,
      description,
      asset: currency,
      amount,
      payTo,
      network,
      expiresAt,
      resourceId: id,
      resourceUrl,
      createdByWallet: payer,
      decimals,
      x402Payload: handlerData,
    });

    const paymentRequestId = row._id.toHexString();

    return {
      message:
        'Your payment checkout is ready. Use the buttons below to open or copy the pay link ' +
        'so you or someone else can pay from a crypto wallet.',
      data: {
        ...handlerData,
        ...(decimals !== undefined ? { decimals } : {}),
        paymentRequestId,
        payPath: `/pay/${paymentRequestId}`,
      },
    };
  }
}
