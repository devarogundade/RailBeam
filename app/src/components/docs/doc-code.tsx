import * as React from "react";
import { cn } from "@/lib/utils";

export function DocCode({
  title,
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
        "overflow-hidden rounded-xl border border-border bg-[hsl(0_0%_8%)] shadow-sm",
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
      ) : null}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-[hsl(60_9%_92%)]">
        <code className="font-mono text-[13px]">{children}</code>
      </pre>
    </div>
  );
}
