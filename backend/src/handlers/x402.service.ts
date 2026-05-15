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
      checkoutType,
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
      attachment,
    } = parsed.data;

    const payer = ctx.walletAddress.trim().toLowerCase();
    const displayTitle = title ?? (checkoutType === 'on-chain' ? 'Payment' : `Resource ${id?.trim() ?? ''}`);

    if (checkoutType === 'on-chain') {
      const row = await this.paymentRequests.createOnChainPayment({
        title: displayTitle,
        description,
        attachment,
        asset: currency,
        amount,
        payTo,
        network,
        expiresAt,
        createdByWallet: payer,
        decimals,
      });

      const paymentRequestId = row._id.toHexString();

      return {
        message:
          'Your checkout link is ready. Share it so payers can complete the transfer from a crypto wallet.',
        data: {
          checkoutType: 'on-chain',
          paymentRequestId,
          payPath: `/pay/${paymentRequestId}`,
        },
      };
    }

    const resourceId = id?.trim();
    if (!resourceId) {
      throw new BadRequestException('id is required for x402 checkouts');
    }
    const resourceKey = `${network}:${resourceId}`;

    const handlerData: Record<string, unknown> = {
      x402Version: 1,
      resource: {
        id: resourceId,
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
          description: description ?? title ?? `Payment for ${resourceId}`,
        },
      ],
    };

    const row = await this.paymentRequests.createX402Payment({
      title: displayTitle,
      description,
      attachment,
      asset: currency,
      amount,
      payTo,
      network,
      expiresAt,
      resourceId,
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
        checkoutType: 'x402',
        ...handlerData,
        ...(decimals !== undefined ? { decimals } : {}),
        paymentRequestId,
        payPath: `/pay/${paymentRequestId}`,
      },
    };
  }
}
