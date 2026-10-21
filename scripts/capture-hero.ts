import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  const hero = page.locator('#top');
  await hero.screenshot({ path: 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c/current-hero-render.png' });
  await page.screenshot({ path: 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c/current-hero-fullpage.png', fullPage: false });
  await browser.close();
  console.log('Hero screenshot saved');
}

main().catch(console.error);
