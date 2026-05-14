const STORAGE_KEY = "beam.onboarding.v1";
const COOKIE_NAME = "beam_onboarding";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
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
  document.cookie = `${COOKIE_NAME}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
}
