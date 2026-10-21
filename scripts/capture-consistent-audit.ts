import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Audit Workspace in Light Mode (Warm Ivory / Swiss Editorial)
  console.log('1. Capturing Audit Workspace in Light Mode...');
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await lightContext.newPage();
  
  await page.goto('http://localhost:3000/audit/audit_44fce857-c8d', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Viewport screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit-consistent-light-viewport.png'), fullPage: false });
  // Full-page screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit-consistent-light-fullpage.png'), fullPage: true });
  console.log('✓ Light Mode Workspace captured.');

  // 2. Open Export Modal in Light Mode
  console.log('2. Capturing Export Modal...');
  const exportBtn = page.locator('button:has-text("EXPORT SPEC")');
  if (await exportBtn.isVisible()) {
    await exportBtn.click();
    await page.waitForSelector('text=EXPORT SPECIFICATION', { timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit-consistent-export-modal.png'), fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    console.log('✓ Export Modal captured.');
  }

  // 3. Toggle Dark Mode and capture Dark Mode Workspace
  console.log('3. Capturing Audit Workspace in Dark Mode...');
  const themeToggle = page.locator('button[aria-label="Switch theme"]');
  if (await themeToggle.isVisible()) {
    await themeToggle.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit-consistent-dark-viewport.png'), fullPage: false });
    console.log('✓ Dark Mode Workspace captured.');
  }

  // 4. Verify Landing Page is still intact
  console.log('4. Capturing Landing Page...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'landing-verified-after-redesign.png'), fullPage: false });
  console.log('✓ Landing page captured.');

  await browser.close();
  console.log('✓✓ ALL CAPTURES COMPLETE.');
}

main().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
