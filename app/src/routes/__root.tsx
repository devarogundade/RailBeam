import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { wagmiAdapter } from "@/lib/web3/appkit";
import { BeamNetworkProvider } from "@/lib/beam-network-context";
import { AppProvider } from "@/lib/app-state";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { OnboardingRedirect } from "@/components/onboarding-redirect";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 dark">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-(--btn-primary-bg) px-4 py-2 text-sm font-medium text-(--btn-primary-fg) transition-colors hover:bg-(--btn-primary-bg-hover)"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 dark">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please try again. If this keeps happening, contact support.
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-(--btn-primary-bg) px-4 py-2 text-sm font-medium text-(--btn-primary-fg) transition-colors hover:bg-(--btn-primary-bg-hover)"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Beam — Agentic finance on 0G" },
      {
        name: "description",
        content:
          "Beam is the agentic financial layer on 0G. Hire AI agents for payments, taxes, reports and DeFi.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="dark bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPayRoute = pathname === "/pay" || pathname.startsWith("/pay/");
  const isOnboardingRoute = pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  if (isPayRoute || isOnboardingRoute) {
    return (
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <BeamNetworkProvider>
            <AppProvider>
              <Outlet />
              <Toaster richColors position="bottom-right" theme="dark" />
            </AppProvider>
          </BeamNetworkProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BeamNetworkProvider>
          <AppProvider>
            <OnboardingRedirect>
              <div className="flex h-dvh min-h-0 w-full overflow-hidden">
                <AppSidebar />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <AppHeader />
                  <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    <Outlet />
                  </main>
                </div>
              </div>
            </OnboardingRedirect>
            <Toaster richColors position="bottom-right" theme="dark" />
          </AppProvider>
        </BeamNetworkProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
