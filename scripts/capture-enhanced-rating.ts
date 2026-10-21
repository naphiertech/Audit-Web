import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Test target: load an existing or newly run audit report
  await page.goto('http://localhost:3000/audit/audit_536cffb2-99f', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit-enhanced-rating-light.png'), fullPage: false });

  // Switch to dark theme
  const themeToggle = page.locator('button[aria-label^="Switch to"]').first();
  if (await themeToggle.isVisible()) {
    await themeToggle.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit-enhanced-rating-dark.png'), fullPage: false });
  }

  await browser.close();
  console.log('✓ Enhanced rating screenshots captured successfully.');
}

main().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
