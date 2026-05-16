/** Safe filename extension from query (e.g. `png`, `jpg`). */
export function sanitizeStorageDownloadExt(
  raw: string | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const noDot = trimmed.replace(/^\.+/, '');
  if (!/^[a-z0-9][a-z0-9.+_-]{0,15}$/.test(noDot)) return null;
  return noDot;
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  zip: 'application/zip',
  bin: 'application/octet-stream',
};

export function mimeTypeForDownloadExt(ext: string): string {
  return EXT_TO_MIME[ext.toLowerCase()] ?? 'application/octet-stream';
}

export function sniffStorageDownloadMeta(buf: Buffer): {
  ext: string;
  mime: string;
} {
  if (buf.length >= 12) {
    const riff = buf.toString('ascii', 0, 4);
    const webp = buf.toString('ascii', 8, 12);
    if (riff === 'RIFF' && webp === 'WEBP') {
      return { ext: 'webp', mime: 'image/webp' };
    }
    const ftyp = buf.toString('ascii', 4, 8);
    if (ftyp === 'ftyp') {
      const brand = buf.toString('ascii', 8, 12).replace(/\0/g, '').trim();
      if (/^(heic|heix|hevc|hevx|mif1|msf1)$/i.test(brand)) {
        return { ext: 'heic', mime: 'image/heic' };
      }
      if (brand.toLowerCase().startsWith('qt')) {
        return { ext: 'mov', mime: 'video/quicktime' };
      }
      if (/^(isom|iso2|mp41|mp42|avc1|dash|msnv|M4V|m4v)/i.test(brand)) {
        return { ext: 'mp4', mime: 'video/mp4' };
      }
    }
  }

  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  if (buf.length >= 6 && buf.toString('ascii', 0, 3) === 'GIF') {
    return { ext: 'gif', mime: 'image/gif' };
  }

  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === '%PDF') {
    return { ext: 'pdf', mime: 'application/pdf' };
  }

  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) {
    return { ext: 'bmp', mime: 'image/bmp' };
  }

  if (
    buf.length >= 4 &&
    buf[0] === 0x49 &&
    buf[1] === 0x49 &&
    buf[2] === 0x2a &&
    buf[3] === 0x00
  ) {
    return { ext: 'tiff', mime: 'image/tiff' };
  }
  if (
    buf.length >= 4 &&
    buf[0] === 0x4d &&
    buf[1] === 0x4d &&
    buf[2] === 0x00 &&
    buf[3] === 0x2a
  ) {
    return { ext: 'tiff', mime: 'image/tiff' };
  }

  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    return { ext: 'zip', mime: 'application/zip' };
  }

  const head = buf
    .subarray(0, Math.min(buf.length, 256))
    .toString('utf8')
    .trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) {
    if (/<svg[\s>/]/i.test(buf.subarray(0, Math.min(buf.length, 512)).toString('utf8'))) {
      return { ext: 'svg', mime: 'image/svg+xml' };
    }
  }

  return { ext: 'bin', mime: 'application/octet-stream' };
}
