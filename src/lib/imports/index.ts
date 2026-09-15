import type { ImportResult } from './types';

const MAX_JSON_BYTES = 10 * 1024 * 1024;

export async function parseBackup(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.tachibk') || name.endsWith('.proto.gz')) {
    const { parseTachiyomi } = await import('./tachiyomi');
    return parseTachiyomi(file);
  }
  if (name.endsWith('.tmb')) {
    const { parseTachimanga } = await import('./tachimanga');
    return parseTachimanga(file);
  }
  if (name.endsWith('.json')) {
    if (file.size > MAX_JSON_BYTES) {
      throw new Error('JSON backup is larger than the 10 MiB safety limit.');
    }
    const { parseJsonBackupText } = await import('./json');
    return parseJsonBackupText(await file.text());
  }
  throw new Error('Supported backups: .tachibk, .proto.gz, .tmb, .json');
}
