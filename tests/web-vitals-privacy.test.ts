import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const reporter = readFileSync(join(ROOT, 'src/components/web-vitals-reporter.tsx'), 'utf8');
const route = readFileSync(join(ROOT, 'src/app/api/metrics/web-vitals/route.ts'), 'utf8');

test('Web Vitals reporting uses coarse routes and excludes account/content identifiers', () => {
  assert.match(reporter, /useReportWebVitals/);
  assert.match(reporter, /routeClass\(pathname\)/);
  assert.doesNotMatch(reporter, /userId|email|mangaId|chapterId|providerId/);
  assert.match(route, /sb\.auth\.getUser\(\)/);
  assert.match(route, /pachimanga_web_vital/);
  assert.doesNotMatch(route, /user\.id|user\.email|request\.headers\.get\(['"]user-agent/);
});

test('Web Vitals reporting keeps one observer callback across soft navigations', () => {
  assert.match(reporter, /useRef\(routeClass\(pathname\)\)/);
  assert.match(reporter, /useCallback(?:<[^>]+>)?\(/);
  assert.match(reporter, /route: initialRoute\.current/);
  assert.match(reporter, /useReportWebVitals\(reportMetric\)/);
  assert.doesNotMatch(reporter, /useReportWebVitals\(\(metric\)/);
});

test('Web Vitals endpoint allowlists metric fields and remains private/no-store', () => {
  assert.match(route, /CLS.*FCP.*FID.*INP.*LCP.*TTFB/s);
  assert.match(route, /Cache-Control': 'private, no-store'/);
  assert.match(route, /Math\.round\(value \* 1000\) \/ 1000/);
});
