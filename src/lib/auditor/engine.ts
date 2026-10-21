import { chromium, Browser, BrowserContext } from 'playwright';
import { AuditFinding, AuditResult } from '@/types/audit';
import { validateAndCheckSSRF, isPrivateOrReservedIP } from '@/lib/security';
import { runAccessibilityAudit } from './rules/accessibility';
import { runUxAudit } from './rules/ux';
import { runVisualAudit } from './rules/visual';
import { runTypographyAudit } from './rules/typography';
import { runColorsAudit } from './rules/colors';
import { runSeoAudit } from './rules/seo';
import { deduplicateFindings, calculateScores } from './scoring';
import { saveAudit } from '@/lib/db';
import { runServerlessAuditEngine } from './serverlessEngine';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import dns from 'node:dns/promises';

export interface AuditOptions {
  url: string;
  device?: 'desktop' | 'mobile';
  forceRerun?: boolean;
}

async function launchBrowser(): Promise<Browser> {
  // 1. If remote WebSocket endpoint or Browserless API key is configured
  const apiKey =
    process.env.BROWSERLESS_API_KEY ||
    process.env.BROWSERLESS_TOKEN ||
    process.env.BROWSERLESS_KEY ||
    process.env.BROWSER_API_KEY;

  const wsEndpoint =
    process.env.BROWSER_WS_ENDPOINT ||
    (apiKey ? `wss://chrome.browserless.io?token=${apiKey}` : null);

  if (wsEndpoint) {
    try {
      console.log('[Auditor] Connecting to remote browser CDP endpoint...');
      const { chromium } = await import('playwright-core');
      const browser = await chromium.connectOverCDP(wsEndpoint, { timeout: 20000 });
      console.log('[Auditor] Successfully connected to remote browser CDP endpoint!');
      return browser;
    } catch (wsErr) {
      console.error('[Auditor] Failed to connect to remote browser endpoint:', wsErr);
    }
  }

  // 2. If running on Vercel / AWS Lambda
  if (process.env.VERCEL) {
    try {
      const chromium = (await import('@sparticuz/chromium')).default;
      const { chromium: playwright } = await import('playwright-core');

      if ('graphicsMode' in chromium) {
        (chromium as any).graphicsMode = false;
      }

      const executablePath = await chromium.executablePath();
      return await playwright.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
        executablePath,
        headless: true,
      });
    } catch (vercelErr) {
      console.warn('[Auditor] Serverless Chromium launch failed on Vercel:', vercelErr);
      throw vercelErr;
    }
  }

  // 3. Local development / Windows / Linux (standard Playwright)
  const { chromium } = await import('playwright');
  return await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions',
    ],
  });
}

