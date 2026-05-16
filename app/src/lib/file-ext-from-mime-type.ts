const MIME_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "text/plain": "txt",
  "text/csv": "csv",
};

/** Maps a MIME type to a short file extension for storage download URLs. */
export function fileExtFromMimeType(
  mimeType: string | undefined,
): string | undefined {
  const base = mimeType?.split(";")[0]?.trim().toLowerCase();
  if (!base) return undefined;
  const mapped = MIME_EXTENSION[base];
  if (mapped) return mapped;
  const slash = base.indexOf("/");
  if (slash > 0 && slash < base.length - 1) {
    const sub = base.slice(slash + 1);
    if (/^[\w+-]+$/.test(sub) && sub !== "octet-stream") return sub;
  }
  return undefined;
}

/** Appends `?ext=` so the API can set `Content-Disposition: ...hash.ext`. */
export function appendStorageDownloadExtQuery(
  storageObjectUrl: string,
  mimeType?: string,
): string {
  const ext = fileExtFromMimeType(mimeType);
  if (!ext) return storageObjectUrl;
  const sep = storageObjectUrl.includes("?") ? "&" : "?";
  return `${storageObjectUrl}${sep}ext=${encodeURIComponent(ext)}`;
}
