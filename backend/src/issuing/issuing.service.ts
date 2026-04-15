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
  cardholderName?: string | null;
  billingAddress?: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
  } | null;
};

type IssuingCardLike = {
  id: string;
  status?: string | null;
  last4?: string | null;
  brand?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
};

type IssuingCardholderLike = {
  id: string;
  name?: string | null;
  requirements?: {
    disabled_reason?: string | null;
    currently_due?: string[] | null;
    eventually_due?: string[] | null;
    past_due?: string[] | null;
  } | null;
  billing?: {
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postal_code?: string | null;
    } | null;
  } | null;
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

  private getStripeTermsAcceptance(input?: {
    ip?: string;
    userAgent?: string;
  }): { ip: string; date: number; user_agent: string } {
    const ip = (input?.ip ?? '').trim();
    const user_agent = (input?.userAgent ?? '').trim();
    return {
      ip: ip || '127.0.0.1',
      // Stripe expects a UNIX timestamp (seconds), not ms.
      date: Math.floor(Date.now() / 1000),
      user_agent: user_agent || 'unknown',
    };
  }

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

  async createIssuingEphemeralKey(
    wallet: string,
    params: { cardId: string; nonce: string },
  ): Promise<{ ephemeralKeySecret: string }> {
    if (!this.config.get<string>('STRIPE_SECRET_KEY')) {
      throw new BadRequestException('Stripe is not configured');
    }
    const cardId = (params.cardId ?? '').trim();
    const nonce = (params.nonce ?? '').trim();
    if (!cardId) throw new BadRequestException('Missing cardId');
    if (!nonce) throw new BadRequestException('Missing nonce');

    const user = await this.users.findByWallet(wallet);
    if (!user?.stripeCardId) {
      throw new BadRequestException('No issuing card for this wallet');
    }
    if (user.stripeCardId !== cardId) {
      throw new BadRequestException('Card does not belong to this wallet');
    }

    const ek = await this.stripe.ephemeralKeys.create(
      {
        nonce,
        issuing_card: cardId,
      } as any,
      {
        // Required for ephemeral keys; keep in sync with Stripe Issuing Elements minimums.
        apiVersion: '2026-03-25.dahlia' as any,
      } as any,
    );

    const secret = typeof (ek as any).secret === 'string' ? (ek as any).secret : '';
    if (!secret) {
      throw new BadRequestException('Failed to create ephemeral key');
    }
    return { ephemeralKeySecret: secret };
  }

  private async ensureCardholder(
    wallet: string,
    opts?: {
      name: string;
      email?: string;
      phone?: string;
      termsAcceptance?: {
        ip?: string;
        userAgent?: string;
      };
    },
  ): Promise<string> {
    const user = await this.users.findByWallet(wallet);
    if (user?.stripeCardholderId) return user.stripeCardholderId;
    const name = opts?.name?.trim()!;
    const email = opts?.email?.trim();
    const phone_number = opts?.phone?.trim();

    const b = {
      line1: '651 N Broad Street',
      line2: null as string | null,
      city: 'Middletown',
      state: 'DE',
      country: 'US',
      postal_code: '19709',
    };

    const nameParts = name.split(/\s+/).filter(Boolean);
    const first_name = nameParts[0] ?? name;
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '.';
    const cardholder = await this.stripe.issuing.cardholders.create({
      type: 'individual',
      name,
      email,
      phone_number,
      metadata: { wallet },
      individual: {
        first_name,
        last_name,
        card_issuing: {
          user_terms_acceptance: {
            ...this.getStripeTermsAcceptance(opts?.termsAcceptance),
          },
        },
      },
      billing: {
        address: {
          line1: b.line1,
          line2: b.line2 ?? undefined,
          city: b.city,
          state: b.state || undefined,
          country: b.country,
          postal_code: b.postal_code,
        },
      },
      status: 'active',
    });
    await this.users.setStripeIds(wallet, {
      stripeCardholderId: cardholder.id,
    });
    return cardholder.id;
  }

  private async fetchCardholder(
    cardholderId: string,
  ): Promise<IssuingCardholderLike | null> {
    const id = (cardholderId ?? '').trim();
    if (!id) return null;
    try {
      return (await this.stripe.issuing.cardholders.retrieve(
        id,
      )) as IssuingCardholderLike;
    } catch (e: unknown) {
      // Don't fail card summary if Stripe cardholder retrieval fails.
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Failed to retrieve cardholder ${id}: ${msg}`);
      return null;
    }
  }

  private isStripeOutstandingRequirementsError(err: unknown): boolean {
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as any).message ?? '')
        : '';
    return msg
      .toLowerCase()
      .includes(
        'cardholder has outstanding requirements preventing them from activating an issued card',
      );
  }

  async ensureVirtualCard(
    wallet: string,
    opts?: {
      name: string;
      email?: string;
      phone?: string;
      termsAcceptance?: {
        ip?: string;
        userAgent?: string;
      };
    },
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
      const ch = await this.fetchCardholder(existing.stripeCardholderId ?? '');
      const summary = this.toSummary(
        wallet,
        existing.stripeCardholderId ?? '',
        card,
        ch,
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

    const ch = await this.fetchCardholder(cardholderId);
    const summary = this.toSummary(wallet, cardholderId, card, ch);
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
    const ch = await this.fetchCardholder(existing.stripeCardholderId ?? '');
    const summary = this.toSummary(
      wallet,
      existing.stripeCardholderId ?? '',
      card,
      ch,
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
   * Freeze/unfreeze the authenticated wallet's virtual card by setting Stripe status.
   * Stripe uses `inactive` to prevent new authorizations (our "frozen" state).
   */
  async setVirtualCardFrozen(
    wallet: string,
    frozen: boolean,
  ): Promise<VirtualCardSummary | null> {
    if (!this.config.get<string>('STRIPE_SECRET_KEY')) {
      throw new BadRequestException('Stripe is not configured');
    }
    const existing = await this.users.findByWallet(wallet);
    if (!existing?.stripeCardId) return null;

    const nextStatus = frozen ? 'inactive' : 'active';
    let updated: IssuingCardLike;
    try {
      updated = (await this.stripe.issuing.cards.update(existing.stripeCardId, {
        status: nextStatus as any,
      })) as IssuingCardLike;
    } catch (e: unknown) {
      // When activating (unfreezing), Stripe can reject if the cardholder has unmet KYC/verification requirements.
      if (!frozen && this.isStripeOutstandingRequirementsError(e)) {
        const ch = await this.fetchCardholder(
          existing.stripeCardholderId ?? '',
        );
        throw new BadRequestException({
          message:
            'Cardholder has outstanding requirements and cannot activate this card yet. Complete required verification fields for the cardholder, then try again.',
          stripeMessage: e instanceof Error ? e.message : String(e),
          cardholder: {
            id: existing.stripeCardholderId ?? null,
            requirements: ch?.requirements ?? null,
          },
          docs: 'https://stripe.com/docs/issuing/cards',
        });
      }
      throw e;
    }

    const ch = await this.fetchCardholder(existing.stripeCardholderId ?? '');
    const summary = this.toSummary(
      wallet,
      existing.stripeCardholderId ?? '',
      updated,
      ch,
    );
    await this.users.setStripeIds(wallet, {
      lastIssuedCardStatus: updated.status ?? undefined,
    });
    await this.users.setCachedIssuingSummary(
      wallet,
      summary as unknown as Record<string, unknown>,
    );
    return summary;
  }

  /**
   * Reveal PAN/CVC for the authenticated wallet's virtual card.
   * Only available for virtual cards and only when Stripe allows revealing fields.
   */
  async revealVirtualCard(wallet: string): Promise<{
    pan: string | null;
    cvc: string | null;
  } | null> {
    if (!this.config.get<string>('STRIPE_SECRET_KEY')) {
      throw new BadRequestException('Stripe is not configured');
    }
    const existing = await this.users.findByWallet(wallet);
    if (!existing?.stripeCardId) return null;

    // Stripe supports revealing number/cvc for virtual cards; expand defensively.
    const card = (await this.stripe.issuing.cards.retrieve(
      existing.stripeCardId,
      {
        // Types may not include these expandable fields; runtime does.
        expand: ['number', 'cvc'] as any,
      },
    )) as IssuingCardLike & { number?: string | null; cvc?: string | null };

    const pan =
      typeof card.number === 'string' && card.number.trim()
        ? card.number
        : null;
    const cvc =
      typeof card.cvc === 'string' && card.cvc.trim() ? card.cvc : null;
    return { pan, cvc };
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
    cardholder?: IssuingCardholderLike | null,
  ): VirtualCardSummary {
    const addr = cardholder?.billing?.address ?? null;
    return {
      walletAddress: wallet,
      stripeCardId: card.id,
      stripeCardholderId: cardholderId,
      status: card.status ?? null,
      last4: card.last4 ?? null,
      brand: card.brand ?? null,
      expMonth: card.exp_month ?? null,
      expYear: card.exp_year ?? null,
      cardholderName: cardholder?.name ?? null,
      billingAddress: addr
        ? {
            line1: addr.line1 ?? null,
            line2: addr.line2 ?? null,
            city: addr.city ?? null,
            state: addr.state ?? null,
            country: addr.country ?? null,
            postal_code: addr.postal_code ?? null,
          }
        : null,
    };
  }
}
