import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Full-width shell matching main app routes (`px-4 py-6 md:px-10 md:py-8`). */
function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 py-6 md:px-10 md:py-8", className)}>{children}</div>;
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-[min(100%,7.5rem)]" />
        <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
      </div>
      <Skeleton className="mt-2 h-7 w-32 max-w-[85%]" />
      <Skeleton className="mt-1.5 h-3 w-48 max-w-full" />
    </div>
  );
}

function ChatMessageRowSkeleton({
  align,
  wide,
}: {
  align: "left" | "right";
  wide?: boolean;
}) {
  const isUser = align === "right";
  const bubble = (
    <div className={cn("flex max-w-[78%] flex-col gap-1.5", isUser && "items-end")}>
      {!isUser ? (
        <>
          <Skeleton className="ml-1 h-3 w-28 max-w-full rounded-md" />
          <Skeleton
            className={cn(
              "rounded-2xl rounded-bl-sm border border-border px-3.5 py-2.5",
              wide ? "h-20 w-[min(100%,20rem)]" : "h-14 w-48",
            )}
          />
        </>
      ) : (
        <>
          <Skeleton
            className={cn(
              "rounded-2xl rounded-br-sm border border-(--border-medium) px-3.5 py-2.5",
              wide ? "h-20 w-[min(100%,20rem)]" : "h-14 w-44",
            )}
          />
          <div className="flex justify-end px-1">
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <>
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          {bubble}
        </>
      ) : (
        <>
          {bubble}
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        </>
      )}
    </div>
  );
}

export function ChatHistorySkeleton() {
  return (
    <div
      className="mx-auto flex max-w-3xl flex-col gap-4 py-6"
      aria-busy="true"
      aria-label="Loading conversation"
    >
      <ChatMessageRowSkeleton align="left" />
      <ChatMessageRowSkeleton align="right" />
      <ChatMessageRowSkeleton align="left" wide />
      <ChatMessageRowSkeleton align="right" />
    </div>
  );
}

/** Shown while TanStack Router `loader` is pending — use as `pendingComponent`. */
export function PageRoutePending({
  variant = "default",
}: {
  variant?: "default" | "narrow" | "chat" | "pay" | "marketplace";
}) {
  if (variant === "pay") {
    return (
      <div className="flex min-h-dvh flex-col bg-[#f6f9fc]">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="bg-[#0a2540] px-6 py-10 lg:w-[min(100%,480px)] lg:px-10 lg:py-12 xl:w-[42%]">
            <PayCheckoutSummarySkeleton />
          </aside>
          <section className="flex flex-1 flex-col bg-white px-6 py-10 sm:px-10 lg:max-w-xl lg:py-12">
            <PayCheckoutPaymentPanelSkeleton />
          </section>
        </div>
      </div>
    );
  }

  if (variant === "chat") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-surface/40 px-3 py-2.5 md:px-5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          <Skeleton className="h-4 w-40 max-w-[min(100%,14rem)]" />
        </div>
        <div className="bg-dots flex-1 overflow-hidden px-4 py-6 md:px-10">
          <ChatHistorySkeleton />
        </div>
        <div className="border-t border-border bg-surface/30 px-4 py-3 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-border bg-surface p-2 md:flex-row md:items-end">
            <div className="flex shrink-0 items-center gap-2 md:contents">
              <Skeleton className="h-9 w-9 shrink-0 rounded-md md:order-first" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            </div>
            <Skeleton className="min-h-10 flex-1 rounded-md md:min-h-9" />
            <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "narrow") {
    return (
      <div className="relative flex min-h-dvh flex-col bg-background bg-dots">
        <div className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-2 sm:px-6">
          <div className="w-full max-w-xl space-y-6">
            <div className="flex w-full items-center gap-1 sm:gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <React.Fragment key={i}>
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <Skeleton className="h-2.5 w-full max-w-16" />
                  </div>
                  {i < 4 ? (
                    <div className="flex h-10 shrink-0 items-center px-0.5 sm:px-2" aria-hidden>
                      <Skeleton className="h-0.5 w-full min-w-4 rounded-full" />
                    </div>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 flex-1 max-w-56" />
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="rounded-xl border border-border/80 bg-card/80 p-6 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-8 w-full max-w-md" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/70 bg-surface/40 px-4 py-3 sm:px-5 sm:py-4">
                    <div className="flex gap-3">
                      <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-[60%] max-w-xs" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-[80%] max-w-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (variant === "marketplace") {
    return (
      <PageShell>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-[min(100%,18rem)] max-w-full md:h-9" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>

          <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-surface p-2.5 sm:gap-3 sm:p-4 md:flex-row md:items-center md:gap-4">
            <Skeleton className="h-9 w-full flex-1 rounded-md md:h-10" />
            <div className="grid grid-cols-2 gap-2 md:hidden">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
            <Skeleton className="h-8 w-full rounded-md md:hidden" />
            <div className="hidden items-center gap-3 md:flex">
              <Skeleton className="h-10 w-52 rounded-md" />
              <Skeleton className="h-10 w-36 rounded-md" />
            </div>
          </div>

          <div className="mt-4 hidden flex-wrap gap-2 md:flex">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-16 shrink-0 rounded-full" />
            ))}
          </div>

          <div className="mt-6">
            <AgentCardGridSkeleton count={6} />
          </div>
        </div>
      </PageShell>
    );
  }

  const max = "max-w-6xl";

  return (
    <PageShell>
      <div className={cn("mx-auto space-y-6", max)}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-[min(100%,20rem)] max-w-full" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <Skeleton className="mt-2 h-9 w-40 shrink-0 rounded-md sm:mt-0" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>

        <div className="space-y-4">
          <div className="flex h-auto min-h-9 w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 min-w-22 flex-1 rounded-md sm:flex-none sm:px-3" />
            ))}
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-1 h-3 w-full max-w-lg" />
            <ul className="mt-3 divide-y divide-border" aria-hidden>
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full max-w-md" />
                  </div>
                  <Skeleton className="h-8 w-28 shrink-0 rounded-md sm:mt-0.5" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export function AgentCardGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
      aria-busy="true"
      aria-label="Loading agents"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="group relative flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-4 w-[min(100%,9rem)]" />
                    <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-24 max-w-full" />
                </div>
                <Skeleton className="mt-0.5 h-4 w-10 shrink-0" />
              </div>
            </div>
          </div>

          <div className="min-h-9 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[88%] max-w-full" />
          </div>

          <div className="flex min-h-6 flex-wrap gap-1">
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-12 rounded-md" />
          </div>

          <div className="flex min-h-5 flex-wrap gap-1">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 shrink-0 rounded-sm" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <ul className="flex flex-col gap-1 px-1 py-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex gap-0.5">
          <div className="flex min-h-11 flex-1 flex-col justify-center gap-1 rounded-lg border border-transparent px-3 py-2.5">
            <Skeleton className="h-4 w-[min(100%,14rem)]" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="w-10 shrink-0 self-stretch rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

