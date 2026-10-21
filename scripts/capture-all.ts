import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Experience (1440x900)
  console.log('1. Capturing 6-Category Desktop View...');
  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await deskContext.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Viewport screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v3-desktop-viewport.png'), fullPage: false });
  // Full-page screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v3-desktop-fullpage.png'), fullPage: true });
  console.log('✓ Desktop captures saved.');

  // 2. Mobile Experience (390x844)
  console.log('2. Capturing 6-Category Mobile View...');
  const mobContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobPage = await mobContext.newPage();
  await mobPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobPage.waitForTimeout(1500);

  await mobPage.screenshot({ path: path.join(ARTIFACT_DIR, 'v3-mobile-viewport.png'), fullPage: false });
  await mobPage.screenshot({ path: path.join(ARTIFACT_DIR, 'v3-mobile-fullpage.png'), fullPage: true });
  await mobContext.close();
  console.log('✓ Mobile captures saved.');

  // 3. Test Export Modal: AGENTS.MD, .CURSORRULES, CLAUDE.MD
  console.log('3. Testing Export Modal with new Cursor & Claude tabs...');
  const exportBtn = page.locator('button:has-text("EXPORT SPEC")');
  if (await exportBtn.isVisible()) {
    await exportBtn.click();
    await page.waitForSelector('text=EXPORT SPECIFICATION', { timeout: 5000 });
    await page.waitForTimeout(500);
    // AGENTS.MD view
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v3-export-agents.png'), fullPage: false });

    // Click .CURSORRULES tab
    const cursorTab = page.locator('button:has-text(".CURSORRULES")');
    if (await cursorTab.isVisible()) {
      await cursorTab.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v3-export-cursorrules.png'), fullPage: false });
      console.log('✓ .cursorrules tab captured.');
    }

    // Click CLAUDE.MD tab
    const claudeTab = page.locator('button:has-text("CLAUDE.MD")');
    if (await claudeTab.isVisible()) {
      await claudeTab.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v3-export-claudemd.png'), fullPage: false });
      console.log('✓ CLAUDE.md tab captured.');
    }

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }

  // 4. Test Category Filter for Search & Metadata (SEO)
  console.log('4. Testing Search & Metadata category filter...');
  const seoRow = page.locator('button:has-text("Search & Metadata")');
  if (await seoRow.isVisible()) {
    await seoRow.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v3-seo-filtered.png'), fullPage: false });
    console.log('✓ SEO filter view captured.');
  }

  await browser.close();
  console.log('✓✓ ALL V3 VERIFICATION CAPTURES COMPLETE.');
}

main().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
