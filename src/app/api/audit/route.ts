import { NextRequest, NextResponse } from 'next/server';
import { runAuditEngine } from '@/lib/auditor/engine';
import { getLatestAuditForUrl } from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  const hasBrowserlessKey = Boolean(process.env.BROWSERLESS_API_KEY);
  const hasBrowserlessToken = Boolean(process.env.BROWSERLESS_TOKEN);
  const hasWsEndpoint = Boolean(process.env.BROWSER_WS_ENDPOINT);

  let browserlessTest = 'not_configured';
  const apiKey =
    process.env.BROWSERLESS_API_KEY ||
    process.env.BROWSERLESS_TOKEN ||
    process.env.BROWSERLESS_KEY ||
    process.env.BROWSER_API_KEY;
  const endpoint =
    process.env.BROWSER_WS_ENDPOINT ||
    (apiKey ? `wss://chrome.browserless.io?token=${apiKey}` : null);

  if (endpoint) {
    try {
      const { chromium } = await import('playwright-core');
      const b = await chromium.connectOverCDP(endpoint, { timeout: 8000 });
      browserlessTest = 'connected_successfully';
      await b.close();
    } catch (e: any) {
      browserlessTest = `connection_error: ${e.message}`;
    }
  }

  return NextResponse.json({
    status: 'ok',
    version: '1.1.0-cdp-fix',
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    environment: {
      isVercel: Boolean(process.env.VERCEL),
      hasBrowserlessKey,
      hasBrowserlessToken,
      hasWsEndpoint,
      browserlessTest,
    },
  });
}

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
