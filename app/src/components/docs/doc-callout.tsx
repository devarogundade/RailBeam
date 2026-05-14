import * as React from "react";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle } from "lucide-react";

export function DocCallout({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warning";
  title?: string;
  children: React.ReactNode;
}) {
  const Icon = variant === "warning" ? AlertTriangle : Info;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        variant === "warning"
          ? "border-amber-900/50 bg-amber-950/25 text-amber-50/95"
          : "border-sky-900/40 bg-sky-950/20 text-sky-50/95",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="mb-1 font-medium">{title}</p> : null}
        <div className="min-w-0 text-sm leading-relaxed [&>p]:m-0 [&>p+p]:mt-2">{children}</div>
      </div>
    </div>
  );
}
