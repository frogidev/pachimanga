import { NextResponse } from 'next/server';
import {
  isWeebCentralRelayConfigured,
  probeWeebCentralServer,
} from '@/sources/weebcentral/weebcentral-source';

export const dynamic = 'force-dynamic';

export async function GET() {
  const probe = await probeWeebCentralServer();
  return NextResponse.json(
    {
      configured: isWeebCentralRelayConfigured(),
      reachable: probe.ok,
      transport: probe.transport,
      error: probe.error,
    },
    {
      status: probe.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
