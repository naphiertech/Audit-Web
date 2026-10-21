import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  
  // Desktop 1440
  const page1440 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page1440.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page1440.screenshot({ 
    path: 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c/hero-refined-desktop.png',
    fullPage: false 
  });
  const hero1440 = page1440.locator('#top');
  await hero1440.screenshot({ 
    path: 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c/hero-refined-detail.png' 
  });
  await page1440.close();

  // Tablet 1024
  const page1024 = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page1024.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page1024.screenshot({ 
    path: 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c/hero-refined-tablet.png',
    fullPage: false 
  });
  await page1024.close();

  await browser.close();
  console.log('Final screenshots captured.');
}

main().catch(console.error);
