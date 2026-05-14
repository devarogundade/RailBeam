import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { isOnboardingComplete } from "@/lib/onboarding";

/** Sends first-time visitors to `/onboarding` before they use the main shell. */
export function OnboardingRedirect({ children }: { children: React.ReactNode; }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  React.useLayoutEffect(() => {
    if (isOnboardingComplete()) return;
    void navigate({ to: "/onboarding", replace: true });
  }, [pathname, navigate]);

  /** Root `beforeLoad` normally redirects first; keep a cheap fallback without an extra full-screen skeleton. */
  if (!isOnboardingComplete()) return null;

  return <>{children}</>;
}
