import { createWorker } from 'tesseract.js';
import { titlesFromOcrText } from './ocr-text';

export async function extractTitlesFromImage(file: File, onProgress?: (n: number) => void) {
  const worker = await createWorker('eng', 1, { logger: m => { if (m.status === 'recognizing text' && typeof m.progress === 'number') onProgress?.(m.progress) } });
  try {
    const { data } = await worker.recognize(file);
    return titlesFromOcrText(data.text);
  } finally {
    await worker.terminate();
  }
}
