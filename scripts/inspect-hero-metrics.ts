import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  for (const w of [1024, 1200, 1440]) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    const metrics = await page.evaluate(() => {
      const allSpans = Array.from(document.querySelectorAll('span'));
      const premiseSpan = allSpans.find(s => s.textContent === 'The premise');
      const premise = premiseSpan?.parentElement;
      const specimenSpan = allSpans.find(s => s.textContent?.trim() === 'Live specimen');
      const specimen = specimenSpan?.parentElement;

      return {
        premise: premise ? {
          x: premise.getBoundingClientRect().x,
          right: premise.getBoundingClientRect().right,
          width: premise.getBoundingClientRect().width,
          visible: window.getComputedStyle(premise).display !== 'none'
        } : null,
        specimen: specimen ? {
          x: specimen.getBoundingClientRect().x,
          right: specimen.getBoundingClientRect().right,
          width: specimen.getBoundingClientRect().width,
          visible: window.getComputedStyle(specimen).display !== 'none'
        } : null
      };
    });

    console.log(`${w}px:`, JSON.stringify(metrics));
    await page.close();
  }
  await browser.close();
}

main().catch(console.error);
