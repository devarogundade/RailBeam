import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  Database,
  Link2,
  Rocket,
  Shield,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BeamLogo } from "@/components/icons";
import { setOnboardingComplete } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { PageRoutePending } from "@/components/page-shimmer";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  pendingComponent: () => <PageRoutePending variant="narrow" />,
});

const STEPS = [
  {
    key: "welcome",
    label: "Start",
    eyebrow: "Step 1 · Welcome",
    title: "Welcome to Beam",
    lead: "Beam is your workspace for money that moves with AI agents. Balances, hires, and receipts stay in one place so you always know what happened.",
    icon: Users,
    accent: "from-primary/25 via-primary/5 to-transparent",
    links: [] as const,
    bullets: [
      {
        title: "Built for agentic finance",
        body: "Fund work, watch spend, and keep an audit trail while agents operate on your behalf.",
      },
      {
        title: "You stay in control",
        body: "Nothing runs away in the background without a path you can inspect and reason about.",
      },
    ] as const,
  },
  {
    key: "treasury",
    label: "Pay",
    eyebrow: "Step 2 · Treasury",
    title: "Your payment workspace",
    lead: "Think of the treasury as home base for wallets and settlements. When agents spend or settle, you see it here instead of scattered across apps.",
    icon: Wallet,
    accent: "from-chart-2/25 via-primary/8 to-transparent",
    links: [{ to: "/dashboard", label: "Open treasury" }] as const,
    bullets: [
      {
        title: "One financial dashboard",
        body: "Balances, agent activity, and settlement status show up together so you can act quickly.",
      },
      {
        title: "Traceable flows",
        body: "Payments stay tied to the work they paid for, which makes reviews and handoffs easier.",
      },
    ] as const,
  },
  {
    key: "agents",
    label: "Hire",
    eyebrow: "Step 3 · Agents",
    title: "Hire agents by Agent ID",
    lead: "Every specialist has a standard Agent ID across catalog, chat, and chain. That single ID keeps context and receipts aligned no matter where you work.",
    icon: Bot,
    accent: "from-chart-3/30 via-primary/10 to-transparent",
    links: [
      { to: "/marketplace", label: "Marketplace" },
      { to: "/agents", label: "My agents" },
    ] as const,
    bullets: [
      {
        title: "Match skills to the job",
        body: "Browse the marketplace, compare capabilities, and hire on-chain when you are ready.",
      },
      {
        title: "Switch without losing history",
        body: "Change the active agent for a thread without throwing away prior messages or receipts.",
      },
    ] as const,
  },
  {
    key: "foundation",
    label: "0G",
    eyebrow: "Step 4 · Trust layer",
    title: "Built on 0G for serious workloads",
    lead: "Beam is designed for high-trust agentic finance: compute where reasoning should stay private, a chain layer for money movement, and storage that keeps artifacts durable.",
    icon: Shield,
    accent: "from-success/25 via-chart-2/15 to-transparent",
    links: [] as const,
    bullets: [
      {
        title: "TEE compute when it matters",
        body: "Sensitive agent reasoning can run inside trusted execution so fewer secrets leave the enclave.",
      },
      {
        title: "Chain and storage you can rely on",
        body: "0G chain anchors hires and payments; 0G storage holds exports, files, and long-lived context.",
      },
    ] as const,
    showFoundation: true,
  },
  {
    key: "ready",
    label: "Go",
    eyebrow: "Step 5 · Ready",
    title: "You are set—pick where to start",
    lead: "The tour is done. Jump straight into treasury, shopping for agents, or your roster. You can reopen any of these from the sidebar anytime.",
    icon: Rocket,
    accent: "from-primary/30 via-chart-3/20 to-transparent",
    links: [
      { to: "/dashboard", label: "Treasury" },
      { to: "/marketplace", label: "Marketplace" },
      { to: "/agents", label: "My agents" },
    ] as const,
    bullets: [
      {
        title: "Tip: start with one flow",
        body: "Fund the treasury first, or hire an agent and return to funding when you need to—either order works.",
      },
    ] as const,
  },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const progress = ((step + 1) / total) * 100;

  /** Warm the main shell + home route chunks so leaving the tour does not hitch on first paint. */
  React.useEffect(() => {
    void Promise.all([
      import("@/components/chat"),
      import("@/components/app-sidebar"),
      import("@/components/app-header"),
    ]);
  }, []);

  const finish = React.useCallback(() => {
    setOnboardingComplete();
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  const Icon = current.icon;

  return (
    <div className="relative flex min-h-dvh flex-col bg-background bg-dots">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className={cn(
            "absolute -left-1/4 top-0 h-[420px] w-[70%] rounded-full blur-3xl",
            "bg-linear-to-br opacity-70",
            current.accent,
          )}
        />
        <div className="absolute -right-1/4 bottom-0 h-[360px] w-[60%] rounded-full bg-linear-to-tl from-primary/15 via-transparent to-transparent blur-3xl opacity-80" />
      </div>

      <header className="z-10 flex items-center justify-between px-4 py-4 sm:px-8 sticky top-0">
        <div className="flex items-center gap-2">
          <BeamLogo />
          <span className="text-lg font-bold tracking-tight">Beam</span>
        </div>
        <button
          type="button"
          onClick={finish}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Skip and go to app
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pb-10 pt-2 sm:px-6">
        <div className="w-full max-w-xl">
          <nav aria-label="Onboarding progress" className="mb-6">
            <ol className="flex w-full items-center gap-1 sm:gap-2">
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <React.Fragment key={s.key}>
                    <li className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                          done && "border-primary bg-primary text-primary-foreground",
                          active &&
                          !done &&
                          "border-primary bg-primary/15 text-primary shadow-[0_0_20px_-2px] shadow-primary/40",
                          !active && !done && "border-border bg-card text-muted-foreground",
                        )}
                        aria-current={active ? "step" : undefined}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <span
                        className={cn(
                          "w-full truncate px-0.5 text-center text-[11px] font-semibold uppercase tracking-wider sm:text-xs",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </span>
                    </li>
                    {i < STEPS.length - 1 ? (
                      <li className="flex h-10 shrink-0 items-center px-0.5 sm:px-2" aria-hidden>
                        <div
                          className={cn(
                            "h-0.5 w-full min-w-4 rounded-full",
                            i < step ? "bg-primary" : "bg-border",
                          )}
                        />
                      </li>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </ol>
          </nav>

          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="min-w-0">
              {step === 0
                ? "Five short steps—about a minute."
                : step === total - 1
                  ? "Last step—open the app or jump in below."
                  : `${total - step - 1} more step${total - step - 1 === 1 ? "" : "s"} after this one.`}
            </span>
            <span className="shrink-0 tabular-nums font-medium text-foreground/80">
              {step + 1}/{total}
            </span>
          </div>

          <Progress value={progress} className="mb-6 h-1.5" />

          <Card
            key={current.key}
            className={cn(
              "border-border/80 bg-card/80 shadow-xl backdrop-blur-sm",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300",
            )}
          >
            <CardHeader className="space-y-4 pb-2 sm:pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-elevated shadow-inner">
                  <Icon className="h-7 w-7 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{current.eyebrow}</span>
                  </div>
                  <CardTitle className="text-pretty text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                    {current.title}
                  </CardTitle>
                  <CardDescription className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-[17px] sm:leading-7">
                    {current.lead}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-4">
                {current.bullets.map((item) => (
                  <li
                    key={item.title}
                    className="rounded-xl border border-border/70 bg-surface/40 px-4 py-3 sm:px-5 sm:py-4"
                  >
                    <div className="flex gap-3">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">
                          {item.title}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px] sm:leading-6">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {"showFoundation" in current && current.showFoundation ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    How Beam uses 0G
                  </p>
                  <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-surface/50 p-3 sm:grid-cols-3">
                    <FoundationChip icon={Shield} title="TEE compute" subtitle="Sensitive agent work" />
                    <FoundationChip icon={Link2} title="0G chain" subtitle="Payments & hires" />
                    <FoundationChip icon={Database} title="0G storage" subtitle="Files & audit trail" />
                  </div>
                </div>
              ) : null}

              {current.links.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Jump in anywhere
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {current.links.map((l) => (
                      <Button key={l.to} variant="secondary" size="sm" asChild>
                        <Link to={l.to}>{l.label}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-surface/30 px-6 py-4 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                {step < total - 1 ? (
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                  >
                    Next step
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" className="w-full sm:w-auto" onClick={finish}>
                    <Rocket className="h-4 w-4" />
                    Enter Beam
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            You can open treasury, marketplace, and agents anytime from the sidebar after this tour.
          </p>
        </div>
      </main>
    </div>
  );
}

function FoundationChip({
  icon: Glyph,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string; }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-card/60">
      <Glyph className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-foreground">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{subtitle}</div>
      </div>
    </div>
  );
}
