import * as React from "react";
import { cn } from "@/lib/utils";

export function DocResult({
  title = "Example response",
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-emerald-900/40 bg-emerald-950/20 shadow-sm",
        className,
      )}
    >
      <div className="border-b border-emerald-900/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-emerald-200/80">
        {title}
      </div>
      <pre className="max-h-[min(420px,55vh)] overflow-auto p-4 text-[12px] leading-relaxed text-emerald-50/95">
        <code className="font-mono text-[12px]">{children}</code>
      </pre>
    </div>
  );
}
