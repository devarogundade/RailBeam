import * as React from "react";
import { cn } from "@/lib/utils";
import { highlightDocCode, inferDocCodeLanguage } from "./doc-highlight";

export function DocCode({
  title,
  children,
  className,
  language,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Override language inferred from `title`. */
  language?: "typescript" | "json";
}) {
  const source = typeof children === "string" ? children : String(children);
  const lang = language ?? inferDocCodeLanguage(title);
  const highlighted = React.useMemo(() => highlightDocCode(source, lang), [source, lang]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] shadow-sm",
        className,
      )}
    >
      {title ? (
        <div className="border-b border-[#3c3c3c] bg-[#252526] px-4 py-2 font-mono text-[11px] font-medium tracking-wide text-[#cccccc]">
          {title}
        </div>
      ) : null}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono text-[13px] leading-relaxed">{highlighted}</code>
      </pre>
    </div>
  );
}