export async function runAuditEngine(options: AuditOptions): Promise<AuditResult> {
  const startTime = Date.now();
  const device = options.device || 'desktop';

  // 1. SSRF and URL validation
  const ssrfCheck = await validateAndCheckSSRF(options.url);
  if (!ssrfCheck.valid || !ssrfCheck.normalizedUrl) {
    throw new Error(ssrfCheck.error || 'Invalid or prohibited target URL');
  }

  const targetUrl = ssrfCheck.normalizedUrl;

  const viewport = device === 'mobile'
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 };

  const userAgent = device === 'mobile'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    try {
      browser = await launchBrowser();
    } catch (launchErr: unknown) {
      console.warn('[Auditor] Headless Chromium executable unavailable; engaging serverless inspection engine:', launchErr);
      return await runServerlessAuditEngine(options);
    }

    context = await browser.newContext({
      viewport,
      userAgent,
      deviceScaleFactor: 1,
      isMobile: device === 'mobile',
      hasTouch: device === 'mobile',
      ignoreHTTPSErrors: true,
    });

    // Provide __name polyfill in page context to safeguard against esbuild / bundler name instrumentation
    await context.addInitScript(() => {
      // @ts-expect-error polyfill
      window.__name = (target: any) => target;
      // @ts-expect-error polyfill
      globalThis.__name = (target: any) => target;
    });

    const page = await context.newPage();

    // Enforce explicit viewport on page
    await page.setViewportSize(viewport);

    // Apply CDP Emulation override (forces remote headless browsers like Browserless to respect 1440px / 390px)
    try {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: device === 'mobile',
      });
    } catch {
      // Graceful fallback if CDP session is unavailable
    }

    // Re-verify destination on all network requests and redirects for SSRF
    await page.route('**/*', async (route) => {
      const requestUrl = route.request().url();
      try {
        const u = new URL(requestUrl);
        if (u.protocol === 'data:' || u.protocol === 'blob:') {
          await route.continue();
          return;
        }

        const host = u.hostname.toLowerCase();
        if (
          host === 'localhost' ||
          host.endsWith('.localhost') ||
          host.endsWith('.local') ||
          host === '127.0.0.1' ||
          host === '::1' ||
          host === '169.254.169.254'
        ) {
          await route.abort('blockedbyclient');
          return;
        }

        // Fast IP check if host is IP
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && isPrivateOrReservedIP(host)) {
          await route.abort('blockedbyclient');
          return;
        }

        await route.continue();
      } catch {
        await route.abort('blockedbyclient');
      }
    });

    // Navigate with 25 second timeout
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    // Wait a brief period for fonts, client hydration, and layout settling
    await page.waitForTimeout(2000);

    // Extract meta information
    const pageMeta = await page.evaluate(() => {
      const title = document.title || '';
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const totalElements = document.querySelectorAll('*').length;
      return { title, description: metaDesc, h1, totalElements };
    });

    // Extract document dimensions for accurate full-page pin calibration
    const documentDimensions = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const width = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0, window.innerWidth);
      const height = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0, window.innerHeight);
      return { width, height };
    });

    // Take full page screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: 'png',
    });
    const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

    // Read actual PNG dimensions directly from image header to guarantee 100% calibration parity
    let finalWidth = documentDimensions.width;
    let finalHeight = documentDimensions.height;
    if (screenshotBuffer.length >= 24) {
      const pngW = screenshotBuffer.readUInt32BE(16);
      const pngH = screenshotBuffer.readUInt32BE(20);
      if (pngW > 0 && pngH > 0) {
        finalWidth = pngW;
        finalHeight = pngH;
      }
    }
    const verifiedDimensions = { width: finalWidth, height: finalHeight };

    // Execute audit rules
    const [a11yFindings, uxFindings, visualFindings, typoResult, colorsResult, seoFindings] = await Promise.all([
      runAccessibilityAudit(page),
      runUxAudit(page),
      runVisualAudit(page),
      runTypographyAudit(page),
      runColorsAudit(page),
      runSeoAudit(page),
    ]);

    const allFindings: AuditFinding[] = [
      ...a11yFindings,
      ...uxFindings,
      ...visualFindings,
      ...typoResult.findings,
      ...colorsResult.findings,
      ...seoFindings,
    ];

    // Deduplicate and renumber findings 1..N
    const deduplicatedFindings = deduplicateFindings(allFindings);

    // Calculate score deductions and category scores
    const {
      overallScore,
      categories,
      isVetoApplied,
      vetoReason,
      totalChecksEvaluated,
      totalChecksPassed,
    } = calculateScores(deduplicatedFindings);

    const auditId = `audit_${crypto.randomUUID().slice(0, 12)}`;
    const executionTimeMs = Date.now() - startTime;

    const result: AuditResult = {
      id: auditId,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      device,
      viewport,
      documentDimensions: verifiedDimensions,
      overallScore,
      categories,
      findings: deduplicatedFindings,
      screenshot: screenshotBase64,
      executionTimeMs,
      isVetoApplied,
      vetoReason,
      totalChecksEvaluated,
      totalChecksPassed,
      meta: {
        title: pageMeta.title || targetUrl,
        description: pageMeta.description,
        h1: pageMeta.h1,
        totalElements: pageMeta.totalElements,
        fontsDetected: typoResult.fontsDetected,
        colorsDetected: colorsResult.colorsDetected,
      },
    };

    // Save result to local SQLite database
    saveAudit(result);

    return result;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
