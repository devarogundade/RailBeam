import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';

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
      this.logger.warn('STRIPE_SECRET_KEY is not set; Issuing endpoints will fail until configured.');
    }
    this.stripe = new Stripe(key ?? 'sk_test_placeholder', {
      typescript: true,
    });
  }

  private billingDefaults() {
    return {
      name: this.config.get<string>('ISSUING_CARDHOLDER_NAME', 'Beam User'),
      line1: this.config.get<string>('ISSUING_BILLING_LINE1', '123 Market St'),
      city: this.config.get<string>('ISSUING_BILLING_CITY', 'San Francisco'),
      country: this.config.get<string>('ISSUING_BILLING_COUNTRY', 'US'),
      postal_code: this.config.get<string>('ISSUING_BILLING_POSTAL', '94105'),
    };
  }

  private async ensureCardholder(wallet: string): Promise<string> {
    const user = await this.users.findByWallet(wallet);
    if (user?.stripeCardholderId) return user.stripeCardholderId;
    const b = this.billingDefaults();
    const cardholder = await this.stripe.issuing.cardholders.create({
      type: 'individual',
      name: b.name,
      metadata: { wallet_address: wallet },
      billing: {
        address: {
          line1: b.line1,
          city: b.city,
          country: b.country,
          postal_code: b.postal_code,
        },
      },
    });
    await this.users.setStripeIds(wallet, { stripeCardholderId: cardholder.id });
    return cardholder.id;
  }

  async ensureVirtualCard(wallet: string): Promise<VirtualCardSummary> {
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
      const summary = this.toSummary(wallet, existing.stripeCardholderId ?? '', card);
      await this.users.setCachedIssuingSummary(wallet, summary as unknown as Record<string, unknown>);
      return summary;
    }

    const cardholderId = await this.ensureCardholder(wallet);
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
    await this.users.setCachedIssuingSummary(wallet, summary as unknown as Record<string, unknown>);
    return summary;
  }

  private toSummary(wallet: string, cardholderId: string, card: IssuingCardLike): VirtualCardSummary {
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
