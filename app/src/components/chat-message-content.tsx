import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";

type ChatMessageContentProps = {
  content: string;
  /** User bubble on primary background — adjusts code/link contrast. */
  variant?: "user" | "agent";
  className?: string;
};

/**
 * Renders chat bubble text with lightweight markdown: **bold**, *italic*, `code`, links, lists.
 */
export function ChatMessageContent({
  content,
  variant = "agent",
  className,
}: ChatMessageContentProps) {
  const isUser = variant === "user";

  return (
    <div
      className={cn(
        "chat-message-md min-w-0 break-words [&_*:first-child]:mt-0 [&_*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: ({ children }) => (
            <p className="mb-1.5 whitespace-pre-wrap last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className={cn("font-semibold", isUser && "text-primary-foreground")}>
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ className: codeClass, children, ...props }) => {
            const isBlock = codeClass?.includes("language-");
            if (isBlock) {
              return (
                <code
                  className={cn(
                    "block overflow-x-auto rounded-md px-2.5 py-2 font-mono text-[12px] leading-snug",
                    isUser
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted text-foreground",
                    codeClass,
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={cn(
                  "rounded px-1 py-0.5 font-mono text-[0.9em]",
                  isUser
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-1.5 overflow-x-auto last:mb-0">{children}</pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                "underline underline-offset-2",
                isUser
                  ? "text-primary-foreground hover:opacity-90"
                  : "text-primary hover:opacity-90",
              )}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-1.5 list-disc space-y-0.5 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-1.5 list-decimal space-y-0.5 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <p className="mb-1 text-base font-semibold last:mb-0">{children}</p>
          ),
          h2: ({ children }) => (
            <p className="mb-1 text-sm font-semibold last:mb-0">{children}</p>
          ),
          h3: ({ children }) => (
            <p className="mb-1 text-sm font-semibold last:mb-0">{children}</p>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "mb-1.5 border-l-2 pl-2.5 last:mb-0",
                isUser ? "border-primary-foreground/40" : "border-border",
              )}
            >
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr
              className={cn(
                "my-2 border-0 border-t",
                isUser ? "border-primary-foreground/30" : "border-border",
              )}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
