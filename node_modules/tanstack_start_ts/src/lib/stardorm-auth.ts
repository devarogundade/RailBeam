export const STARDORM_JWT_STORAGE_KEY = "stardorm:jwt";

export function getStardormAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STARDORM_JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStardormAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STARDORM_JWT_STORAGE_KEY, token);
}

export function clearStardormAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STARDORM_JWT_STORAGE_KEY);
}
