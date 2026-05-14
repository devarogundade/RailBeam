import * as React from "react";
import { cn } from "@/lib/utils";

export function DocPageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-10 border-b border-border pb-8">
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>
    </header>
  );
}

export function DocSection({
  id,
  title,
  children,
  className,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground [&>p]:text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function DocProse({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <article
      className={cn(
        "mx-auto w-full max-w-3xl space-y-10 pb-20 pt-2 [&_a]:font-medium [&_a]:text-pill [&_a]:underline-offset-4 hover:[&_a]:text-pill-foreground/90 [&_li]:text-muted-foreground [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_strong]:text-foreground [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2",
        className,
      )}
    >
      {children}
    </article>
  );
}
