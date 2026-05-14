import * as React from "react";
import { Link } from "@tanstack/react-router";
import { BeamLogo } from "./icons";
import {
  MessageSquare,
  Store,
  LayoutDashboard,
  Users,
  Settings,
  Send,
  Twitter,
  Github,
} from "lucide-react";
import { useApp } from "@/lib/app-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileSidebar } from "@/lib/mobile-sidebar-context";
import { CLONED_AGENT_AVATAR_RING_CLASS } from "@/lib/cloned-agent-avatar";
import {
  isRegistryTokenIdOneAgent,
  REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
} from "@/lib/registry-token-one-agent";
import { cn } from "@/lib/utils";
import { CoinIcon } from "./icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { to: "/", label: "Conversation", icon: MessageSquare },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "My Agents", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AppSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { hired } = useApp();
  const afterNav = React.useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <BeamLogo />
        <div className="text-lg font-bold tracking-tight">Beam</div>
        <span className="ml-auto flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
          <CoinIcon className="h-3 w-3" />
          0G
        </span>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        <ul className="flex flex-col gap-0.5">
          {navItems.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  activeOptions={{ exact: it.to === "/" }}
                  onClick={afterNav}
                  className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-(--bg-hover) hover:text-foreground data-[status=active]:bg-pill data-[status=active]:text-pill-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Hired Agents
        </div>
        <ul className="flex flex-col gap-0.5">
          {hired.slice(0, 6).map((a) => (
            <li key={a.id}>
              <Link
                to="/agents/$agentId"
                params={{ agentId: a.id }}
                onClick={afterNav}
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-(--bg-hover) hover:text-foreground"
              >
                <span className="relative">
                  <img
                    src={a.avatar}
                    alt=""
                    className={cn(
                      "h-6 w-6 rounded-full bg-pill",
                      isRegistryTokenIdOneAgent(a) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
                      a.isCloned && CLONED_AGENT_AVATAR_RING_CLASS,
                    )}
                  />
                  {a.online === true && (
                    <span className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full bg-success ring-2 ring-background" />
                  )}
                </span>
                <span className="truncate">{a.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto shrink-0">
        <div className="m-3 rounded-lg border border-border bg-surface-elevated p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CoinIcon /> Add 0G
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Top up to hire and pay agents on demand.
          </p>
        </div>

        <div className="flex items-center gap-3 px-5 pb-5 text-muted-foreground">
          <a
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="https://x.com/railbeam_ai"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RailBeam on X"
          >
            <Twitter className="h-3.5 w-3.5" />
          </a>
          <a
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="https://github.com/devarogundade/RailBeam"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RailBeam on GitHub"
          >
            <Github className="h-3.5 w-3.5" />
          </a>
          <a
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="https://t.me/arogundadeibrahim"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
          >
            <Send className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const isMobile = useIsMobile();
  const { open, setOpen } = useMobileSidebar();

  React.useEffect(() => {
    if (!isMobile) setOpen(false);
  }, [isMobile, setOpen]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          id="mobile-app-sidebar"
          side="left"
          className="flex w-[min(100vw,15rem)] max-w-[85vw] flex-col overflow-hidden border-r border-border bg-surface p-0 [&>button]:text-muted-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Beam navigation</SheetTitle>
            <SheetDescription>Main navigation and workspace links.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <AppSidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <aside className="hidden h-dvh min-h-0 w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-surface/40 md:flex">
        <AppSidebarBody />
      </aside>
    </>
  );
}
