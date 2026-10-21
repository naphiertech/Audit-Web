import { NextRequest, NextResponse } from 'next/server';
import { runAuditEngine } from '@/lib/auditor/engine';
import { getLatestAuditForUrl } from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, device = 'desktop', forceRerun = false } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Check cached audit if not forcing rerun
    if (!forceRerun) {
      const cached = getLatestAuditForUrl(url, device);
      if (cached) {
        // If cached within the last 15 minutes, return it
        const cacheAgeMs = Date.now() - new Date(cached.timestamp).getTime();
        if (cacheAgeMs < 15 * 60 * 1000) {
          return NextResponse.json({ result: cached, cached: true });
        }
      }
    }

    const result = await runAuditEngine({
      url,
      device: device === 'mobile' ? 'mobile' : 'desktop',
    });

    return NextResponse.json({ result, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Audit API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
