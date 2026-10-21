import { chromium } from 'playwright';

async function main() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- 1. Testing HTTP Endpoints ---');

  const endpoints = [
    { path: '/', expectedMime: 'text/html' },
    { path: '/robots.txt', expectedMime: 'text/plain' },
    { path: '/sitemap.xml', expectedMime: 'application/xml' },
    { path: '/manifest.webmanifest', expectedMime: 'application/manifest+json' },
    { path: '/icon.svg', expectedMime: 'image/svg+xml' },
    { path: '/favicon.ico', expectedMime: 'image/x-icon' },
    { path: '/apple-touch-icon.png', expectedMime: 'image/png' },
    { path: '/og-image.png', expectedMime: 'image/png' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.path}`);
      const ct = res.headers.get('content-type') || '';
      const status = res.status;
      const ok = status === 200;
      console.log(`${ok ? '✓' : '✗'} [${status}] ${ep.path} (Content-Type: ${ct})`);
      if (ep.path === '/robots.txt') {
        const text = await res.text();
        console.log('   robots.txt content:\n   ' + text.trim().split('\n').join('\n   '));
      }
      if (ep.path === '/sitemap.xml') {
        const text = await res.text();
        console.log('   sitemap.xml snippet:\n   ' + text.trim().slice(0, 200) + '...');
      }
    } catch (err: any) {
      console.error(`✗ Error fetching ${ep.path}:`, err.message);
    }
  }

  console.log('\n--- 2. Inspecting Head Metadata via Browser DOM ---');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const metaAudit = await page.evaluate(() => {
    const title = document.title;
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content');
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    const twCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute('content');
    const twCreator = document.querySelector('meta[name="twitter:creator"]')?.getAttribute('content');
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const favicon = document.querySelector('link[rel="icon"]')?.getAttribute('href');
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');
    const jsonLd = document.querySelector('script[type="application/ld+json"]')?.textContent;

    // Check footer for @naphiertech
    const footerText = document.querySelector('footer')?.innerText || '';
    const footerHasNaphier = footerText.includes('Naphier') && footerText.includes('@naphiertech');
    const naphierLink = document.querySelector('footer a[href*="naphiertech"]')?.getAttribute('href');

    return {
      title,
      metaDesc,
      ogTitle,
      ogDesc,
      ogImage,
      twCard,
      twCreator,
      canonical,
      favicon,
      appleIcon,
      hasJsonLd: Boolean(jsonLd),
      jsonLdSnippet: jsonLd?.slice(0, 200),
      footerHasNaphier,
      naphierLink,
    };
  });

  console.log(JSON.stringify(metaAudit, null, 2));

  // Take screenshot of footer
  const footer = page.locator('footer');
  await footer.screenshot({ path: 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c/footer-verified.png' });
  console.log('✓ Captured footer screenshot to footer-verified.png');

  await browser.close();
}

main().catch(console.error);
