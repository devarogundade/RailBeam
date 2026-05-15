/** Legacy single-key storage (pre per-wallet); cleared when saving a scoped token. */
const LEGACY_STARDORM_JWT_STORAGE_KEY = "stardorm:jwt";

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
