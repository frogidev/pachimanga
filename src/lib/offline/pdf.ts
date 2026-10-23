/** Dependency-free PDF writer: one JPEG image per page, page size = image size. */

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.88;

/** File-system safe name: separators and reserved characters become spaces. */
export function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "pachimanga";
}

export class ImageNotExportableError extends Error {
  constructor() {
    super('image-not-exportable');
    this.name = 'ImageNotExportableError';
  }
}

async function toJpeg(blob: Blob): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas-unavailable');
    context.fillStyle = '#ffffff'; // JPEG has no alpha; flatten transparent PNG/WebP pages on white.
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!jpeg) throw new Error('jpeg-encode-failed');
    return { bytes: new Uint8Array(await jpeg.arrayBuffer()), width, height };
  } finally {
    bitmap.close();
  }
}

/** Accumulates JPEG pages and serialises a valid PDF 1.4 file. */
export class PdfBuilder {
  private readonly encoder = new TextEncoder();
  private readonly parts: Uint8Array[] = [];
  private readonly offsets: number[] = [0]; // object 0 is the free-list head
  private readonly pageIds: number[] = [];
  private length = 0;
  private next = 3; // objects 1 (catalog) and 2 (page tree) are written last

  constructor() {
    this.push('%PDF-1.4\n');
    this.offsets[1] = 0;
    this.offsets[2] = 0;
  }

  get pageCount() {
    return this.pageIds.length;
  }

  private push(chunk: string | Uint8Array) {
    const bytes = typeof chunk === 'string' ? this.encoder.encode(chunk) : chunk;
    this.parts.push(bytes);
    this.length += bytes.length;
  }

  private startObject(id: number) {
    this.offsets[id] = this.length;
    this.push(`${id} 0 obj\n`);
  }

  addJpegPage(bytes: Uint8Array, width: number, height: number) {
    const imageId = this.next;
    const contentId = this.next + 1;
    const pageId = this.next + 2;
    this.next += 3;
    this.startObject(imageId);
    this.push(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    this.push(bytes);
    this.push('\nendstream\nendobj\n');
    const content = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
    this.startObject(contentId);
    this.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    this.startObject(pageId);
    this.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);
    this.pageIds.push(pageId);
  }

  finish(): Blob {
    if (this.pageIds.length === 0) throw new Error('no-pages');
    this.startObject(1);
    this.push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    this.startObject(2);
    this.push(`<< /Type /Pages /Kids [${this.pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${this.pageIds.length} >>\nendobj\n`);
    const xrefAt = this.length;
    this.push(`xref\n0 ${this.next}\n0000000000 65535 f \n`);
    for (let id = 1; id < this.next; id += 1) this.push(`${String(this.offsets[id]).padStart(10, '0')} 00000 n \n`);
    this.push(`trailer\n<< /Size ${this.next} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
    return new Blob(this.parts as BlobPart[], { type: 'application/pdf' });
  }
}

export async function imagesToPdf(
  images: AsyncIterable<Blob> | Iterable<Blob>,
  onPage?: (done: number) => void,
): Promise<Blob> {
  const pdf = new PdfBuilder();
  for await (const blob of images) {
    const { bytes, width, height } = await toJpeg(blob);
    pdf.addJpegPage(bytes, width, height);
    onPage?.(pdf.pageCount);
  }
  return pdf.finish();
}

/**
 * Fallback for providers whose image host blocks cross-origin reads: open a print view that
 * loads the pages directly and let the browser's "Save as PDF" do the export.
 */
export function openPrintView(urls: string[], title: string, hint: string) {
  const view = window.open('', '_blank');
  if (!view) return false;
  const escape = (value: string) => value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] as string);
  view.document.write(
    `<!doctype html><meta charset="utf-8"><title>${escape(title)}</title>`
    + '<style>@page{margin:0}body{margin:0;background:#fff}img{display:block;width:100%;page-break-after:always;break-after:page}p{font:14px system-ui;padding:12px}@media print{p{display:none}}</style>'
    + `<p>${escape(hint)}</p>`
    + urls.map((url) => `<img referrerpolicy="no-referrer" src="${escape(url)}">`).join(''),
  );
  view.document.close();
  const images = [...view.document.images];
  Promise.all(images.map((image) => (image.complete ? Promise.resolve() : new Promise((resolve) => { image.onload = image.onerror = resolve; }))))
    .then(() => view.print());
  return true;
}
