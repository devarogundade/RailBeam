import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-surface/40 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_12%,transparent)]">
          <Icon className="h-6 w-6 opacity-90" strokeWidth={1.5} aria-hidden />
        </span>
      ) : null}
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      {description != null && description !== "" ? (
        <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
    </div>
  );
}
