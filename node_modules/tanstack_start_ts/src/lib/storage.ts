import axios from "axios";
import { getStardormApiBase } from "./stardorm-axios";

const STORAGE_CLIENT = axios.create();

STORAGE_CLIENT.interceptors.request.use((config) => {
  const base = getStardormApiBase()?.replace(/\/$/, "");
  if (base) {
    config.baseURL = base;
  }
  return config;
});

export const OG_STORAGE_PREFIX = "0g-storage:" as const;

export function isOgStorageRef(url: string): boolean {
  return url.startsWith(OG_STORAGE_PREFIX);
}

export function ogRootFromRef(ref: string): string {
  return ref.slice(OG_STORAGE_PREFIX.length);
}

const Storage = {
  /** Download bytes for a `0g-storage:` ref or a raw root hash. */
  async download(ref: string): Promise<ArrayBuffer | null> {
    const normalized = isOgStorageRef(ref) ? ref : `${OG_STORAGE_PREFIX}${ref}`;
    try {
      const response = await STORAGE_CLIENT.get<ArrayBuffer>(
        `/storage/${ogRootFromRef(normalized)}`,
        { responseType: "arraybuffer" },
      );
      return response.data;
    } catch {
      return null;
    }
  },
};

export default Storage;
