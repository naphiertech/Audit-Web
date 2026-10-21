import { NextRequest, NextResponse } from 'next/server';
import { getAuditById } from '@/lib/db';
import { generateAuditMarkdown, generateAiPrompt } from '@/lib/auditor/report-generator';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'markdown';

    const audit = getAuditById(id);
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

    if (format === 'json') {
      return new NextResponse(JSON.stringify(audit, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="AUDIT-${audit.id}.json"`,
          ...CACHE_HEADERS,
        },
      });
    }

    if (format === 'prompt') {
      const prompt = generateAiPrompt(audit);
      return new NextResponse(prompt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          ...CACHE_HEADERS,
        },
      });
    }

    // Default to markdown (AUDIT.md)
    const markdown = generateAuditMarkdown(audit);
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="AUDIT.md"`,
        ...CACHE_HEADERS,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
