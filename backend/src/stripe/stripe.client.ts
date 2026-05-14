import type { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type StripeClient = InstanceType<typeof Stripe>;

let cached: StripeClient | null | undefined;

export function getStripe(config: ConfigService): StripeClient | null {
  if (cached !== undefined) return cached;
  const key = config.get<string>('STRIPE_SECRET_KEY')?.trim();
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Stripe(key, {
    typescript: true,
  });
  return cached;
}

export function resetStripeClientCacheForTests(): void {
  cached = undefined;
}
