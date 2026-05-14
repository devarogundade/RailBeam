import PDFDocument from 'pdfkit';

const PAGE_W = 612;
const PAGE_H = 792;

/**
 * Single-page letter PDF with Helvetica, one line per entry.
 * Uses PDFKit for correct PDF structure and encoding.
 */
export function buildLinesPdf(lines: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      margin: 0,
      autoFirstPage: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica').fontSize(10);

    let yBottom = 760;
    const x = 48;
    for (const line of lines) {
      if (yBottom < 48) break;
      const baselineFromTop = PAGE_H - yBottom;
      doc.text(line, x, baselineFromTop, {
        width: PAGE_W - x - 48,
        lineBreak: false,
      });
      yBottom -= 14;
    }

    doc.end();
  });
}
