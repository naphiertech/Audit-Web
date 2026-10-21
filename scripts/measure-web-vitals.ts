import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Collect performance entries
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime || 0;

    return {
      dnsLookupMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcpHandshakeMs: Math.round(nav.connectEnd - nav.connectStart),
      timeToFirstByteMs: Math.round(nav.responseStart - nav.requestStart),
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      domCompleteMs: Math.round(nav.domComplete - nav.startTime),
      firstContentfulPaintMs: Math.round(fcp),
      totalPageLoadMs: Math.round(nav.loadEventEnd - nav.startTime),
    };
  });

  console.log('Web Vitals & Performance Metrics (Desktop):');
  console.log(JSON.stringify(metrics, null, 2));

  await browser.close();
}

main().catch(console.error);
