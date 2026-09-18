import assert from 'node:assert/strict';
import test from 'node:test';
import { nextLogicalMillis } from '../src/lib/offline/logical-clock.ts';

test('logical clock advances past a newer remote observation despite local clock skew', () => {
  const remote = Date.parse('2026-09-18T10:00:00.000Z');
  const behindDevice = Date.parse('2026-09-18T09:55:00.000Z');
  assert.equal(nextLogicalMillis(Number.NaN, remote, behindDevice), remote + 1);
});

test('logical clock remains monotonic when wall clock moves backward', () => {
  const previous = Date.parse('2026-09-18T10:00:05.000Z');
  const backwardWallClock = Date.parse('2026-09-18T09:00:00.000Z');
  assert.equal(nextLogicalMillis(previous, Number.NaN, backwardWallClock), previous + 1);
});

test('logical clock uses current wall clock when it is ahead', () => {
  const previous = Date.parse('2026-09-18T10:00:00.000Z');
  const observed = Date.parse('2026-09-18T10:00:01.000Z');
  const now = Date.parse('2026-09-18T10:01:00.000Z');
  assert.equal(nextLogicalMillis(previous, observed, now), now);
});
