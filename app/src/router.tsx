import "@/lib/web3/appkit";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { isOnboardingComplete, prefetchOnboardingRoute } from "@/lib/onboarding";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  if (typeof window !== "undefined" && !isOnboardingComplete()) {
    prefetchOnboardingRoute();
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
