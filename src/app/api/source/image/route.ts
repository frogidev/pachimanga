import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withProviderConcurrency } from '@/lib/source/provider-limiter';
import { isRelayConfigured, relayBase, relayToken } from '@/sources/core/relay';

const MAX_URL_LENGTH = 2000;

function failure(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

/**
 * Readable bytes of one WeebCentral page image, for PDF export. Authenticated and relay-only: the
 * relay serves nothing except images a recent WeebCentral pages response listed, so this is not
 * an open image proxy. Without a configured relay there is nothing to forward to.
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('u') || '';
  if (!target || target.length > MAX_URL_LENGTH) return failure(400, 'invalid_image_url');

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return failure(401, 'authentication_required');
  if (!isRelayConfigured()) return failure(404, 'relay_not_configured');

  try {
    const upstream = await withProviderConcurrency(`${user.id}:image`, () => fetch(`${relayBase()}/v1/image?u=${encodeURIComponent(target)}`, {
      headers: { Authorization: `Bearer ${relayToken()}`, Accept: 'image/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    }), 3);
    if (!upstream.ok || !upstream.body) return failure(upstream.status === 404 || upstream.status === 401 ? upstream.status : 502, 'image_unavailable');
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return failure(502, 'image_unavailable');
  }
}
