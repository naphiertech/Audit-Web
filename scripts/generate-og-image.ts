import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2
  });

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:italic@0;1&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 1200px;
          height: 630px;
          background-color: #f1eee5;
          color: #12130c;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid #d9d4c7;
          position: relative;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #d9d4c7;
          padding-bottom: 24px;
        }
        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .logo-svg {
          width: 36px;
          height: 36px;
        }
        .wordmark {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.05em;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .slash {
          font-family: 'IBM Plex Mono', monospace;
          color: #e84a17;
          font-size: 22px;
        }
        .web-text {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 19px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6c685d;
          border: 1px solid #d9d4c7;
          padding: 6px 14px;
        }
        .content {
          margin-top: 20px;
        }
        .kicker {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #e84a17;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kicker-dot {
          width: 8px;
          height: 8px;
          background: #e84a17;
        }
        .headline {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 64px;
          line-height: 1.02;
          font-weight: 700;
          letter-spacing: -0.04em;
          max-width: 900px;
        }
        .serif-italic {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-weight: 400;
          color: #1f4e3d;
        }
        .desc {
          font-size: 20px;
          color: #434036;
          margin-top: 24px;
          max-width: 780px;
          line-height: 1.45;
        }
        .footer {
          border-top: 1px solid #d9d4c7;
          padding-top: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          color: #6c685d;
        }
        .categories {
          display: flex;
          gap: 18px;
        }
        .author {
          color: #12130c;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-wrap">
          <svg class="logo-svg" viewBox="0 0 32 32">
            <rect x="1.5" y="1.5" width="29" height="29" fill="#f1eee5" stroke="#12130c" stroke-width="2" />
            <path d="M15.5 7.5 L7.5 24.5" stroke="#12130c" stroke-width="2.4" stroke-linecap="square" fill="none" />
            <path d="M15.5 7.5 L23.5 24.5" stroke="#e84a17" stroke-width="2.4" stroke-linecap="square" fill="none" />
            <path d="M10.5 18.5 H20.5" stroke="#12130c" stroke-width="2.4" stroke-linecap="square" fill="none" />
          </svg>
          <div class="wordmark">
            <span>AUDIT</span>
            <span class="slash">/</span>
            <span class="web-text">WEB</span>
          </div>
        </div>
        <div class="badge">A study in evidence — No. 01</div>
      </div>

      <div class="content">
        <div class="kicker">
          <span class="kicker-dot"></span>
          Rendered interface measurement workbench
        </div>
        <h1 class="headline">
          Every interface leaves <span class="serif-italic">evidence.</span>
        </h1>
        <p class="desc">
          Inspect rendered web surfaces across accessibility, experience, visual hierarchy, typography, colors, and metadata. Evidence over opinion.
        </p>
      </div>

      <div class="footer">
        <div class="categories">
          <span>01 A11Y</span> · <span>02 UX</span> · <span>03 VISUAL</span> · <span>04 TYPE</span> · <span>05 COLOR</span> · <span>06 META</span>
        </div>
        <div>
          Crafted by <span class="author">Naphier (@naphiertech)</span>
        </div>
      </div>
    </body>
  </html>`;

  await page.setContent(html);
  await page.waitForTimeout(600); // ensure fonts load
  const buf = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.resolve('public/og-image.png'), buf);
  console.log('✓ Saved og-image.png (1200x630)');
  await browser.close();
}

main().catch(console.error);
