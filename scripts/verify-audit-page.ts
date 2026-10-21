import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/audit/sample-audit-001', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const info = await page.evaluate(() => {
    return {
      title: document.title,
      footerHasNaphier: document.querySelector('footer')?.innerText.includes('@naphiertech'),
      favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href')
    };
  });
  console.log('Audit page info:', JSON.stringify(info, null, 2));
  await browser.close();
}

main().catch(console.error);
