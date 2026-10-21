import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop
  const contextDesk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageDesk = await contextDesk.newPage();
  await pageDesk.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await pageDesk.screenshot({ path: 'data/preview-desktop.png', fullPage: true });
  console.log('✓ Desktop preview captured');

  // Mobile
  const contextMob = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageMob = await contextMob.newPage();
  await pageMob.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await pageMob.screenshot({ path: 'data/preview-mobile.png', fullPage: true });
  console.log('✓ Mobile preview captured');

  await browser.close();
}

capture().catch(console.error);
