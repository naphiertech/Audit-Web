import { NextRequest, NextResponse } from 'next/server';
import { getAuditById } from '@/lib/db';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let audit = getAuditById(id);

    if (!audit) {
      const { searchParams } = new URL(req.url);
      const targetUrl = searchParams.get('url');
      if (targetUrl) {
        try {
          const { runAuditEngine } = await import('@/lib/auditor/engine');
          audit = await runAuditEngine({
            url: targetUrl,
            device: 'desktop',
            forceRerun: false,
          });
        } catch (e) {
          console.warn('Could not auto-generate audit for id/url:', id, targetUrl, e);
        }
      }
    }

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      );
    }

    return NextResponse.json(
      { result: audit },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
