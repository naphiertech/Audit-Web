import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/audit/audit_44fce857-c8d', { waitUntil: 'networkidle' });
  console.log('Initial page:', page.url());

  // Click the logo
  await page.click('a[aria-label="AUDIT/WEB — home"]');
  await page.waitForURL('http://localhost:3000/', { timeout: 5000 });
  console.log('Successfully navigated to landing page:', page.url());

  await browser.close();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
