import { NextRequest, NextResponse } from 'next/server';
import { listAuditHistory } from '@/lib/db';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawLimit = searchParams.get('limit');
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 25;
    const limit = Math.min(Math.max(1, isNaN(parsedLimit) ? 25 : parsedLimit), 50);

    const history = listAuditHistory(limit);
    return NextResponse.json(
      { history },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
