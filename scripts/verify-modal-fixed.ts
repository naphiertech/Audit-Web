import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/audit/audit_536cffb2-99f', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Open Export Modal in Light Mode
  console.log('1. Opening Export Modal in Light Mode...');
  const exportBtn = page.locator('button:has-text("EXPORT SPEC")');
  await exportBtn.click();
  await page.waitForSelector('text=EXPORT SPECIFICATION', { timeout: 5000 });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'export-modal-fixed-light.png'), fullPage: false });
  console.log('✓ Light Mode Export Modal captured.');

  // Click on .CURSORRULES tab
  const cursorTab = page.locator('button:has-text(".CURSORRULES")');
  await cursorTab.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'export-modal-cursor-tab.png'), fullPage: false });

  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 2. Switch to Dark Mode and test Export Modal
  console.log('2. Opening Export Modal in Dark Mode...');
  const themeToggle = page.locator('button[aria-label^="Switch to"]').first();
  await themeToggle.click();
  await page.waitForTimeout(400);

  await exportBtn.click();
  await page.waitForSelector('text=EXPORT SPECIFICATION', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'export-modal-fixed-dark.png'), fullPage: false });
  console.log('✓ Dark Mode Export Modal captured.');

  await browser.close();
  console.log('✓✓ ALL EXPORT MODAL CAPTURES SAVED.');
}

main().catch((err) => {
  console.error('Error during modal verification:', err);
  process.exit(1);
});
