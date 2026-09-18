'use client';

import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

const ALLOWED_NAMES = new Set(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']);

function routeClass(pathname: string) {
  if (pathname.startsWith('/reader/')) return 'reader';
  if (pathname.startsWith('/manga/')) return 'manga-detail';
  if (pathname.startsWith('/native/')) return 'native-compat';
  if (pathname === '/') return 'library';
  if (pathname === '/browse') return 'browse';
  if (pathname === '/updates') return 'updates';
  if (pathname === '/history') return 'history';
  if (pathname === '/import') return 'import';
  if (pathname === '/settings' || pathname === '/account') return 'settings';
  if (pathname.startsWith('/auth')) return 'auth';
  if (pathname === '/install') return 'install';
  if (pathname === '/offline') return 'offline';
  return 'other';
}

export function WebVitalsReporter() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    if (!ALLOWED_NAMES.has(metric.name) || !Number.isFinite(metric.value)) return;
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
      route: routeClass(pathname),
    });

    void fetch('/api/metrics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => {
      // Telemetry is best-effort and must never affect product behavior.
    });
  });

  return null;
}
