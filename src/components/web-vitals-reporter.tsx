'use client';

import { useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

const ALLOWED_NAMES = new Set(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']);

type ReportWebVitals = Parameters<typeof useReportWebVitals>[0];

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
  const initialRoute = useRef(routeClass(pathname));

  // Next.js registers Web Vitals observers in an effect keyed by callback identity.
  // Keep this callback stable across soft navigations and attribute page-load vitals
  // to the route that was active when this root-layout reporter mounted.
  const reportMetric = useCallback<ReportWebVitals>((metric) => {
    if (!ALLOWED_NAMES.has(metric.name) || !Number.isFinite(metric.value)) return;
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
      route: initialRoute.current,
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
  }, []);

  useReportWebVitals(reportMetric);

  return null;
}
