/** Legacy single-key storage (pre per-wallet); cleared when saving a scoped token. */
const LEGACY_STARDORM_JWT_STORAGE_KEY = "stardorm:jwt";

/** In-flight wallet sign-in (challenge + `signMessage` + verify) deduped per address. */
const stardormSignInInflight = new Map<string, Promise<boolean>>();

/**
 * Connected wallet (`AppProvider` sets this every render). Used by `getStardormAccessToken`
 * and axios so JWT storage can be keyed by address.
 */
export const stardormConnectedWalletRef = {
  current: null as string | null,
};

function normalizeWalletKey(address: string): string {
  return address.trim().toLowerCase();
}

export function stardormJwtStorageKey(walletAddress: string): string {
  return `stardorm:jwt:${normalizeWalletKey(walletAddress)}`;
}

export function getStardormAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const addr = stardormConnectedWalletRef.current;
  if (!addr?.trim()) return null;
  try {
    return localStorage.getItem(stardormJwtStorageKey(addr));
  } catch {
    return null;
  }
}

export function setStardormAccessToken(token: string, walletAddress: string): void {
  if (typeof window === "undefined") return;
  if (!walletAddress.trim()) return;
  localStorage.setItem(stardormJwtStorageKey(walletAddress), token);
  try {
    localStorage.removeItem(LEGACY_STARDORM_JWT_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Omit `walletAddress` to clear the token for whoever is in `stardormConnectedWalletRef`. */
/**
 * Runs `signIn` at most once per wallet until it settles (success or failure).
 * Concurrent callers (re-renders, Strict Mode, navigation) share the same promise.
 */
export function runStardormWalletSignInOnce(
  walletAddress: string,
  signIn: () => Promise<boolean>,
): Promise<boolean> {
  const key = normalizeWalletKey(walletAddress);
  const existing = stardormSignInInflight.get(key);
  if (existing) return existing;
  const run = signIn().finally(() => {
    stardormSignInInflight.delete(key);
  });
  stardormSignInInflight.set(key, run);
  return run;
}

export function clearStardormSignInInflight(walletAddress?: string | null): void {
  if (walletAddress?.trim()) {
    stardormSignInInflight.delete(normalizeWalletKey(walletAddress));
    return;
  }
  stardormSignInInflight.clear();
}

export function clearStardormAccessToken(walletAddress?: string | null): void {
  if (typeof window === "undefined") return;
  const raw =
    walletAddress?.trim() ? walletAddress : stardormConnectedWalletRef.current;
  try {
    if (raw?.trim()) {
      localStorage.removeItem(stardormJwtStorageKey(raw));
    }
    localStorage.removeItem(LEGACY_STARDORM_JWT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
