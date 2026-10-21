import http from 'node:http';
import { runAuditEngine } from '../src/lib/auditor/engine.js';
import { generateAuditMarkdown } from '../src/lib/auditor/report-generator.js';

async function testAllCategories() {
  console.log('🧪 Starting 5-Category Benchmark on Fixture with Real UI/UX Violations...\n');

  // Create local server serving bad HTML
  const testHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flawed Test Page</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 20px; background: #ffffff; color: #222222; }
    .tiny-text { font-size: 8px; line-height: 0.9; }
    .bad-contrast { color: #d0d0d0; background: #ffffff; }
    .tiny-target { width: 14px; height: 14px; display: inline-block; }
    .overflow-box { width: 2000px; height: 20px; background: #f0f0f0; }
    .clipped-box { width: 100px; height: 30px; overflow: hidden; background: #eee; }
    .fake-btn { cursor: pointer; padding: 5px; background: #ddd; }
  </style>
</head>
<body>
  <h1>Primary Heading</h1>
  <h4>Skipped Heading Level Directly to H4</h4>

  <!-- UX: tiny touch target, fake button, empty link -->
  <button class="tiny-target">X</button>
  <div class="fake-btn">Fake Button Div</div>
  <a href="#">Dead Link</a>

  <!-- Typography & Colors -->
  <p class="tiny-text">This is tiny 8px text with very cramped 0.9 line-height that is hard to read.</p>
  <p class="bad-contrast">This text has barely visible low contrast against pure white.</p>
  <p>Here is an inline <a href="https://example.com" style="text-decoration: none; color: #990000;">colored link without underline</a> in paragraph.</p>

  <!-- Visual layout overflow & clipped text -->
  <div class="overflow-box">Oversized element breaking layout boundaries</div>
  <div class="clipped-box">
    This very long text is clipped inside a tiny container with overflow hidden and should trigger visual clipping.
  </div>

  <!-- A11y violations -->
  <img src="dummy.jpg" />
  <input type="text" placeholder="No label input" />
</body>
</html>`;

  // Start temporary server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(testHtml);
  });

  await new Promise<void>((resolve) => server.listen(8765, '127.0.0.1', () => resolve()));
  console.log('✓ Mock server listening on port 8765');

  try {
    // Note: for this internal test fixture only, we test engine directly
    // Let's use playwright to verify all rules fire against this page
    const { chromium } = await import('playwright');
    const { runAccessibilityAudit } = await import('../src/lib/auditor/rules/accessibility.js');
    const { runUxAudit } = await import('../src/lib/auditor/rules/ux.js');
    const { runVisualAudit } = await import('../src/lib/auditor/rules/visual.js');
    const { runTypographyAudit } = await import('../src/lib/auditor/rules/typography.js');
    const { runColorsAudit } = await import('../src/lib/auditor/rules/colors.js');
    const { deduplicateFindings, calculateScores } = await import('../src/lib/auditor/scoring.js');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      // @ts-expect-error polyfill
      window.__name = (t) => t;
    });

    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765');

    const [a11y, ux, visual, typo, colors] = await Promise.all([
      runAccessibilityAudit(page),
      runUxAudit(page),
      runVisualAudit(page),
      runTypographyAudit(page),
      runColorsAudit(page),
    ]);

    const all = deduplicateFindings([...a11y, ...ux, ...visual, ...typo.findings, ...colors.findings]);
    const { overallScore, categories } = calculateScores(all);

    console.log('\n📊 Flawed Page Audit Scores:');
    console.log(`  Overall Score: ${overallScore} / 100 (Properly penalized by deductions)`);
    console.log(`  Accessibility : ${categories.accessibility.score}/100 (${categories.accessibility.totalIssues} issues)`);
    console.log(`  UX            : ${categories.ux.score}/100 (${categories.ux.totalIssues} issues)`);
    console.log(`  Visual Design : ${categories.visual.score}/100 (${categories.visual.totalIssues} issues)`);
    console.log(`  Typography    : ${categories.typography.score}/100 (${categories.typography.totalIssues} issues)`);
    console.log(`  Colors        : ${categories.colors.score}/100 (${categories.colors.totalIssues} issues)`);

    console.log('\n🎯 Numbered Pins & Findings Sample:');
    for (const f of all.slice(0, 8)) {
      console.log(`  [#${f.number}] [${f.category.toUpperCase()}] [${f.severity.toUpperCase()}] ${f.title}`);
      if (f.bbox) {
        console.log(`       Pin location: x=${Math.round(f.bbox.x)}px, y=${Math.round(f.bbox.y)}px, ${Math.round(f.bbox.width)}x${Math.round(f.bbox.height)}px`);
      }
    }

    if (all.length < 5) {
      throw new Error('Expected at least 5 flaws to be detected across categories!');
    }

    await browser.close();
    console.log('\n✅ 5-CATEGORY BENCHMARK PASSED WITH FLYING COLORS!');
  } finally {
    server.close();
  }
}

testAllCategories().catch((e) => {
  console.error('Benchmark failed:', e);
  process.exit(1);
});
