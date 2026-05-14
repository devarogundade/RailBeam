import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  Database,
  Link2,
  Loader2,
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
    lead: "Beam is the workspace where teams hire AI agents to run money and operations—conversation, policy, and settlement meet in one place, with receipts you can stand behind instead of another maze of dashboards and handoffs.",
    icon: Users,
    accent: "from-primary/25 via-primary/5 to-transparent",
    links: [] as const,
    bullets: [
      {
        title: "From intent to execution",
        body: "Describe what you need in plain language; Beam routes work to the right specialists with full context so “get this done” becomes action, not another ticket queue.",
      },
      {
        title: "Operator visibility by default",
        body: "Agents, activity, and outcomes stay in view together—whether you are closing a loop with finance, serving a customer, or running internal operations.",
      },
    ] as const,
  },
  {
    key: "treasury",
    label: "Pay",
    eyebrow: "Step 2 · Treasury",
    title: "Your payment workspace",
    lead: "Treasury is home base for wallets and settlements. When agents spend or settle, it shows up here with a trail you can explain—so product, finance, and partners can share the same picture instead of reconciling exports from three systems.",
    icon: Wallet,
    accent: "from-chart-2/25 via-primary/8 to-transparent",
    links: [{ to: "/dashboard", label: "Open treasury" }] as const,
    bullets: [
      {
        title: "Settlement you can explain",
        body: "Balances, agent activity, and payment status live together so reviews and exceptions are faster—and each movement stays tied to the work it funded.",
      },
      {
        title: "Built for software-led money",
        body: "Flows are designed to be requested, confirmed, and recorded the way modern products expect—not one-off merchant plumbing for every surface.",
      },
    ] as const,
  },
  {
    key: "agents",
    label: "Hire",
    eyebrow: "Step 3 · Agents",
    title: "Hire or clone iNFT agents",
    lead: "The marketplace is where you discover capability; chat is where you steer it. Every specialist carries a standard Agent ID across catalog, conversation, and chain so context and receipts stay aligned no matter where you work.",
    icon: Bot,
    accent: "from-chart-3/30 via-primary/10 to-transparent",
    links: [
      { to: "/marketplace", label: "Marketplace" },
      { to: "/agents", label: "My agents" },
    ] as const,
    bullets: [
      {
        title: "A catalog you can trust",
        body: "Browse offers, compare capabilities, and hire when you are ready—so procurement and product can point at the same roster instead of shadow spreadsheets.",
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
    lead: "Beam is opinionated where money and agents meet, and careful where identity and sensitive operations belong. Under the hood, 0G is a high-throughput EVM network so discovery and settlement can scale with real usage—plus compute and storage when artifacts need to last.",
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
    lead: "Hire agents, run treasury, settle with confidence—the tour is done. Jump into funding, the marketplace, or your roster; you can reopen this walkthrough from the sidebar anytime.",
    icon: Rocket,
    accent: "from-primary/30 via-chart-3/20 to-transparent",
    links: [
      { to: "/dashboard", label: "Treasury" },
      { to: "/marketplace", label: "Marketplace" },
      { to: "/agents", label: "My agents" },
    ] as const,
    bullets: [
      {
        title: "Try the loop once",
        body: "Fund the treasury, open a conversation, run a payment or checkout flow, then confirm the receipt in activity—the same path finance can follow in the UI.",
      },
      {
        title: "Either order works",
        body: "You can hire first and fund when prompted, or fund first and shop the marketplace—pick whichever matches how you like to explore.",
      },
    ] as const,
  },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [leaving, setLeaving] = React.useState(false);
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
    setLeaving(true);
    void Promise.resolve(navigate({ to: "/", replace: true })).finally(() => {
      setLeaving(false);
    });
  }, [navigate]);

  const Icon = current.icon;

  return (
    <div className="relative flex min-h-dvh flex-col bg-background bg-dots bg-dots-fixed">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
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
          disabled={leaving}
          onClick={finish}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {leaving ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          ) : null}
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
                        <p className="text-sm font-normal leading-snug text-foreground sm:text-base">
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
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    loading={leaving}
                    disabled={leaving}
                    onClick={finish}
                  >
                    {!leaving ? <Rocket className="h-4 w-4" /> : null}
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
