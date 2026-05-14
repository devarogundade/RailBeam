import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { getStripe } from './stripe.client';
import { OnRampService } from './on-ramp.service';
import { KycStripeService } from './kyc-stripe.service';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly log = new Logger(StripeWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly onRamp: OnRampService,
    private readonly kyc: KycStripeService,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  async stripe(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: true }> {
    const stripe = getStripe(this.config);
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')?.trim();
    if (!stripe || !secret) {
      throw new BadRequestException('Stripe webhook is not configured');
    }
    const raw = req.rawBody;
    if (!Buffer.isBuffer(raw)) {
      this.log.error('Missing raw body for Stripe webhook');
      throw new BadRequestException('Missing raw body');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(raw, signature, secret);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Webhook signature verification failed: ${msg}`);
      throw new BadRequestException('Invalid signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          metadata?: Record<string, string> | null;
          client_reference_id?: string | null;
        };
        if (session.metadata?.beam_on_ramp === '1') {
          const onRampId =
            session.metadata.onRampId ?? session.client_reference_id;
          if (onRampId) {
            await this.onRamp.fulfillPaidOnRamp(onRampId);
          }
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as {
          metadata?: Record<string, string> | null;
          client_reference_id?: string | null;
        };
        if (session.metadata?.beam_on_ramp === '1') {
          const onRampId =
            session.metadata.onRampId ?? session.client_reference_id;
          if (onRampId) {
            await this.onRamp.markCanceled(onRampId);
          }
        }
        break;
      }
      case 'identity.verification_session.processing':
      case 'identity.verification_session.verified':
      case 'identity.verification_session.requires_input':
      case 'identity.verification_session.canceled':
      case 'identity.verification_session.created': {
        const session = event.data.object as {
          id: string;
          status: string;
          metadata?: Record<string, string> | null;
        };
        await this.kyc.applyVerificationSessionFromStripe(session);
        break;
      }
      default:
        break;
    }

    return { received: true };
  }
}
