import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../users/schemas/user.schema';

export type VirtualCardSummary = {
  walletAddress: string;
  stripeCardId: string;
  stripeCardholderId: string;
  status: string | null;
  last4: string | null;
  brand: string | null;
  expMonth: number | null;
  expYear: number | null;
};

type IssuingCardLike = {
  id: string;
  status?: string | null;
  last4?: string | null;
  brand?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
};

/** Stripe webhook payload after constructEvent (stripe-node v22). */
type StripeIssuingCardWebhookEvent = {
  type: string;
  data: {
    object: IssuingCardLike & {
      metadata?: { wallet_address?: string };
      cardholder?: string | { id?: string };
    };
  };
};

@Injectable()
export class IssuingService {
  private readonly logger = new Logger(IssuingService.name);
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set; Issuing endpoints will fail until configured.',
      );
    }
    this.stripe = new Stripe(key ?? 'sk_test_placeholder', {
      typescript: true,
    });
  }

  private billingDefaults() {
    return {
      line1: this.config.get<string>('ISSUING_BILLING_LINE1', '123 Market St'),
      city: this.config.get<string>('ISSUING_BILLING_CITY', 'San Francisco'),
      country: this.config.get<string>('ISSUING_BILLING_COUNTRY', 'US'),
      postal_code: this.config.get<string>('ISSUING_BILLING_POSTAL', '94105'),
    };
  }

  private async ensureCardholder(
    wallet: string,
    opts?: { name: string; email?: string; phone?: string },
  ): Promise<string> {
    const user = await this.users.findByWallet(wallet);
    if (user?.stripeCardholderId) return user.stripeCardholderId;
    const b = this.billingDefaults();
    const name = opts?.name?.trim()!;
    const email = opts?.email?.trim();
    const phone_number = opts?.phone?.trim();
    const cardholder = await this.stripe.issuing.cardholders.create({
      type: 'individual',
      name,
      email,
      phone_number,
      metadata: { wallet },
      billing: {
        address: {
          line1: b.line1,
          city: b.city,
          country: b.country,
          postal_code: b.postal_code,
        },
      },
    });
    await this.users.setStripeIds(wallet, {
      stripeCardholderId: cardholder.id,
    });
    return cardholder.id;
  }

  async ensureVirtualCard(
    wallet: string,
    opts?: { name: string; email?: string; phone?: string },
  ): Promise<VirtualCardSummary> {
    if (!this.config.get<string>('STRIPE_SECRET_KEY')) {
      throw new BadRequestException('Stripe is not configured');
    }
    const cached = await this.users.getCachedIssuingSummary(wallet);
    if (cached && typeof cached.stripeCardId === 'string') {
      return cached as unknown as VirtualCardSummary;
    }

    const existing = await this.users.findByWallet(wallet);
    if (existing?.stripeCardId) {
      const card = (await this.stripe.issuing.cards.retrieve(
        existing.stripeCardId,
      )) as IssuingCardLike;
      const summary = this.toSummary(
        wallet,
        existing.stripeCardholderId ?? '',
        card,
      );
      await this.users.setCachedIssuingSummary(
        wallet,
        summary as unknown as Record<string, unknown>,
      );
      return summary;
    }

    const cardholderId = await this.ensureCardholder(wallet, opts);
    const card = (await this.stripe.issuing.cards.create({
      cardholder: cardholderId,
      currency: 'usd',
      type: 'virtual',
      metadata: { wallet_address: wallet },
    })) as IssuingCardLike;

    await this.users.setStripeIds(wallet, {
      stripeCardholderId: cardholderId,
      stripeCardId: card.id,
      lastIssuedCardStatus: card.status ?? undefined,
    });

    const summary = this.toSummary(wallet, cardholderId, card);
    await this.users.setCachedIssuingSummary(
      wallet,
      summary as unknown as Record<string, unknown>,
    );
    return summary;
  }

  /**
   * Current card for the wallet, or null if none. When refresh is true, loads from Stripe.
   */
  async getVirtualCardSummary(
    wallet: string,
    refresh = true,
  ): Promise<VirtualCardSummary | null> {
    if (!this.config.get<string>('STRIPE_SECRET_KEY')) {
      throw new BadRequestException('Stripe is not configured');
    }
    if (!refresh) {
      const cached = await this.users.getCachedIssuingSummary(wallet);
      if (cached && typeof cached.stripeCardId === 'string') {
        return cached as unknown as VirtualCardSummary;
      }
    }
    const existing = await this.users.findByWallet(wallet);
    if (!existing?.stripeCardId) return null;
    const card = (await this.stripe.issuing.cards.retrieve(
      existing.stripeCardId,
    )) as IssuingCardLike;
    const summary = this.toSummary(
      wallet,
      existing.stripeCardholderId ?? '',
      card,
    );
    await this.users.setStripeIds(wallet, {
      lastIssuedCardStatus: card.status ?? undefined,
    });
    await this.users.setCachedIssuingSummary(
      wallet,
      summary as unknown as Record<string, unknown>,
    );
    return summary;
  }

  /**
   * Stripe Issuing webhooks (configure endpoint + signing secret in Dashboard).
   */
  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not set');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    let event: StripeIssuingCardWebhookEvent;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        secret,
      ) as StripeIssuingCardWebhookEvent;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'invalid payload';
      this.logger.warn(`Webhook signature failed: ${msg}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.applyIssuingWebhookEvent(event);
    return { received: true };
  }

  private async applyIssuingWebhookEvent(
    event: StripeIssuingCardWebhookEvent,
  ): Promise<void> {
    if (
      event.type !== 'issuing_card.updated' &&
      event.type !== 'issuing_card.created'
    ) {
      return;
    }
    const card = event.data.object;
    const walletFromMeta = card.metadata?.wallet_address?.toLowerCase();
    let user: UserDocument | null = null;
    if (walletFromMeta) {
      user = await this.users.findByWallet(walletFromMeta);
    }
    if (!user) {
      user = await this.users.findByStripeCardId(card.id);
    }
    if (!user) {
      this.logger.debug(`No user for issuing card webhook ${card.id}`);
      return;
    }
    const wallet = user.walletAddress;
    const cardholderId =
      user.stripeCardholderId ??
      (typeof card.cardholder === 'string'
        ? card.cardholder
        : card.cardholder?.id) ??
      '';
    const summary = this.toSummary(wallet, cardholderId, card);
    await this.users.setStripeIds(wallet, {
      lastIssuedCardStatus: card.status ?? undefined,
    });
    await this.users.setCachedIssuingSummary(
      wallet,
      summary as unknown as Record<string, unknown>,
    );
  }

  private toSummary(
    wallet: string,
    cardholderId: string,
    card: IssuingCardLike,
  ): VirtualCardSummary {
    return {
      walletAddress: wallet,
      stripeCardId: card.id,
      stripeCardholderId: cardholderId,
      status: card.status ?? null,
      last4: card.last4 ?? null,
      brand: card.brand ?? null,
      expMonth: card.exp_month ?? null,
      expYear: card.exp_year ?? null,
    };
  }
}
