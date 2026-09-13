export const AUTO_SCROLL_MULTIPLIERS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5] as const;

export function calculateScrollDelta(
  speedPxPerSecond: number,
  elapsedMs: number,
): number {
  if (!Number.isFinite(speedPxPerSecond) || speedPxPerSecond < 0) return 0;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return speedPxPerSecond * (elapsedMs / 1000);
}

export function clampElapsedMs(elapsedMs: number, maximum = 100): number {
  return Math.min(Math.max(elapsedMs, 0), maximum);
}

export function effectiveSpeed(baseSpeedPxPerSecond: number, multiplier: number) {
  return Math.max(0, baseSpeedPxPerSecond) * Math.max(0, multiplier);
}

export function nextMultiplier(current: number, direction: 1 | -1) {
  const values = [...AUTO_SCROLL_MULTIPLIERS];
  const closestIndex = values.reduce((best, value, index) =>
    Math.abs(value - current) < Math.abs(values[best] - current) ? index : best,
  0);
  return values[Math.min(values.length - 1, Math.max(0, closestIndex + direction))];
}
