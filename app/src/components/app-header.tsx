import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { WalletButton } from "./wallet-button";
import { Button } from "@/components/ui/button";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { useMobileSidebar } from "@/lib/mobile-sidebar-context";
import { cn } from "@/lib/utils";
import type { BeamNetworkId } from "@/lib/beam-chain-config";

function NetworkToggle() {
  const { preferredNetwork, setPreferredNetwork } = useBeamNetwork();
  const options: { id: BeamNetworkId; label: string }[] = [
    { id: "testnet", label: "Testnet" },
    { id: "mainnet", label: "Mainnet" },
  ];
  return (
    <div
      className="flex items-center rounded-lg border border-(--btn-border) bg-(--btn-secondary-bg) p-0.5 text-xs font-semibold"
      role="group"
      aria-label="EVM network"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setPreferredNetwork(o.id)}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            preferredNetwork === o.id
              ? "bg-pill text-pill-foreground shadow-sm"
              : "text-(--btn-text-secondary) hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AppHeader() {
  const { open, setOpen } = useMobileSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-app-sidebar"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <nav className="hidden md:flex items-center gap-1 text-sm">
        {[
          { to: "/", label: "Home", exact: true },
          { to: "/marketplace", label: "Marketplace" },
          { to: "/dashboard", label: "Dashboard" },
          { to: "/agents", label: "Agents" },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: !!l.exact }}
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-(--bg-hover) hover:text-foreground data-[status=active]:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <NetworkToggle />
        <WalletButton />
      </div>
    </header>
  );
}
