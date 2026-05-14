const STORAGE_KEY = "beam.onboarding.v1";

/** Same name as in `setOnboardingComplete` — used by SSR guards and cookie checks. */
export const ONBOARDING_COOKIE_NAME = "beam_onboarding";

function readOnboardingCookieFromHeader(cookieHeader: string): boolean {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    const prefix = `${ONBOARDING_COOKIE_NAME}=`;
    if (p.startsWith(prefix)) return p.slice(prefix.length) === "1";
  }
  return false;
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* ignore quota / private mode */
  }
  try {
    return readOnboardingCookieFromHeader(typeof document !== "undefined" ? document.cookie : "");
  } catch {
    return false;
  }
}

/** Persists completion in localStorage and a lightweight cookie (SSR-friendly follow-up visits). */
export function setOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
  document.cookie = `${ONBOARDING_COOKIE_NAME}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
}
