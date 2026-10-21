import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('🚀 Starting Visual & Behavioral Verification for Cloned Landing Page...\n');
  const artifactDir = 'C:\\Users\\NaphierNODE\\.gemini\\antigravity\\brain\\65dd3b29-697e-485b-bd2e-af1aae93ce7c';

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Light Mode
  console.log('[1/5] Inspecting Desktop Light Mode (1440x900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await desktopContext.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait for specimen audit to populate
  await page.waitForTimeout(2000);

  // Smooth scroll through the whole page to trigger all reveal observers
  await page.evaluate(async () => {
    const scrollStep = 400;
    const maxScroll = document.body.scrollHeight;
    for (let y = 0; y <= maxScroll; y += scrollStep) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1000);

  // Take hero screenshot
  await page.screenshot({
    path: path.join(artifactDir, 'landing-desktop-hero.png'),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('  ✓ Captured landing-desktop-hero.png');

  // Full page screenshot
  await page.screenshot({
    path: path.join(artifactDir, 'landing-desktop-fullpage.png'),
    fullPage: true,
  });
  console.log('  ✓ Captured landing-desktop-fullpage.png');

  // Capture Instrument Section
  const instrumentEl = page.locator('#instrument');
  if (await instrumentEl.count() > 0) {
    await instrumentEl.screenshot({
      path: path.join(artifactDir, 'landing-instrument-section.png'),
    });
    console.log('  ✓ Captured landing-instrument-section.png');
  }

  // Capture Category Index with an accordion opened
  const categoryEl = page.locator('#index');
  if (await categoryEl.count() > 0) {
    await categoryEl.screenshot({
      path: path.join(artifactDir, 'landing-category-index.png'),
    });
    console.log('  ✓ Captured landing-category-index.png');
  }

  // 2. Interactive Navigation & Method Section
  console.log('\n[2/5] Testing Interactive Movements in Method Section...');
  const methodEl = page.locator('#method');
  // Click movement 3
  const step3Btn = methodEl.locator('button', { hasText: 'Measure the evidence' });
  if (await step3Btn.count() > 0) {
    await step3Btn.click();
    await page.waitForTimeout(300);
    await methodEl.screenshot({
      path: path.join(artifactDir, 'landing-method-step3.png'),
    });
    console.log('  ✓ Captured landing-method-step3.png (Movement 03 active)');
  }

  // 3. Theme Toggle (Dark Mode)
  console.log('\n[3/5] Testing Theme Switching (Dark Mode)...');
  const themeToggle = page.locator('button[title*="theme"]').first();
  if (await themeToggle.count() > 0) {
    await themeToggle.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(artifactDir, 'landing-dark-hero.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    console.log('  ✓ Captured landing-dark-hero.png');

    if (await instrumentEl.count() > 0) {
      await instrumentEl.screenshot({
        path: path.join(artifactDir, 'landing-dark-instrument.png'),
      });
      console.log('  ✓ Captured landing-dark-instrument.png');
    }
  }

  // 4. Mobile Viewport (390x844)
  console.log('\n[4/5] Testing Mobile Responsiveness (390x844 iPhone 14)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  await mobilePage.screenshot({
    path: path.join(artifactDir, 'landing-mobile-hero.png'),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  });
  console.log('  ✓ Captured landing-mobile-hero.png');

  // Open mobile menu
  const menuBtn = mobilePage.locator('button[aria-controls="mobile-menu"]');
  if (await menuBtn.count() > 0) {
    await menuBtn.click();
    await mobilePage.waitForTimeout(300);
    await mobilePage.screenshot({
      path: path.join(artifactDir, 'landing-mobile-menu.png'),
      clip: { x: 0, y: 0, width: 390, height: 500 },
    });
    console.log('  ✓ Captured landing-mobile-menu.png');
  }

  // 5. Test Live Audit Submission from Landing Page
  console.log('\n[5/5] Testing URL Submission & Playwright Audit Pipeline...');
  const testInput = page.locator('input[name="website"]').first();
  await testInput.fill('https://example.com');
  const submitBtn = page.locator('button[type="submit"]', { hasText: 'Inspect site' }).first();
  await submitBtn.click();

  // Wait for navigation to /audit/[id]
  console.log('  Waiting for Playwright engine to audit and route to /audit/[id]...');
  await page.waitForURL(/\/audit\/audit_/, { timeout: 35000 });
  await page.waitForTimeout(2000);

  console.log(`  ✓ Successfully navigated to: ${page.url()}`);
  await page.screenshot({
    path: path.join(artifactDir, 'landing-audit-navigation.png'),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('  ✓ Captured landing-audit-navigation.png (Full Workspace Live)');

  await browser.close();
  console.log('\n✨ ALL LANDING VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
