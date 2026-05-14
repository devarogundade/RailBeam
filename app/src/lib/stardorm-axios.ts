import axios, { type InternalAxiosRequestConfig } from "axios";
import { getStardormAccessToken } from "./stardorm-auth";

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
  return config;
});
