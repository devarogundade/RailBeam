import * as React from "react";
import { Toaster as Sonner } from "sonner";

/** Matches Tailwind `md` — toasts at top on narrow viewports, bottom-right on larger screens */
const MD_MIN_WIDTH = 768;

function useResponsiveToasterPosition(): "top-center" | "bottom-right" {
  const [position, setPosition] = React.useState<"top-center" | "bottom-right">(() => {
    if (typeof window === "undefined") return "bottom-right";
    return window.innerWidth < MD_MIN_WIDTH ? "top-center" : "bottom-right";
  });

  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MD_MIN_WIDTH - 1}px)`);
    const apply = () => {
      setPosition(mq.matches ? "top-center" : "bottom-right");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return position;
}

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ position: positionProp, ...props }: ToasterProps) => {
  const responsivePosition = useResponsiveToasterPosition();
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-(--btn-primary-bg) group-[.toast]:text-(--btn-primary-fg) group-[.toast]:hover:bg-(--btn-primary-bg-hover)",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
      position={positionProp ?? responsivePosition}
    />
  );
};

export { Toaster };
