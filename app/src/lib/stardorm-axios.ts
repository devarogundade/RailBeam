import axios, { type InternalAxiosRequestConfig } from "axios";
import { readStoredBeamPreferredChainId } from "./beam-network-storage";
import { getStardormAccessToken } from "./stardorm-auth";
import { stardormClientChainIdRef } from "./stardorm-client-chain";

export function getStardormApiBase(): string | undefined {
  const u = import.meta.env.VITE_STARDORM_API_URL?.trim();
  return u || undefined;
}

function applyStardormRequestDefaults(config: InternalAxiosRequestConfig) {
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
  /** Let the runtime set `multipart/form-data` with a proper `boundary=` (default JSON Content-Type breaks uploads). */
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
}

/** New axios instance with Stardorm base URL, JWT, and `X-Beam-Chain-Id` (safe to wrap with @x402/axios). */
export function createStardormAxios() {
  const instance = axios.create({
    headers: { "Content-Type": "application/json" },
  });
  instance.interceptors.request.use(applyStardormRequestDefaults);
  return instance;
}

/** Shared Stardorm client for normal API calls (not x402-wrapped). */
export const stardormAxios = createStardormAxios();
