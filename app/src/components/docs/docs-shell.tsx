import * as React from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { BeamLogo } from "@/components/icons";
import { docsNavSections } from "@/lib/docs-nav";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu, X } from "lucide-react";

export function DocsShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const scrollResetKey = useRouterState({
    select: (s) => `${s.location.pathname}${s.location.searchStr}`,
  });
  const [mobileNav, setMobileNav] = React.useState(false);
  const docMainRef = React.useRef<HTMLElement>(null);

  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
    docMainRef.current?.scrollTo(0, 0);
  }, [scrollResetKey]);

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="z-40 shrink-0 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[2000px] items-center gap-3 px-4 md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileNav((v) => !v)}
            aria-label={mobileNav ? "Close navigation" : "Open navigation"}
          >
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link to="/" className="flex shrink-0 items-center gap-2 text-foreground hover:opacity-90">
            <BeamLogo />
            <span className="text-sm font-semibold tracking-tight">Beam</span>
          </Link>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">SDK documentation</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              @railbeam/beam-sdk — Stardorm API, subgraph, and wallet auth
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-(--bg-hover) hover:text-foreground sm:px-3"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 md:hidden" aria-hidden />
            Back to app
          </Link>
        </div>
      </header>

      <div className="relative mx-auto flex w-full max-w-[2000px] flex-1 min-h-0 overflow-hidden">
        {/* Mobile drawer */}
        <div
          className={cn(
            "fixed inset-0 z-30 bg-background/80 backdrop-blur-sm transition-opacity md:hidden",
            mobileNav ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!mobileNav}
          onClick={() => setMobileNav(false)}
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[min(88vw,280px)] border-r border-border bg-card transition-transform md:static md:z-0 md:flex md:h-full md:w-64 md:shrink-0 md:translate-x-0 md:flex-col md:self-stretch md:border-r",
            mobileNav ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0",
          )}
        >
          <ScrollArea className="h-[calc(100dvh-3.5rem)] md:h-full md:min-h-0">
            <nav className="space-y-6 p-4 md:p-5" aria-label="Documentation">
              {docsNavSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const active =
                        item.to === "/docs"
                          ? pathname === "/docs" || pathname === "/docs/"
                          : pathname === item.to || pathname.startsWith(`${item.to}/`);
                      const Icon = item.icon;
                      return (
                        <li key={`${section.title}-${item.to}-${item.label}`}>
                          <Link
                            to={item.to as LinkProps["to"]}
                            onClick={() => setMobileNav(false)}
                            className={cn(
                              "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                              active
                                ? "bg-pill text-pill-foreground"
                                : "text-muted-foreground hover:bg-(--bg-hover) hover:text-foreground",
                            )}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
                            <span className="min-w-0">
                              <span className="block font-medium leading-snug">{item.label}</span>
                              <span
                                className={cn(
                                  "mt-0.5 block text-[11px] leading-snug",
                                  active ? "text-pill-foreground/80" : "text-muted-foreground/90",
                                )}
                              >
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        <main
          ref={docMainRef}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain border-border md:border-l"
        >
          <div className="w-full px-4 py-8 md:px-8 md:py-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
