import * as React from "react";
import { useApp, formatAddress } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CoinIcon } from "./icons";
import { Copy, KeyRound, Loader2, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";

export function WalletButton() {
  const {
    address,
    balance,
    connect,
    disconnect,
    isStardormAuthed,
    stardormSignIn,
    stardormSignOut,
  } = useApp();
  const [loading, setLoading] = React.useState(false);
  const [signingIn, setSigningIn] = React.useState(false);

  if (!address) {
    return (
      <Button
        size="sm"
        loading={loading}
        onClick={() => {
          setLoading(true);
          try {
            const opened = connect();
            if (opened) {
              toast.success("Wallet", { description: "Choose a wallet in the modal to connect." });
            }
          } catch {
            toast.error("Failed to open wallet");
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        className="font-semibold"
      >
        {!loading ? <Wallet className="h-4 w-4" /> : null}
        {loading ? "Opening…" : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm hover-lift">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pill text-foreground">
            <CoinIcon className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium">{formatAddress(address)}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Wallet</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="text-sm text-muted-foreground">Wallet balance</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-base font-semibold">
            <CoinIcon className="h-4 w-4" />
            {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
            <span className="text-muted-foreground text-sm font-normal">on this network</span>
          </div>
          {import.meta.env.VITE_STARDORM_API_URL && (
            <div className="mt-2 rounded-md border border-border bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
              Stardorm: {isStardormAuthed ? "signed in" : "not signed in"}
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        {import.meta.env.VITE_STARDORM_API_URL && (
          <>
            {!isStardormAuthed ? (
              <DropdownMenuItem
                disabled={signingIn}
                onClick={() => {
                  setSigningIn(true);
                  void stardormSignIn().finally(() => setSigningIn(false));
                }}
              >
                {signingIn ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}{" "}
                {signingIn ? "Signing…" : "Sign in to Stardorm"}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => stardormSignOut()}>
                <KeyRound className="h-4 w-4" /> Sign out of Stardorm
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(address);
            toast.success("Address copied");
          }}
        >
          <Copy className="h-4 w-4" /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            disconnect();
            toast("Wallet disconnected");
          }}
        >
          <LogOut className="h-4 w-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
