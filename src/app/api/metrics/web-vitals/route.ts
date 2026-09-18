import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const METRICS = new Set(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']);
const RATINGS = new Set(['good', 'needs-improvement', 'poor']);
const ROUTES = new Set(['library', 'browse', 'updates', 'history', 'import', 'settings', 'auth', 'install', 'offline', 'reader', 'manga-detail', 'native-compat', 'other']);
const NAVIGATION_TYPES = new Set(['navigate', 'reload', 'back-forward', 'back-forward-cache', 'prerender', 'restore']);

function privateJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return privateJson({ error: 'Authentication required.' }, 401);

  let input: Record<string, unknown>;
  try {
    input = await request.json() as Record<string, unknown>;
  } catch {
    return privateJson({ error: 'Invalid metric payload.' }, 400);
  }

  const name = typeof input.name === 'string' && METRICS.has(input.name) ? input.name : null;
  const value = typeof input.value === 'number' && Number.isFinite(input.value) && input.value >= 0 && input.value < 10_000_000
    ? input.value
    : null;
  const rating = typeof input.rating === 'string' && RATINGS.has(input.rating) ? input.rating : null;
  const route = typeof input.route === 'string' && ROUTES.has(input.route) ? input.route : 'other';
  const navigationType = typeof input.navigationType === 'string' && NAVIGATION_TYPES.has(input.navigationType)
    ? input.navigationType
    : 'navigate';

  if (!name || value == null || !rating) return privateJson({ error: 'Invalid metric payload.' }, 400);

  // Structured Vercel log only. Deliberately excludes account ID/email, URLs,
  // manga/chapter/provider IDs, user agent, IP-derived fields, and metric IDs.
  console.info(JSON.stringify({
    event: 'pachimanga_web_vital',
    name,
    value: Math.round(value * 1000) / 1000,
    rating,
    route,
    navigationType,
  }));

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
