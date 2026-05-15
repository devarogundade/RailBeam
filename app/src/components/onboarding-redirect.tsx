import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageRoutePending } from "@/components/page-shimmer";
import { isOnboardingComplete, prefetchOnboardingRoute } from "@/lib/onboarding";

/**
 * Fallback when root `beforeLoad` has not committed yet — shows the same chrome as
 * `/onboarding` pending state and navigates without mounting the main app shell.
 */
export function OnboardingRedirect() {
  const navigate = useNavigate();

  React.useLayoutEffect(() => {
    if (isOnboardingComplete()) return;
    prefetchOnboardingRoute();
    void navigate({ to: "/onboarding", replace: true });
  }, [navigate]);

  if (isOnboardingComplete()) return null;

  return <PageRoutePending variant="narrow" />;
}
