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

type CheckoutSessionWebhookPayload = {
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
  payment_status?: string | null;
  payment_intent?: string | { id: string } | null;
};

function beamOnRampId(session: CheckoutSessionWebhookPayload): string | undefined {
  if (session.metadata?.beam_on_ramp !== '1') return undefined;
  const raw = session.metadata.onRampId ?? session.client_reference_id;
  if (typeof raw !== 'string') return undefined;
  const id = raw.trim();
  return id.length > 0 ? id : undefined;
}

function paymentIntentIdFromSession(
  session: CheckoutSessionWebhookPayload,
): string | undefined {
  const pi = session.payment_intent;
  if (typeof pi === 'string' && pi.trim()) return pi.trim();
  if (pi && typeof pi === 'object' && typeof pi.id === 'string' && pi.id.trim()) {
    return pi.id.trim();
  }
  return undefined;
}

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
        const session = event.data.object as CheckoutSessionWebhookPayload;
        const onRampId = beamOnRampId(session);
        if (onRampId) {
          const pi = paymentIntentIdFromSession(session);
          if (pi) await this.onRamp.linkStripePaymentIntent(onRampId, pi);
          // Synchronous methods: paid immediately. Async (e.g. bank debit): wait for
          // `checkout.session.async_payment_succeeded` before fulfilling.
          if (session.payment_status === 'paid') {
            await this.onRamp.fulfillPaidOnRamp(onRampId);
          }
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as CheckoutSessionWebhookPayload;
        const onRampId = beamOnRampId(session);
        if (onRampId) {
          const pi = paymentIntentIdFromSession(session);
          if (pi) await this.onRamp.linkStripePaymentIntent(onRampId, pi);
          await this.onRamp.fulfillPaidOnRamp(onRampId);
        }
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as CheckoutSessionWebhookPayload;
        const onRampId = beamOnRampId(session);
        if (onRampId) {
          await this.onRamp.markStripePaymentFailed(
            onRampId,
            'Stripe async payment failed for this checkout session',
          );
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as CheckoutSessionWebhookPayload;
        const onRampId = beamOnRampId(session);
        if (onRampId) await this.onRamp.markCanceled(onRampId);
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
