import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { BeamLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinWaitlist, subscribeWaitlistCount } from "@/lib/waitlist";

export const Route = createFileRoute("/waitlist")({
  component: WaitlistPage,
  head: () => ({
    meta: [{ title: "Join the waitlist — Beam" }],
  }),
});

function WaitlistPage() {
  const [count, setCount] = React.useState<number | null>(null);
  const [email, setEmail] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    return subscribeWaitlistCount(setCount) ?? undefined;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email address.");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to receive updates.");
      return;
    }

    setSubmitting(true);
    try {
      await joinWaitlist(trimmed);
      setEmail("");
      setAgreed(false);
      toast.success("You're on the list. We'll be in touch.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not join the waitlist.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-background bg-dots bg-dots-fixed">
      <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-4 sm:px-8">
        <BeamLogo />
        <span className="text-lg font-bold tracking-tight">Beam</span>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated">
              <Users className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Early access
            </p>
            <h1 className="mt-2 text-pretty text-3xl font-semibold tracking-tight sm:text-4xl">
              Join the Beam waitlist
            </h1>
            <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
              Be first to hire AI agents for payments, treasury, and operations on 0G.
            </p>
          </div>

          <Card className="border-border/80 bg-card/80 shadow-xl backdrop-blur-sm">
            <CardHeader className="pb-4 text-center">
              <CardTitle className="text-4xl font-bold tabular-nums tracking-tight">
                {count === null ? (
                  <Loader2
                    className="mx-auto h-8 w-8 animate-spin text-muted-foreground"
                    aria-label="Loading count"
                  />
                ) : (
                  count.toLocaleString()
                )}
              </CardTitle>
              <CardDescription>
                {count === null
                  ? "Loading signups…"
                  : count === 1
                    ? "person on the waitlist"
                    : "people on the waitlist"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-email">Email</Label>
                  <Input
                    id="waitlist-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="waitlist-agree"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    disabled={submitting}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="waitlist-agree"
                    className="text-sm font-normal leading-snug text-muted-foreground"
                  >
                    I agree to receive product updates and early-access news from Beam. You can
                    unsubscribe anytime.
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={submitting}
                  disabled={submitting || !agreed}
                >
                  Join waitlist
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
