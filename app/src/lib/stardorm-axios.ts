import axios, { type InternalAxiosRequestConfig } from "axios";
import { readStoredBeamPreferredChainId } from "./beam-network-storage";
import { getStardormAccessToken } from "./stardorm-auth";
import { stardormClientChainIdRef } from "./stardorm-client-chain";

export function getStardormApiBase(): string | undefined {
  const u = import.meta.env.VITE_STARDORM_API_URL?.trim();
  return u || undefined;
}

/** Axios client for Stardorm backend: `VITE_STARDORM_API_URL` + Bearer JWT when present. */
export const stardormAxios = axios.create({
  headers: { "Content-Type": "application/json" },
});

stardormAxios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const base = getStardormApiBase()?.replace(/\/$/, "");
  if (base) {
    config.baseURL = base;
  }
  const token = getStardormAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  const chainId =
    stardormClientChainIdRef.current ??
    (typeof window !== "undefined" ? readStoredBeamPreferredChainId() : undefined);
  if (chainId != null) {
    config.headers.set("X-Beam-Chain-Id", String(chainId));
  }
  return config;
});
