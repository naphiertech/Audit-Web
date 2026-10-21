import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/NaphierNODE/.gemini/antigravity/brain/65dd3b29-697e-485b-bd2e-af1aae93ce7c';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Audit Workspace Desktop (1440x900)
  console.log('1. Capturing Audit Workspace Desktop View...');
  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await deskContext.newPage();
  
  // Go to existing audit report
  await page.goto('http://localhost:3000/audit/audit_44fce857-c8d', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Top viewport screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'workspace-desktop-viewport.png'), fullPage: false });
  // Full-page screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'workspace-desktop-fullpage.png'), fullPage: true });
  console.log('✓ Workspace desktop captures saved.');

  // 2. Open EXPORT SPEC modal
  console.log('2. Testing Workspace Export modal...');
  const exportBtn = page.locator('button:has-text("EXPORT SPEC")');
  if (await exportBtn.isVisible()) {
    await exportBtn.click();
    await page.waitForSelector('text=EXPORT SPECIFICATION', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'workspace-export-modal.png'), fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    console.log('✓ Export modal captured.');
  }

  // 3. Landing Page Desktop (1440x900)
  console.log('3. Capturing Landing Page Desktop View...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'landing-verified-desktop.png'), fullPage: false });
  console.log('✓ Landing page capture saved.');

  await browser.close();
  console.log('✓✓ ALL VERIFICATION SCREENSHOTS SAVED.');
}

main().catch((err) => {
  console.error('Error in verification:', err);
  process.exit(1);
});
