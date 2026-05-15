import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-md bg-muted/55 dark:bg-muted/35",
        className,
      )}
      {...props}
    >
      <span
        className="beam-shimmer-highlight pointer-events-none absolute inset-y-0 left-0 block animate-beam-shimmer will-change-transform"
        aria-hidden
      />
    </div>
  );
}

export { Skeleton };
