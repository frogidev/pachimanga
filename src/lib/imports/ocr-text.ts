const APP_CHROME = new Set([
  "library", "updates", "browse", "history", "more", "settings", "search",
  "filter", "sort", "tachimanga", "mihon", "tachiyomi", "my library",
]);

export function cleanOcrLine(line: string): string {
  return line
    .replace(/^[\s•·\-–—\d.,#№%x×+|/\\:;!?]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isOcrJunk(value: string): boolean {
  if (value.length < 4 || value.length > 120) return true;
  const letters = (value.match(/[A-Za-z]/g) || []).length;
  if (letters < 3) return true;
  if (letters / value.length < 0.4) return true;
  if (/^chapter\b/i.test(value)) return true;
  if (/[|;[\]{}<>]/.test(value)) return true;
  if (APP_CHROME.has(value.toLowerCase())) return true;
  return false;
}

export function titlesFromOcrText(text: string, cap = 60): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\n+/)) {
    const cleaned = cleanOcrLine(raw);
    if (!cleaned || isOcrJunk(cleaned)) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= cap) break;
  }
  return out;
}
