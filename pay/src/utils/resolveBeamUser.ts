import type { Hex } from "viem";
import { getBeamSdk } from "@/scripts/beamSdk";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export type ResolveResult =
  | { ok: true; address: Hex; kind: "address" | "username"; username?: string }
  | { ok: false; error: string };

const cache = new Map<string, Hex>();

export async function resolveBeamAddress(input: string): Promise<ResolveResult> {
  const raw = String(input ?? "").trim();
  if (!raw) return { ok: false, error: "Enter a username or 0x address." };

  if (/^0x/i.test(raw)) {
    const normalized = `0x${raw.slice(2)}`;
    if (!ADDR_RE.test(normalized)) {
      return {
        ok: false,
        error: "That doesn’t look like a valid 0x address (40 hex characters after 0x).",
      };
    }
    return { ok: true, address: normalized.toLowerCase() as Hex, kind: "address" };
  }

  const handle = raw.replace(/^@/, "").trim();
  if (!handle) return { ok: false, error: "Enter a non-empty username." };
  if (/\s/.test(handle)) return { ok: false, error: "Usernames can’t contain spaces." };

  const normalizedHandle = handle.toLowerCase();
  const key = `@${normalizedHandle}`;
  const cached = cache.get(key);
  if (cached) return { ok: true, address: cached, kind: "username", username: normalizedHandle };

  const sdk = getBeamSdk();
  // Some SDK/backends store usernames with "@" prefix; accept both forms.
  const user =
    (await sdk.users.getUserByUsername({ username: `@${normalizedHandle}` }));
  if (!user?.user) return { ok: false, error: `No user found for @${normalizedHandle}.` };

  const addr = String(user.user).toLowerCase() as Hex;
  cache.set(key, addr);
  return { ok: true, address: addr, kind: "username", username: normalizedHandle };
}

