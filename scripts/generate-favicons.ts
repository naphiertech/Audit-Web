import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <style>
    :root {
      --bg: #f1eee5;
      --ink: #12130c;
      --accent: #e84a17;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #12130c;
        --ink: #f4f2ec;
        --accent: #ff5533;
      }
    }
    .box { fill: var(--bg); stroke: var(--ink); stroke-width: 2; }
    .stroke-ink { stroke: var(--ink); stroke-width: 2.4; stroke-linecap: square; stroke-linejoin: miter; fill: none; }
    .stroke-accent { stroke: var(--accent); stroke-width: 2.4; stroke-linecap: square; stroke-linejoin: miter; fill: none; }
  </style>
  <rect class="box" x="1.5" y="1.5" width="29" height="29" />
  <path class="stroke-ink" d="M15.5 7.5 L7.5 24.5" />
  <path class="stroke-accent" d="M15.5 7.5 L23.5 24.5" />
  <path class="stroke-ink" d="M10.5 18.5 H20.5" />
</svg>`;

async function main() {
  const publicDir = path.resolve('public');
  const appDir = path.resolve('src/app');

  // Save SVG icons
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svgContent, 'utf8');
  console.log('✓ Saved icon.svg to public/ and src/app/');

  const browser = await chromium.launch();

  // Helper to render HTML with SVG and capture screenshot
  async function renderIcon(size: number, bg = '#f1eee5', ink = '#12130c', accent = '#e84a17') {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1
    });

    const html = `<!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: ${size}px; height: ${size}px; background: transparent; display: flex; align-items: center; justify-content: center; }
          svg { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <svg viewBox="0 0 32 32">
          <rect x="1.5" y="1.5" width="29" height="29" fill="${bg}" stroke="${ink}" stroke-width="2" />
          <path d="M15.5 7.5 L7.5 24.5" stroke="${ink}" stroke-width="2.4" stroke-linecap="square" fill="none" />
          <path d="M15.5 7.5 L23.5 24.5" stroke="${accent}" stroke-width="2.4" stroke-linecap="square" fill="none" />
          <path d="M10.5 18.5 H20.5" stroke="${ink}" stroke-width="2.4" stroke-linecap="square" fill="none" />
        </svg>
      </body>
    </html>`;

    await page.setContent(html);
    const buf = await page.screenshot({ omitBackground: true });
    await page.close();
    return buf;
  }

  // 1. Generate 32x32 PNG (for favicon-32x32.png and favicon.ico)
  const icon32 = await renderIcon(32);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), icon32);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icon32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icon32);
  console.log('✓ Saved favicon.ico (32x32) to public/ and src/app/');

  // 2. Generate 16x16 PNG
  const icon16 = await renderIcon(16);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), icon16);

  // 3. Generate 180x180 Apple Touch Icon
  const icon180 = await renderIcon(180);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon180);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), icon180);
  console.log('✓ Saved apple-touch-icon.png (180x180)');

  // 4. Generate 192x192 & 512x512 PWA icons
  const icon192 = await renderIcon(192);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
  const icon512 = await renderIcon(512);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
  console.log('✓ Saved PWA manifest icons (192x192 & 512x512)');

  await browser.close();
  console.log('All icons generated successfully!');
}

main().catch(console.error);
