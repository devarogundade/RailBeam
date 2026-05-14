/** Escape text for PDF literal strings `(…)`. */
function escPdf(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r\n|\r|\n/g, ' ');
}

/**
 * Single-page PDF (PDF 1.4) with Helvetica, no external deps.
 * Suitable for short lines (wallet hex, numbers, ISO dates).
 */
export function buildLinesPdf(lines: string[]): Buffer {
  const contentChunks: string[] = [];
  let y = 760;
  for (const line of lines) {
    contentChunks.push(
      `BT /F1 10 Tf 48 ${y} Td (${escPdf(line)}) Tj ET`,
    );
    y -= 14;
    if (y < 48) break;
  }
  const streamBody = contentChunks.join('\n');
  const streamBytes = Buffer.from(streamBody, 'latin1');

  const obj1 =
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 =
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
    '/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> ' +
    '/Contents 4 0 R >>\nendobj\n';
  const obj4Head = `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`;
  const obj4Tail = '\nendstream\nendobj\n';

  const parts: Buffer[] = [];
  parts.push(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'));

  const offsets: number[] = [];

  const recordAndPush = (s: string) => {
    const lenSoFar = Buffer.concat(parts).length;
    offsets.push(lenSoFar);
    parts.push(Buffer.from(s, 'latin1'));
  };

  recordAndPush(obj1);
  recordAndPush(obj2);
  recordAndPush(obj3);
  recordAndPush(obj4Head);
  parts.push(streamBytes);
  parts.push(Buffer.from(obj4Tail, 'latin1'));

  const body = Buffer.concat(parts);
  const xrefPos = body.length;

  const xrefLines = [
    'xref',
    `0 ${offsets.length + 1}`,
    '0000000000 65535 f ',
  ];
  for (const off of offsets) {
    xrefLines.push(`${String(off).padStart(10, '0')} 00000 n `);
  }
  xrefLines.push(
    'trailer',
    `<< /Size ${offsets.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefPos),
    '%%EOF',
  );

  return Buffer.concat([body, Buffer.from(xrefLines.join('\n'), 'latin1')]);
}
