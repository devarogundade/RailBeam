import { isOgStorageRef } from "@/scripts/storage";

/** Maps stored image refs to a URL usable in <img>. 0G root hashes use a placeholder until you add a gateway. */
export function displayImageUrl(
  stored: string | undefined | null,
  fallback = "/images/placeholder.png",
): string {
  if (!stored) return fallback;
  if (
    stored.startsWith("http://") ||
    stored.startsWith("https://") ||
    stored.startsWith("blob:") ||
    stored.startsWith("data:")
  ) {
    return stored;
  }
  if (isOgStorageRef(stored)) return fallback;
  return stored || fallback;
}
