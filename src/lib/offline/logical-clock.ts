const PREFIX = 'pachimanga:logical-clock:';

function parsed(value?: string | null) {
  if (!value) return Number.NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.NaN;
}

function readStored(scope: string) {
  if (typeof window === 'undefined') return Number.NaN;
  const raw = localStorage.getItem(`${PREFIX}${scope}`);
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? value : Number.NaN;
}

function writeStored(scope: string, value: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${PREFIX}${scope}`, String(value));
  } catch {
    // Optional monotonic-clock persistence; ordinary timestamps remain usable.
  }
}

export function observeLogicalClock(scope: string, timestamp?: string | null) {
  const observed = parsed(timestamp);
  if (!Number.isFinite(observed)) return;
  const stored = readStored(scope);
  if (!Number.isFinite(stored) || observed > stored) writeStored(scope, observed);
}

export function nextLogicalTimestamp(scope: string, observed?: string | null, now = Date.now()) {
  const stored = readStored(scope);
  const remote = parsed(observed);
  const candidates = [
    Number.isFinite(now) ? now : 0,
    Number.isFinite(stored) ? stored + 1 : 0,
    Number.isFinite(remote) ? remote + 1 : 0,
  ];
  const next = Math.max(...candidates);
  writeStored(scope, next);
  return new Date(next).toISOString();
}

export function clearLogicalClock(scope: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(`${PREFIX}${scope}`); } catch { /* optional storage */ }
}
