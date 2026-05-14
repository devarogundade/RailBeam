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

  if (!isOnboardingComplete()) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background bg-dots px-4">
        <div className="h-6 w-6 animate-pulse rounded-full bg-primary/40" aria-hidden />
        <p className="text-sm text-muted-foreground">Preparing your workspace…</p>
      </div>
    );
  }

  return <>{children}</>;
}
