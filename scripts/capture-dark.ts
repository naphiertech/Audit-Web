import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c';

async function main() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/audit/audit_44fce857-c8d', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Capture Dark Mode Workspace
  console.log('1. Switching to Dark Mode and capturing...');
  const themeToggle = page.locator('button[aria-label^="Switch to"]').first();
  if (await themeToggle.isVisible()) {
    await themeToggle.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit-consistent-dark-viewport.png'), fullPage: false });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit-consistent-dark-fullpage.png'), fullPage: true });
    console.log('✓ Dark Mode Workspace captured.');
  }

  await browser.close();
  console.log('✓✓ DARK MODE CAPTURE COMPLETE.');
}

main().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
