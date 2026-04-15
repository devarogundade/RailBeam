import { defineStore } from "pinia";
import type { User } from "@railbeam/beam-ts";
import { getBeamSdk } from "@/scripts/beamSdk";
import { getClientApi } from "@/scripts/clientApi";
import type { VirtualCardSummary } from "@/scripts/clientApi";

export type ProfileUri = {
  image: string;
};

export const useProfileStore = defineStore("profile", {
  state: () => ({
    user: null as User | null,
    loading: false,
    error: null as string | null,
    address: null as `0x${string}` | null,
    card: null as VirtualCardSummary | null,
  }),
  actions: {
    setAddress(address: `0x${string}` | null) {
      this.address = address;
    },
    clear() {
      this.user = null;
      this.loading = false;
      this.error = null;
      this.card = null;
    },
    async refresh(address?: `0x${string}` | null) {
      const addr = (address ?? this.address) as `0x${string}` | null;
      this.address = addr;
      this.error = null;
      if (!addr) return;

      this.loading = true;
      try {
        const sdk = getBeamSdk();
        this.user = await sdk.users.getUser({ user: addr });
        const res = await getClientApi().getVirtualCard({ refresh: false });
        this.card = res.card ?? null;
      } catch (e: any) {
        this.error = e?.message ? String(e.message) : "Failed to fetch user profile.";
      } finally {
        this.loading = false;
      }
    },
  },
});

export function normalizeHandle(input: string): string {
  const raw = (input ?? "").trim().toLowerCase();
  const noAt = raw.startsWith("@") ? raw.slice(1) : raw;
  const cleaned = noAt.replace(/[^a-z0-9_]/g, "").slice(0, 24);
  return `@${cleaned}`;
}

export function parseProfileUri(metadataURI: string | null | undefined): ProfileUri {
  const raw = String(metadataURI ?? "").trim();
  if (!raw) return { image: "" };
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return { image: "" };
    const rec = obj as Record<string, unknown>;
    return { image: typeof rec.image === "string" ? rec.image : "" };
  } catch {
    return { image: "" };
  }
}

export function buildProfileUriString(uri: ProfileUri): string {
  return JSON.stringify({ image: uri.image ?? "" });
}

