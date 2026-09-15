import type { ImportResult } from './types';

const MAX_JSON_BYTES = 10 * 1024 * 1024;
const MAX_TMB_BYTES = 256 * 1024 * 1024;

export async function parseBackup(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.tachibk') || name.endsWith('.proto.gz') || name.endsWith('.gz')) {
    const { parseTachiyomi } = await import('./tachiyomi');
    return parseTachiyomi(file);
  }
  if (name.endsWith('.tmb')) {
    if (file.size > MAX_TMB_BYTES) {
      throw new Error('Tachimanga backup is larger than the 256 MiB safety limit.');
    }
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
  throw new Error('Supported backups: .tachibk, .proto.gz/.gz, .tmb, .json');
}
