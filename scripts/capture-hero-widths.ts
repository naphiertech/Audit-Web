import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const widths = [1024, 1200, 1440];
  
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const hero = page.locator('#top');
    await hero.screenshot({ path: `C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c/hero-${w}.png` });
    await page.close();
  }
  
  await browser.close();
  console.log('Screenshots saved for widths:', widths);
}

main().catch(console.error);
