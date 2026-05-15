import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { BeamLogo } from "./icons";
import { WalletButton } from "./wallet-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { useMobileSidebar } from "@/lib/mobile-sidebar-context";
import { cn } from "@/lib/utils";
import type { BeamNetworkId } from "@/lib/beam-chain-config";

const NETWORK_OPTIONS: { id: BeamNetworkId; label: string }[] = [
  { id: "testnet", label: "Testnet" },
  { id: "mainnet", label: "Mainnet" },
];

function NetworkToggle() {
  const { preferredNetwork, setPreferredNetwork } = useBeamNetwork();
  const activeLabel =
    NETWORK_OPTIONS.find((o) => o.id === preferredNetwork)?.label ?? "Network";

  return (
    <>
      <Select
        value={preferredNetwork}
        onValueChange={(value) => setPreferredNetwork(value as BeamNetworkId)}
      >
        <SelectTrigger
          className="h-8 w-auto min-w-[6.5rem] gap-1 border-(--btn-border) bg-(--btn-secondary-bg) px-2.5 text-xs font-semibold shadow-none md:hidden"
          aria-label="EVM network"
        >
          <SelectValue>{activeLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {NETWORK_OPTIONS.map((o) => (
            <SelectItem key={o.id} value={o.id} className="text-xs font-semibold">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div
        className="hidden items-center rounded-lg border border-(--btn-border) bg-(--btn-secondary-bg) p-0.5 text-xs font-semibold md:flex"
        role="group"
        aria-label="EVM network"
      >
        {NETWORK_OPTIONS.map((o) => (
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
    </>
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
      <Link
        to="/"
        className="flex shrink-0 items-center gap-2 text-foreground hover:opacity-90 md:hidden"
        aria-label="Beam home"
      >
        <BeamLogo className="h-8 w-8" />
      </Link>
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
