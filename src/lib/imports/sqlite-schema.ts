import type { Database, SqlValue } from 'sql.js';

export function columnSet(db: Database, table: string): Set<string> {
  const safe = table.replaceAll('"', '');
  const res = db.exec(`pragma table_info("${safe}")`)[0];
  return new Set(((res?.values || []) as SqlValue[][]).map((row) => String(row[1]).toLowerCase()));
}