export function DashboardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="mt-3 divide-y divide-border text-sm" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <Skeleton className="h-4 w-[min(100%,16rem)]" />
            <Skeleton className="h-3 w-[min(100%,22rem)] max-w-full" />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:justify-end">
            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            <Skeleton className="h-4 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ValidationsListSkeleton() {
  return (
    <ul className="mt-3 max-h-48 space-y-2 overflow-hidden" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-md border border-border bg-surface-elevated p-2">
          <Skeleton className="h-3 w-full max-w-lg" />
          <Skeleton className="mt-1.5 h-3 w-48 max-w-full" />
        </li>
      ))}
    </ul>
  );
}

export function PayCheckoutSummarySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-3 w-24 bg-white/15" />
      <Skeleton className="h-8 w-3/4 max-w-xs bg-white/15" />
      <Skeleton className="h-4 w-full max-w-sm bg-white/10" />
      <Skeleton className="mt-6 h-12 w-40 bg-white/15" />
    </div>
  );
}

export function PayCheckoutPaymentPanelSkeleton() {
  return (
    <div className="w-full space-y-4" aria-hidden>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full max-w-sm" />
      <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}

export function PayCheckoutCardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Skeleton className="h-7 w-[min(100%,18rem)]" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[92%]" />
      </div>
      <div className="mt-2 rounded-xl border border-border bg-background/80 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-9 w-48 max-w-full" />
        <Skeleton className="mt-1.5 h-3 w-full max-w-sm" />
      </div>
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  );
}

export function VirtualCardsPanelSkeleton() {
  return (
    <ul className="mt-4 divide-y divide-border" aria-hidden>
      {Array.from({ length: 2 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-3 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-[min(100%,18rem)]" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-full max-w-lg" />
            </div>
            <Skeleton className="h-6 w-24 shrink-0 sm:pt-0.5" />
          </div>
          <div className="rounded-lg border border-border bg-surface-elevated p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-32 shrink-0 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-3 w-full max-w-md" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-elevated p-3">
              <Skeleton className="h-3 w-28" />
              <div className="mt-2 flex gap-2">
                <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
                <Skeleton className="h-9 w-16 shrink-0 rounded-md" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-elevated p-3">
              <Skeleton className="h-3 w-32" />
              <div className="mt-2 flex gap-2">
                <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
                <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProfileFieldsSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden>
      <div className="flex gap-3">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

/** Text fields under avatar on the settings page while `/me` loads. */
export function SettingsProfileFieldsSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      <div className="grid gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <div className="grid gap-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
  );
}

export function TableAgentRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface" aria-hidden>
      <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface-elevated px-4 py-2.5">
        <Skeleton className="col-span-5 h-2.5 w-12" />
        <Skeleton className="col-span-2 h-2.5 w-16" />
        <Skeleton className="col-span-2 h-2.5 w-20" />
        <Skeleton className="col-span-2 h-2.5 w-10" />
        <Skeleton className="col-span-1 h-2.5 w-14 justify-self-end" />
      </div>
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-b-0"
          >
            <div className="col-span-5 flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-3 w-24 max-w-full" />
              </div>
            </div>
            <Skeleton className="col-span-2 h-4 w-20 max-w-full" />
            <div className="col-span-2 flex items-center gap-2">
              <Skeleton className="h-1.5 w-20 rounded-full" />
              <Skeleton className="h-4 w-6" />
            </div>
            <div className="col-span-2 flex items-center gap-1">
              <Skeleton className="h-3.5 w-3.5 rounded-sm" />
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
