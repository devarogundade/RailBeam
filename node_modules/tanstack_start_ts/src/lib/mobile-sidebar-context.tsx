import * as React from "react";

type MobileSidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileSidebarContext = React.createContext<MobileSidebarContextValue | null>(null);

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen }), [open]);
  return (
    <MobileSidebarContext.Provider value={value}>{children}</MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const ctx = React.useContext(MobileSidebarContext);
  if (!ctx) {
    throw new Error("useMobileSidebar must be used within MobileSidebarProvider");
  }
  return ctx;
}
