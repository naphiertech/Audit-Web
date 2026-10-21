const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const detectorCode = fs.readFileSync(
  'C:\\Users\\NaphierNODE\\.gemini\\config\\skills\\impeccable\\scripts\\detector\\detect-antipatterns-browser.js',
  'utf8'
);

async function scanPage(browser, url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });

  // Inject detector script and remove the script tag immediately to avoid polluting DOM text
  await page.evaluate((code) => {
    const s = document.createElement('script');
    s.id = 'impeccable-detector-script';
    s.textContent = code;
    document.documentElement.appendChild(s);
    s.remove();
  }, detectorCode);

  await page.waitForTimeout(400);

  const findings = await page.evaluate(() => {
    if (typeof window.impeccableDetect === 'function') {
      return window.impeccableDetect({ serialize: true, decorate: false });
    }
    return null;
  });

  await page.close();
  return { label, url, findings };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const urls = [
    { url: 'http://localhost:3000/', label: 'Landing Page' },
    { url: 'http://localhost:3000/audit/sample-audit-001', label: 'Audit Page' }
  ];

  const results = [];
  for (const item of urls) {
    const res = await scanPage(browser, item.url, item.label);
    results.push(res);
  }

  await browser.close();

  fs.writeFileSync('scripts/impeccable-results.json', JSON.stringify(results, null, 2));

  let totalGrand = 0;
  for (const res of results) {
    console.log(`\n========================================`);
    console.log(`PAGE: ${res.label} (${res.url})`);
    if (!res.findings) {
      console.log(`No findings returned`);
      continue;
    }
    console.log(`Elements flagged: ${res.findings.length}`);
    const byRule = {};
    let totalRules = 0;
    for (const el of res.findings) {
      for (const f of el.findings) {
        byRule[f.type] = (byRule[f.type] || 0) + 1;
        totalRules++;
      }
    }
    totalGrand += totalRules;
    console.log(`Total rule violations: ${totalRules}`);
    const sorted = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
    for (const [r, count] of sorted) {
      console.log(`  - ${r.padEnd(28)} : ${count}`);
    }
  }
  console.log(`\n>>> GRAND TOTAL ACROSS BOTH PAGES: ${totalGrand} rule violations <<<`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
