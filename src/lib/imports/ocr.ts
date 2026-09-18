import { titlesFromOcrText } from './ocr-text';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;

async function assertSafeImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image is larger than the 25 MiB OCR safety limit.');
  if (typeof createImageBitmap !== 'function') return;
  const bitmap = await createImageBitmap(file);
  try {
    const pixels = bitmap.width * bitmap.height;
    if (!Number.isFinite(pixels) || pixels > MAX_IMAGE_PIXELS) {
      throw new Error('Image dimensions exceed the 40 megapixel OCR safety limit.');
    }
  } finally {
    bitmap.close();
  }
}

export async function extractTitlesFromImage(file: File, onProgress?: (n: number) => void) {
  await assertSafeImage(file);
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, { logger: m => { if (m.status === 'recognizing text' && typeof m.progress === 'number') onProgress?.(m.progress) } });
  try {
    const { data } = await worker.recognize(file);
    return titlesFromOcrText(data.text);
  } finally {
    await worker.terminate();
  }
}
