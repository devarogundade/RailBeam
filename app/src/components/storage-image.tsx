import * as React from "react";
import Storage from "@/lib/storage";

const PLACEHOLDER_SRC = "/images/placeholder.png";

export type StorageImageProps = {
  alt?: string;
  /** May be a direct URL/path or a 0G root hash string (non-direct). */
  src?: string;
  rootHash?: string;
  url?: string;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "alt" | "src">;

function isDirectUrl(value: string): boolean {
  const v = value.trim();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("blob:") ||
    v.startsWith("data:") ||
    v.startsWith("/")
  );
}

function resolvedRootHashFromProps(
  rootHash: string | undefined,
  src: string | undefined,
): string | null {
  const direct =
    typeof rootHash === "string" && rootHash.trim()
      ? rootHash.trim()
      : null;
  if (direct) return direct;

  const s = typeof src === "string" ? src.trim() : "";
  if (!s) return null;
  if (isDirectUrl(s)) return null;

  return s;
}

export function StorageImage({
  alt = "Storage Image",
  src,
  rootHash,
  url,
  ...imgProps
}: StorageImageProps) {
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(
    url?.trim() ?? null,
  );
  /** Blob URLs created from OG downloads (revoked on replace / unmount). */
  const objectUrlRef = React.useRef<string | null>(null);

  const resolvedRootHash = React.useMemo(
    () => resolvedRootHashFromProps(rootHash, src),
    [rootHash, src],
  );

  React.useEffect(() => {
    if (url?.trim()) {
      setResolvedUrl(url.trim());
      return;
    }
    const s = src?.trim() ?? "";
    if (s && isDirectUrl(s)) {
      setResolvedUrl(s);
    }
  }, [url, src]);

  React.useEffect(() => {
    if (url?.trim()) return;

    const s = src?.trim() ?? "";
    if (s && isDirectUrl(s)) return;

    const rh = resolvedRootHash;
    if (!rh) return;

    let cancelled = false;

    (async () => {
      try {
        const buffer = await Storage.download(rh);
        if (cancelled || !buffer) return;

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }

        const next = URL.createObjectURL(new Blob([buffer]));
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }

        objectUrlRef.current = next;
        setResolvedUrl(next);
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [url, src, resolvedRootHash]);

  return (
    <img
      {...imgProps}
      src={resolvedUrl ?? PLACEHOLDER_SRC}
      alt={alt}
    />
  );
}
