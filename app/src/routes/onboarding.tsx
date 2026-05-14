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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BeamLogo } from "@/components/icons";
import { setOnboardingComplete } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const STEPS = [
  {
    key: "payments",
    label: "Payment team",
    title: "Create your payment team",
    description:
      "Stand up a treasury workspace for agentic money movement—x402-friendly flows, clear balances, and a single place to watch what agents spend and settle.",
    icon: Users,
    accent: "from-primary/25 via-primary/5 to-transparent",
    links: [{ to: "/dashboard", label: "Open Treasury dashboard" }] as const,
    bullets: [
      "See wallet and agent spend in one financial dashboard",
      "Payments stay traceable as agents work on your behalf",
    ] as const,
  },
  {
    key: "agents",
    label: "Hire agents",
    title: "Hire agents by Agent ID",
    description:
      "Use the standard Agent ID across catalog, chat, and chain so everyone refers to the same specialist—hire for taxes, reporting, DeFi, and more.",
    icon: Bot,
    accent: "from-chart-3/30 via-primary/10 to-transparent",
    links: [
      { to: "/marketplace", label: "Browse marketplace" },
      { to: "/agents", label: "My agents" },
    ] as const,
    bullets: [
      "Pick skills that match the task, then subscribe on-chain",
      "Switch active agents without losing history or receipts",
    ] as const,
  },
  {
    key: "foundation",
    label: "0G foundation",
    title: "Solid foundation on 0G",
    description:
      "Beam is built for agentic finance on 0G: TEE compute for sensitive reasoning, 0G chain for settlement, and 0G storage for durable files and audit trails.",
    icon: Shield,
    accent: "from-success/25 via-chart-2/15 to-transparent",
    links: [] as const,
    bullets: [
      "0G TEE compute for high-trust agent workloads",
      "0G chain for subscriptions, hires, and receipts",
      "0G storage for artifacts, exports, and long-lived context",
    ] as const,
  },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const progress = ((step + 1) / total) * 100;

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

      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <BeamLogo />
          <span className="text-lg font-bold tracking-tight">Beam</span>
        </div>
        <button
          type="button"
          onClick={finish}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Skip tour
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-2 sm:px-6">
        <div className="w-full max-w-lg">
          <nav aria-label="Onboarding progress" className="mb-8">
            <ol className="flex w-full items-center">
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
                          "hidden w-full truncate px-0.5 text-center text-[10px] font-semibold uppercase tracking-wider sm:block",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </span>
                    </li>
                    {i < STEPS.length - 1 ? (
                      <li className="flex h-10 shrink-0 items-center px-1 sm:px-2" aria-hidden>
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

          <Progress value={progress} className="mb-6 h-1.5" />

          <Card
            key={current.key}
            className={cn(
              "border-border/80 bg-card/80 shadow-xl backdrop-blur-sm",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300",
            )}
          >
            <CardHeader className="space-y-4 pb-2">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-elevated shadow-inner">
                  <Icon className="h-7 w-7 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Step {step + 1} of {total}
                  </div>
                  <CardTitle className="text-xl leading-tight sm:text-2xl">{current.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {current.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {current.bullets.map((line) => (
                  <li
                    key={line}
                    className="flex gap-3 text-sm leading-snug text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {current.key === "foundation" && (
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface/50 p-3 sm:grid-cols-3">
                  <FoundationChip icon={Shield} title="TEE compute" subtitle="Trusted execution" />
                  <FoundationChip icon={Link2} title="0G chain" subtitle="Settlement layer" />
                  <FoundationChip icon={Database} title="0G storage" subtitle="Durable data" />
                </div>
              )}

              {current.links.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {current.links.map((l) => (
                    <Button key={l.to} variant="secondary" size="sm" asChild>
                      <Link to={l.to}>{l.label}</Link>
                    </Button>
                  ))}
                </div>
              )}
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
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" className="w-full sm:w-auto" onClick={finish}>
                    <Rocket className="h-4 w-4" />
                    Launch Beam
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            You can revisit flows anytime from the sidebar—wallet, marketplace, and dashboard.
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
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-card/60">
      <Glyph className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-foreground">{title}</div>
        <div className="truncate text-[10px] text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}
