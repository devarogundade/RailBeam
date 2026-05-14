import * as React from "react";

export type StorageFileProps = {
  /** Suggested filename for the browser download dialog. */
  fileName?: string;
  /** Direct URL (http, https, blob, data, or site-relative). */
  url?: string;
  rootHash?: string;
  /** Non-direct string is treated like `rootHash`. */
  src?: string;
  /**
   * API origin used to build `/storage/:hash` for root hashes.
   * Defaults to `import.meta.env.VITE_STARDORM_API_URL`.
   */
  apiBase?: string;
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">;

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

function defaultApiBase(): string {
  return (import.meta.env.VITE_STARDORM_API_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "";
}

function storageHref(
  apiBase: string | undefined,
  rootHash: string,
): string | null {
  const base = (apiBase ?? defaultApiBase()).replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/${encodeURIComponent(rootHash)}`;
}

export function StorageFile({
  fileName,
  url,
  rootHash,
  src,
  apiBase,
  children,
  download: downloadProp,
  ...anchorProps
}: StorageFileProps) {
  const href = React.useMemo(() => {
    const u = url?.trim();
    if (u) return u;

    const s = src?.trim() ?? "";
    if (s && isDirectUrl(s)) return s;

    const rh = resolvedRootHashFromProps(rootHash, src);
    if (!rh) return null;

    return storageHref(apiBase, rh);
  }, [url, src, rootHash, apiBase]);

  const download =
    downloadProp ??
    (fileName && typeof fileName === "string" && fileName.trim()
      ? fileName.trim()
      : undefined);

  if (!href) return null;

  return (
    <a {...anchorProps} href={href} download={download}>
      {children}
    </a>
  );
}
