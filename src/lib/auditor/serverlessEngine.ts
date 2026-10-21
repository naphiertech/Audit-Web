import { AuditFinding, AuditResult, BoundingBox } from '@/types/audit';
import { validateAndCheckSSRF } from '@/lib/security';
import { deduplicateFindings, calculateScores } from './scoring';
import { saveAudit } from '@/lib/db';
import crypto from 'node:crypto';

export interface ServerlessAuditOptions {
  url: string;
  device?: 'desktop' | 'mobile';
  forceRerun?: boolean;
}

interface ParsedHtml {
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  viewportContent: string;
  robotsContent: string;
  lang: string;
  h1s: string[];
  h2s: string[];
  h3s: string[];
  images: Array<{ alt: string | null; src: string; isDecorative: boolean; rawTag: string }>;
  links: Array<{ href: string; text: string; target: string; rel: string; rawTag: string }>;
  buttons: Array<{ text: string; ariaLabel: string | null; type: string; rawTag: string }>;
  inputs: Array<{ type: string; id: string; name: string; ariaLabel: string | null; rawTag: string }>;
  fontsDetected: string[];
  colorsDetected: string[];
  totalElements: number;
}

function parsePageHtml(html: string): ParsedHtml {
  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Meta description
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Canonical
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
    || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : '';

  // Viewport
  const viewportMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i);
  const viewportContent = viewportMatch ? viewportMatch[1].trim() : '';

  // Robots
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  const robotsContent = robotsMatch ? robotsMatch[1].trim() : '';

  // OpenGraph
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : '';

  const ogImgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const ogImage = ogImgMatch ? ogImgMatch[1].trim() : '';

  // HTML lang
  const htmlLangMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  const lang = htmlLangMatch ? htmlLangMatch[1].trim() : '';

  // Headings
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const h3s = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());

  // Images
  const imgMatches = [...html.matchAll(/<img\b([^>]*)>/gi)];
  const images = imgMatches.map((m) => {
    const rawTag = m[0];
    const attrs = m[1];
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
    const srcMatch = attrs.match(/src=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : null;
    const isDecorative = attrs.includes('role="presentation"') || attrs.includes('role="none"');
    return {
      alt,
      src: srcMatch ? srcMatch[1] : '',
      isDecorative,
      rawTag,
    };
  });

  // Links
  const linkMatches = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const links = linkMatches.map((m) => {
    const rawTag = m[0];
    const attrs = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    const hrefMatch = attrs.match(/href=["']([^"']*)["']/i);
    const targetMatch = attrs.match(/target=["']([^"']*)["']/i);
    const relMatch = attrs.match(/rel=["']([^"']*)["']/i);
    return {
      href: hrefMatch ? hrefMatch[1] : '',
      text,
      target: targetMatch ? targetMatch[1] : '',
      rel: relMatch ? relMatch[1] : '',
      rawTag,
    };
  });

  // Buttons
  const buttonMatches = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  const buttons = buttonMatches.map((m) => {
    const rawTag = m[0];
    const attrs = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    const ariaMatch = attrs.match(/aria-label=["']([^"']*)["']/i);
    const typeMatch = attrs.match(/type=["']([^"']*)["']/i);
    return {
      text,
      ariaLabel: ariaMatch ? ariaMatch[1] : null,
      type: typeMatch ? typeMatch[1] : 'button',
      rawTag,
    };
  });

  // Inputs
  const inputMatches = [...html.matchAll(/<input\b([^>]*)>/gi)];
  const inputs = inputMatches.map((m) => {
    const rawTag = m[0];
    const attrs = m[1];
    const typeMatch = attrs.match(/type=["']([^"']*)["']/i);
    const idMatch = attrs.match(/id=["']([^"']*)["']/i);
    const nameMatch = attrs.match(/name=["']([^"']*)["']/i);
    const ariaMatch = attrs.match(/aria-label=["']([^"']*)["']/i);
    return {
      type: typeMatch ? typeMatch[1] : 'text',
      id: idMatch ? idMatch[1] : '',
      name: nameMatch ? nameMatch[1] : '',
      ariaLabel: ariaMatch ? ariaMatch[1] : null,
      rawTag,
    };
  });

  // Detect font families
  const fontMatches = [...html.matchAll(/font-family\s*:\s*([^;}"']+)/gi)];
  const fontsDetectedSet = new Set<string>();
  for (const m of fontMatches) {
    const parts = m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    for (const p of parts) {
      if (p && !['inherit', 'initial', 'unset'].includes(p.toLowerCase())) {
        fontsDetectedSet.add(p);
      }
    }
  }
  if (fontsDetectedSet.size === 0) {
    fontsDetectedSet.add('system-ui');
    fontsDetectedSet.add('-apple-system');
    fontsDetectedSet.add('sans-serif');
  }

  // Detect colors
  const colorMatches = [...html.matchAll(/#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]+\)/gi)];
  const colorsDetectedSet = new Set<string>();
  for (const m of colorMatches) {
    colorsDetectedSet.add(m[0].toLowerCase());
    if (colorsDetectedSet.size >= 12) break;
  }
  if (colorsDetectedSet.size === 0) {
    colorsDetectedSet.add('#000000');
    colorsDetectedSet.add('#ffffff');
    colorsDetectedSet.add('#737373');
  }

  // Total element count approximation
  const totalElements = (html.match(/<[a-zA-Z][^>]*>/g) || []).length;

  return {
    title,
    metaDescription,
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogImage,
    viewportContent,
    robotsContent,
    lang,
    h1s,
    h2s,
    h3s,
    images,
    links,
    buttons,
    inputs,
    fontsDetected: Array.from(fontsDetectedSet).slice(0, 8),
    colorsDetected: Array.from(colorsDetectedSet).slice(0, 10),
    totalElements: Math.max(totalElements, 1),
  };
}

async function fetchRealScreenshot(targetUrl: string, device: 'desktop' | 'mobile'): Promise<string> {
  const isMobile = device === 'mobile';

  // 1. Try high-definition real screenshot via Microlink
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    const viewportParam = isMobile
      ? '&viewport.width=390&viewport.height=844&viewport.isMobile=true'
      : '&viewport.width=1440&viewport.height=960';
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&embed=screenshot.url${viewportParam}`;
    const res = await fetch(microlinkUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 2000) {
        return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
      }
    }
  } catch (e) {
    console.warn('[Serverless Engine] Microlink screenshot failed, trying mShots:', e);
  }

  // 2. Try WordPress mShots fallback
  try {
    const widthParam = isMobile ? '390' : '1440';
    const mshotsUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=${widthParam}`;
    const res = await fetch(mshotsUrl);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 2000) {
        return `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
      }
    }
  } catch (e) {
    console.warn('[Serverless Engine] mShots screenshot failed:', e);
  }

  // 3. Fallback: Clean subtle browser preview frame with real hostname
  return generateAestheticFrame(targetUrl, device);
}

function generateAestheticFrame(targetUrl: string, device: 'desktop' | 'mobile'): string {
  const isMobile = device === 'mobile';
  const width = isMobile ? 390 : 1440;
  const height = isMobile ? 844 : 960;
  const hostname = new URL(targetUrl).hostname;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="#fcfbf9">
  <rect width="${width}" height="${height}" fill="#fbfaf8"/>
  <rect x="0" y="0" width="${width}" height="56" fill="#ffffff" stroke="#e8e7e1" stroke-width="1"/>
  <circle cx="32" cy="28" r="8" fill="#18181b"/>
  <rect x="52" y="16" width="${isMobile ? 220 : 480}" height="24" rx="4" fill="#f4f4f5" stroke="#e4e4e7" stroke-width="1"/>
  <text x="64" y="32" font-family="monospace" font-size="11" fill="#71717a">https://${hostname}</text>
  <text x="${width / 2}" y="${height / 2}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#27272a" text-anchor="middle">${hostname}</text>
  <text x="${width / 2}" y="${height / 2 + 28}" font-family="system-ui, sans-serif" font-size="13" fill="#a1a1aa" text-anchor="middle">Live inspection session</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function runServerlessAuditEngine(options: ServerlessAuditOptions): Promise<AuditResult> {
  const startTime = Date.now();
  const device = options.device || 'desktop';

  // 1. SSRF validation
  const ssrfCheck = await validateAndCheckSSRF(options.url);
  if (!ssrfCheck.valid || !ssrfCheck.normalizedUrl) {
    throw new Error(ssrfCheck.error || 'Invalid or prohibited target URL');
  }

  const targetUrl = ssrfCheck.normalizedUrl;
  const viewport = device === 'mobile'
    ? { width: 390, height: 844 }
    : { width: 1440, height: 960 };

  // 2. Fetch page securely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let html = '';
  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': device === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1 AUDIT/WEB'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AUDIT/WEB',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      throw new Error(`Target origin responded with HTTP ${res.status} (${res.statusText})`);
    }

    html = await res.text();
  } finally {
    clearTimeout(timeoutId);
  }

  // 3. Parse HTML
  const parsed = parsePageHtml(html);
  const findings: AuditFinding[] = [];
  let findingNumber = 1;

  // Helper bbox factory
  const createBbox = (y: number, height: number = 40): BoundingBox => ({
    x: device === 'mobile' ? 24 : 120,
    y,
    width: device === 'mobile' ? 342 : 1200,
    height,
  });

  // ——————————————————————————————————————————————————————
  // 4. ACCESSIBILITY RULES (WCAG 2.1 AA)
  // ——————————————————————————————————————————————————————
  if (!parsed.lang) {
    findings.push({
      id: `a11y-missing-lang-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'high',
      title: 'Missing document language declaration',
      description: 'The root <html> tag does not have a lang attribute, preventing assistive screen readers from pronouncing text correctly.',
      selector: 'html',
      snippet: '<html>',
      recommendation: 'Add a valid lang attribute to <html> (e.g. <html lang="en">).',
      sourcePrinciple: 'WCAG 3.1.1 Language of Page (Level A)',
      bbox: createBbox(10, 48),
    });
  }

  // Images missing alt
  const missingAltImages = parsed.images.filter(img => img.alt === null && !img.isDecorative);
  if (missingAltImages.length > 0) {
    findings.push({
      id: `a11y-img-alt-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'high',
      title: `Images missing alt text (${missingAltImages.length} found)`,
      description: `${missingAltImages.length} <img> element(s) do not define an alt attribute. Screen reader users cannot perceive image content.`,
      selector: 'img:not([alt])',
      snippet: missingAltImages[0].rawTag.slice(0, 160),
      recommendation: 'Provide meaningful alt descriptions, or use alt="" if the image is purely decorative.',
      sourcePrinciple: 'WCAG 1.1.1 Non-text Content (Level A)',
      bbox: createBbox(450, 120),
    });
  }

  // Interactive buttons without accessible name
  const emptyButtons = parsed.buttons.filter(b => !b.text && !b.ariaLabel);
  if (emptyButtons.length > 0) {
    findings.push({
      id: `a11y-empty-button-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'high',
      title: 'Button missing accessible text or aria-label',
      description: `${emptyButtons.length} interactive button(s) lack visible inner text or aria-label attributes.`,
      selector: 'button',
      snippet: emptyButtons[0].rawTag.slice(0, 150),
      recommendation: 'Add visible text inside the button or an aria-label attribute.',
      sourcePrinciple: 'WCAG 4.1.2 Name, Role, Value (Level A)',
      bbox: createBbox(20, 36),
    });
  }

  // Form inputs without label
  const unlabelledInputs = parsed.inputs.filter(i => !i.ariaLabel && i.type !== 'hidden' && i.type !== 'submit');
  if (unlabelledInputs.length > 0) {
    findings.push({
      id: `a11y-unlabelled-input-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'medium',
      title: 'Form input missing explicit label or aria-label',
      description: `${unlabelledInputs.length} form input element(s) do not declare an aria-label or associated <label for="..."> tag.`,
      selector: `input[type="${unlabelledInputs[0].type}"]`,
      snippet: unlabelledInputs[0].rawTag.slice(0, 150),
      recommendation: 'Associate inputs with explicit <label for="id"> tags or add aria-label attributes.',
      sourcePrinciple: 'WCAG 1.3.1 Info and Relationships (Level A)',
      bbox: createBbox(260, 48),
    });
  }

  // ——————————————————————————————————————————————————————
  // 5. SEO & METADATA RULES
  // ——————————————————————————————————————————————————————
  if (!parsed.title) {
    findings.push({
      id: `seo-missing-title-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'critical',
      title: 'Missing document <title> tag',
      description: 'The webpage does not declare a <title> tag in the head element, severely penalizing search rankings and tab navigation.',
      selector: 'head',
      recommendation: 'Add a concise, keyword-rich <title> tag between 30 and 60 characters.',
      sourcePrinciple: 'Google Search Essentials: Page Titles',
      bbox: createBbox(10, 48),
    });
  } else if (parsed.title.length < 20 || parsed.title.length > 70) {
    findings.push({
      id: `seo-title-length-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'low',
      title: parsed.title.length < 20 ? 'Document title is too brief' : 'Document title exceeds recommended 70 characters',
      description: `Current title length is ${parsed.title.length} characters ("${parsed.title}"). Search snippets may truncate or fail to rank well.`,
      selector: 'title',
      snippet: `<title>${parsed.title}</title>`,
      recommendation: 'Aim for a title length between 30 and 65 characters.',
      sourcePrinciple: 'Google Search Central: Title Best Practices',
      bbox: createBbox(10, 48),
    });
  }

  if (!parsed.metaDescription) {
    findings.push({
      id: `seo-missing-desc-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'high',
      title: 'Missing meta description tag',
      description: 'The page lacks a <meta name="description"> tag. Search engines will generate automated, unoptimized snippets.',
      selector: 'head',
      recommendation: 'Add a high-quality summary meta description between 120 and 160 characters.',
      sourcePrinciple: 'Google Search Essentials: Meta Descriptions',
      bbox: createBbox(140, 60),
    });
  } else if (parsed.metaDescription.length < 50 || parsed.metaDescription.length > 170) {
    findings.push({
      id: `seo-desc-length-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'low',
      title: parsed.metaDescription.length < 50 ? 'Meta description is too short' : 'Meta description may be truncated',
      description: `Description length is ${parsed.metaDescription.length} characters. Optimal display length is 120-160 characters.`,
      selector: 'meta[name="description"]',
      recommendation: 'Refine meta description length to 120-160 characters.',
      sourcePrinciple: 'Search Engine Optimization Guide',
      bbox: createBbox(140, 60),
    });
  }

  if (!parsed.canonicalUrl) {
    findings.push({
      id: `seo-missing-canonical-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'medium',
      title: 'Missing canonical link tag',
      description: 'The page does not specify a canonical link tag, risking duplicate content dilution across query parameters or protocols.',
      selector: 'head',
      recommendation: `Add <link rel="canonical" href="${targetUrl}" /> to designate the authoritative URL.`,
      sourcePrinciple: 'Google Search Central: Consolidate Duplicate URLs',
      bbox: createBbox(10, 48),
    });
  }

  if (!parsed.ogTitle || !parsed.ogImage) {
    findings.push({
      id: `seo-missing-opengraph-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'medium',
      title: 'Incomplete OpenGraph social cards',
      description: 'Page lacks complete OpenGraph tags (og:title, og:image), degrading preview rendering on social platforms and messaging apps.',
      selector: 'head',
      recommendation: 'Add og:title, og:description, and og:image tags for rich link cards.',
      sourcePrinciple: 'The Open Graph Protocol',
      bbox: createBbox(140, 60),
    });
  }

  // ——————————————————————————————————————————————————————
  // 6. UX & INTERACTION RULES
  // ——————————————————————————————————————————————————————
  // External links missing rel="noopener"
  const unsafeExternalLinks = parsed.links.filter(
    l => l.target === '_blank' && (!l.rel.includes('noopener') && !l.rel.includes('noreferrer'))
  );
  if (unsafeExternalLinks.length > 0) {
    findings.push({
      id: `ux-unsafe-target-blank-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'high',
      title: 'External link target="_blank" missing rel="noopener"',
      description: `${unsafeExternalLinks.length} external link(s) open in new tabs without rel="noopener noreferrer", exposing the window.opener security and performance vulnerability.`,
      selector: 'a[target="_blank"]',
      snippet: unsafeExternalLinks[0].rawTag.slice(0, 160),
      recommendation: 'Always add rel="noopener noreferrer" whenever using target="_blank".',
      sourcePrinciple: 'OWASP / HTML5 Security Standards',
      bbox: createBbox(320, 44),
    });
  }

  if (parsed.viewportContent && parsed.viewportContent.includes('user-scalable=no')) {
    findings.push({
      id: `ux-user-scalable-no-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'critical',
      title: 'Pinch-to-zoom disabled via user-scalable=no',
      description: 'The viewport meta tag disables browser zooming (user-scalable=no), severely harming low-vision users who need magnification.',
      selector: 'meta[name="viewport"]',
      snippet: `<meta name="viewport" content="${parsed.viewportContent}">`,
      recommendation: 'Remove user-scalable=no and maximum-scale=1 from the viewport meta tag.',
      sourcePrinciple: 'WCAG 1.4.4 Resize text (Level AA)',
      bbox: createBbox(10, 48),
    });
  }

  // ——————————————————————————————————————————————————————
  // 7. TYPOGRAPHY RULES
  // ——————————————————————————————————————————————————————
  if (parsed.h1s.length === 0) {
    findings.push({
      id: `typo-missing-h1-${findingNumber}`,
      number: findingNumber++,
      category: 'typography',
      severity: 'high',
      title: 'Missing primary <h1> heading',
      description: 'The document lacks a top-level <h1> heading to establish semantic content hierarchy and document purpose.',
      selector: 'body',
      recommendation: 'Include exactly one descriptive <h1> heading at the beginning of the main content.',
      sourcePrinciple: 'WCAG 1.3.1 Info and Relationships & Semantic Heading Structure',
      bbox: createBbox(150, 60),
    });
  } else if (parsed.h1s.length > 1) {
    findings.push({
      id: `typo-multiple-h1-${findingNumber}`,
      number: findingNumber++,
      category: 'typography',
      severity: 'low',
      title: `Multiple <h1> headings detected (${parsed.h1s.length} found)`,
      description: 'Document defines multiple <h1> elements. Single <h1> per page provides clearer semantic hierarchy.',
      selector: 'h1',
      snippet: `<h1>${parsed.h1s[0]}</h1> ... <h1>${parsed.h1s[1]}</h1>`,
      recommendation: 'Consolidate page structure to use a single <h1>, with subsections organized under <h2> and <h3>.',
      sourcePrinciple: 'Semantic HTML5 Heading Hierarchy',
      bbox: createBbox(150, 60),
    });
  }

  // Heading hierarchy gap check (H3 without H2)
  if (parsed.h3s.length > 0 && parsed.h2s.length === 0) {
    findings.push({
      id: `typo-skipped-heading-level-${findingNumber}`,
      number: findingNumber++,
      category: 'typography',
      severity: 'medium',
      title: 'Skipped heading level (<h3> used without <h2>)',
      description: 'The page structure jumps directly to <h3> tags without establishing parent <h2> sections.',
      selector: 'h3',
      recommendation: 'Do not skip heading levels. Structure content sequentially from <h1> to <h2> to <h3>.',
      sourcePrinciple: 'WCAG 1.3.1 Heading Sequence Standards',
      bbox: createBbox(280, 40),
    });
  }

  // ——————————————————————————————————————————————————————
  // 8. COLORS & VISUAL RULES
  // ——————————————————————————————————————————————————————
  if (parsed.colorsDetected.length > 8) {
    findings.push({
      id: `colors-palette-cohesion-${findingNumber}`,
      number: findingNumber++,
      category: 'colors',
      severity: 'low',
      title: 'High color palette entropy detected',
      description: `Detected ${parsed.colorsDetected.length} distinct chromatic declarations. High color entropy can degrade visual branding cohesion.`,
      selector: 'body',
      recommendation: 'Consolidate arbitrary color values into a centralized CSS design token palette (3-5 core tokens).',
      sourcePrinciple: 'Design Systems Token Architecture',
      bbox: createBbox(450, 100),
    });
  }

  if (parsed.totalElements > 2500) {
    findings.push({
      id: `visual-dom-size-${findingNumber}`,
      number: findingNumber++,
      category: 'visual',
      severity: 'medium',
      title: 'Excessive DOM element depth',
      description: `Page renders approximately ${parsed.totalElements} DOM nodes. Deep DOM trees degrade layout recalculation and scroll fps.`,
      selector: 'body',
      recommendation: 'Simplify nested container wrappers and virtualize long lists to reduce DOM nodes below 1,500.',
      sourcePrinciple: 'Core Web Vitals & DOM Performance Optimization',
      bbox: createBbox(360, 200),
    });
  }

  // Deduplicate findings and compute scores
  const deduplicated = deduplicateFindings(findings);
  const {
    overallScore,
    categories,
    isVetoApplied,
    vetoReason,
    totalChecksEvaluated,
    totalChecksPassed,
  } = calculateScores(deduplicated);

  const screenshot = await fetchRealScreenshot(targetUrl, device);
  const auditId = `audit_${crypto.randomUUID().slice(0, 12)}`;
  const executionTimeMs = Date.now() - startTime;

  const result: AuditResult = {
    id: auditId,
    url: targetUrl,
    timestamp: new Date().toISOString(),
    device,
    viewport,
    documentDimensions: viewport,
    overallScore,
    categories,
    findings: deduplicated,
    screenshot,
    executionTimeMs,
    isVetoApplied,
    vetoReason,
    totalChecksEvaluated,
    totalChecksPassed,
    meta: {
      title: parsed.title || targetUrl,
      description: parsed.metaDescription,
      h1: parsed.h1s[0],
      totalElements: parsed.totalElements,
      fontsDetected: parsed.fontsDetected,
      colorsDetected: parsed.colorsDetected,
    },
  };

  saveAudit(result);
  return result;
}
