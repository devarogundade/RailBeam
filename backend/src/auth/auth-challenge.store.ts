import { randomBytes } from 'node:crypto';

type Row = { nonce: string; exp: number };

/** In-memory login challenges (replace with Redis for multi-instance). */
export class AuthChallengeStore {
  private readonly store = new Map<string, Row>();

  set(walletLower: string, nonce: string, ttlMs: number): void {
    this.store.set(walletLower, { nonce, exp: Date.now() + ttlMs });
  }

  peek(walletLower: string): string | null {
    const row = this.store.get(walletLower);
    if (!row || row.exp < Date.now()) {
      this.store.delete(walletLower);
      return null;
    }
    return row.nonce;
  }

  consume(walletLower: string): void {
    this.store.delete(walletLower);
  }
}

export function randomNonce(): string {
  return randomBytes(16).toString('hex');
}
