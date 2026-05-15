import * as React from "react";
import { cn } from "@/lib/utils";
import { highlightDocCode } from "./doc-highlight";

export function DocResult({
  title = "Example response",
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const source = typeof children === "string" ? children : String(children);
  const highlighted = React.useMemo(() => highlightDocCode(source, "json"), [source]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] shadow-sm",
        className,
      )}
    >
      <div className="border-b border-[#3c3c3c] bg-[#252526] px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[#4ec9b0]">
        {title}
      </div>
      <pre className="max-h-[min(420px,55vh)] overflow-auto p-4 text-[12px] leading-relaxed">
        <code className="font-mono text-[12px] leading-relaxed">{highlighted}</code>
      </pre>
    </div>
  );
}
