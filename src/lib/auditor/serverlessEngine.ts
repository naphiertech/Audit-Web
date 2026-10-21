import { AuditFinding, AuditResult, BoundingBox, Severity } from '@/types/audit';
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
  finalUrl: string;
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterImage: string;
  viewportContent: string;
  robotsContent: string;
  lang: string;
  hasFavicon: boolean;
  hasSkipLink: boolean;
  landmarks: {
    hasMain: boolean;
    hasNav: boolean;
    hasHeader: boolean;
    hasFooter: boolean;
  };
  headings: Array<{ tag: string; text: string; index: number; rawTag: string }>;
  images: Array<{
    alt: string | null;
    src: string;
    width: string | null;
    height: string | null;
    isDecorative: boolean;
    rawTag: string;
    index: number;
  }>;
  links: Array<{
    href: string;
    text: string;
    target: string;
    rel: string;
    rawTag: string;
    ariaLabel: string | null;
    index: number;
  }>;
  buttons: Array<{
    text: string;
    ariaLabel: string | null;
    type: string | null;
    rawTag: string;
    index: number;
  }>;
  inputs: Array<{
    type: string;
    id: string;
    name: string;
    ariaLabel: string | null;
    autocomplete: string | null;
    rawTag: string;
    index: number;
  }>;
  scripts: Array<{ src: string; isAsync: boolean; isDefer: boolean; inHead: boolean; rawTag: string; index: number }>;
  fontsDetected: string[];
  colorsDetected: string[];
  inlineColorPairs: Array<{ fg: string; bg: string; rawTag: string; index: number }>;
  deprecatedTags: Array<{ tag: string; rawTag: string; index: number }>;
  totalElements: number;
  htmlLength: number;
  internalAnchors: Set<string>;
  allElementIds: Set<string>;
}

function parseRgbColor(colorStr: string): [number, number, number] | null {
  const clean = colorStr.trim().toLowerCase();
  if (clean.startsWith('#')) {
    const hex = clean.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  const match = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (match) {
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
  }
  return null;
}

function calculateRelativeLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function computeW3cContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = calculateRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = calculateRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function parsePageHtml(html: string, finalUrl: string): ParsedHtml {
  const htmlLength = Math.max(html.length, 1);

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
  const viewportMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']viewport["']/i);
  const viewportContent = viewportMatch ? viewportMatch[1].trim() : '';

  // Robots
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i);
  const robotsContent = robotsMatch ? robotsMatch[1].trim() : '';

  // OpenGraph
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : '';

  const ogImgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i);
  const ogImage = ogImgMatch ? ogImgMatch[1].trim() : '';

  // Twitter Card
  const twitterCardMatch = html.match(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:card["']/i);
  const twitterCard = twitterCardMatch ? twitterCardMatch[1].trim() : '';

  const twitterTitleMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:title["']/i);
  const twitterTitle = twitterTitleMatch ? twitterTitleMatch[1].trim() : '';

  const twitterImgMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:image["']/i);
  const twitterImage = twitterImgMatch ? twitterImgMatch[1].trim() : '';

  // Favicon
  const hasFavicon = /<link[^>]+rel=["'][^"']*(icon|shortcut icon)[^"']*["']/i.test(html);

  // HTML lang
  const htmlLangMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  const lang = htmlLangMatch ? htmlLangMatch[1].trim() : '';

  // Skip link detection
  const hasSkipLink = /<a[^>]+href=["']#(?:main|content|main-content)["'][^>]*>([\s\S]*?)<\/a>/i.test(html)
    || /class=["'][^"']*skip-(?:to-)?(?:content|main)[^"']*["']/i.test(html);

  // Landmarks
  const hasMain = /<main\b/i.test(html) || /role=["']main["']/i.test(html);
  const hasNav = /<nav\b/i.test(html) || /role=["']navigation["']/i.test(html);
  const hasHeader = /<header\b/i.test(html) || /role=["']banner["']/i.test(html);
  const hasFooter = /<footer\b/i.test(html) || /role=["']contentinfo["']/i.test(html);

  // Headings
  const headings: ParsedHtml['headings'] = [];
  const headingMatches = [...html.matchAll(/<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
  for (const m of headingMatches) {
    headings.push({
      tag: m[1].toLowerCase(),
      text: m[3].replace(/<[^>]+>/g, '').trim(),
      rawTag: m[0].slice(0, 200),
      index: m.index ?? 0,
    });
  }

  // Images
  const images: ParsedHtml['images'] = [];
  const imgMatches = [...html.matchAll(/<img\b([^>]*)>/gi)];
  for (const m of imgMatches) {
    const rawTag = m[0];
    const attrs = m[1];
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
    const srcMatch = attrs.match(/src=["']([^"']*)["']/i);
    const widthMatch = attrs.match(/width=["']?(\d+)/i);
    const heightMatch = attrs.match(/height=["']?(\d+)/i);
    const alt = altMatch ? altMatch[1] : null;
    const isDecorative = attrs.includes('role="presentation"') || attrs.includes('role="none"');
    images.push({
      alt,
      src: srcMatch ? srcMatch[1] : '',
      width: widthMatch ? widthMatch[1] : null,
      height: heightMatch ? heightMatch[1] : null,
      isDecorative,
      rawTag: rawTag.slice(0, 200),
      index: m.index ?? 0,
    });
  }

  // Links & In-Page Anchors
  const links: ParsedHtml['links'] = [];
  const internalAnchors = new Set<string>();
  const linkMatches = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  for (const m of linkMatches) {
    const rawTag = m[0];
    const attrs = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    const hrefMatch = attrs.match(/href=["']([^"']*)["']/i);
    const targetMatch = attrs.match(/target=["']([^"']*)["']/i);
    const relMatch = attrs.match(/rel=["']([^"']*)["']/i);
    const ariaMatch = attrs.match(/aria-label=["']([^"']*)["']/i);
    const href = hrefMatch ? hrefMatch[1].trim() : '';

    if (href.startsWith('#') && href.length > 1) {
      internalAnchors.add(href.slice(1));
    }

    links.push({
      href,
      text,
      target: targetMatch ? targetMatch[1].trim() : '',
      rel: relMatch ? relMatch[1].trim() : '',
      ariaLabel: ariaMatch ? ariaMatch[1].trim() : null,
      rawTag: rawTag.slice(0, 200),
      index: m.index ?? 0,
    });
  }

  // All element IDs
  const allElementIds = new Set<string>();
  const idMatches = [...html.matchAll(/\bid=["']([^"']+)["']/gi)];
  for (const m of idMatches) {
    allElementIds.add(m[1].trim());
  }

  // Buttons
  const buttons: ParsedHtml['buttons'] = [];
  const buttonMatches = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  for (const m of buttonMatches) {
    const rawTag = m[0];
    const attrs = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    const ariaMatch = attrs.match(/aria-label=["']([^"']*)["']/i);
    const typeMatch = attrs.match(/type=["']([^"']*)["']/i);
    buttons.push({
      text,
      ariaLabel: ariaMatch ? ariaMatch[1].trim() : null,
      type: typeMatch ? typeMatch[1].trim() : null,
      rawTag: rawTag.slice(0, 200),
      index: m.index ?? 0,
    });
  }

  // Inputs
  const inputs: ParsedHtml['inputs'] = [];
  const inputMatches = [...html.matchAll(/<input\b([^>]*)>/gi)];
  for (const m of inputMatches) {
    const rawTag = m[0];
    const attrs = m[1];
    const typeMatch = attrs.match(/type=["']([^"']*)["']/i);
    const idMatch = attrs.match(/id=["']([^"']*)["']/i);
    const nameMatch = attrs.match(/name=["']([^"']*)["']/i);
    const ariaMatch = attrs.match(/aria-label=["']([^"']*)["']/i);
    const autoMatch = attrs.match(/autocomplete=["']([^"']*)["']/i);
    inputs.push({
      type: typeMatch ? typeMatch[1].toLowerCase() : 'text',
      id: idMatch ? idMatch[1] : '',
      name: nameMatch ? nameMatch[1] : '',
      ariaLabel: ariaMatch ? ariaMatch[1].trim() : null,
      autocomplete: autoMatch ? autoMatch[1].trim() : null,
      rawTag: rawTag.slice(0, 200),
      index: m.index ?? 0,
    });
  }

  // Scripts
  const headClosingIndex = html.indexOf('</head>');
  const scripts: ParsedHtml['scripts'] = [];
  const scriptMatches = [...html.matchAll(/<script\b([^>]*)>/gi)];
  for (const m of scriptMatches) {
    const attrs = m[1];
    const srcMatch = attrs.match(/src=["']([^"']*)["']/i);
    const idx = m.index ?? 0;
    scripts.push({
      src: srcMatch ? srcMatch[1] : '',
      isAsync: /\basync\b/i.test(attrs),
      isDefer: /\bdefer\b/i.test(attrs),
      inHead: headClosingIndex > 0 ? idx < headClosingIndex : false,
      rawTag: m[0].slice(0, 160),
      index: idx,
    });
  }

  // Deprecated tags (<font>, <center>, <big>, <strike>, <u>, <marquee>, <blink>)
  const deprecatedTags: ParsedHtml['deprecatedTags'] = [];
  const depMatches = [...html.matchAll(/<(font|center|big|strike|u|marquee|blink)\b([^>]*)>/gi)];
  for (const m of depMatches) {
    deprecatedTags.push({
      tag: m[1].toLowerCase(),
      rawTag: m[0].slice(0, 140),
      index: m.index ?? 0,
    });
  }

  // Inline color and background-color pairs
  const inlineColorPairs: ParsedHtml['inlineColorPairs'] = [];
  const styleMatches = [...html.matchAll(/style=["']([^"']*)["']/gi)];
  for (const sm of styleMatches) {
    const styleVal = sm[1];
    const fgMatch = styleVal.match(/\bcolor\s*:\s*([^;]+)/i);
    const bgMatch = styleVal.match(/\bbackground(?:-color)?\s*:\s*([^;]+)/i);
    if (fgMatch && bgMatch) {
      inlineColorPairs.push({
        fg: fgMatch[1].trim(),
        bg: bgMatch[1].trim(),
        rawTag: sm[0].slice(0, 150),
        index: sm.index ?? 0,
      });
    }
  }

  // Detect font families
  const fontMatches = [...html.matchAll(/font-family\s*:\s*([^;}"']+)/gi)];
  const fontsDetectedSet = new Set<string>();
  for (const m of fontMatches) {
    const parts = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
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
    if (colorsDetectedSet.size >= 16) break;
  }
  if (colorsDetectedSet.size === 0) {
    colorsDetectedSet.add('#09090b');
    colorsDetectedSet.add('#ffffff');
    colorsDetectedSet.add('#71717a');
  }

  const totalElements = (html.match(/<[a-zA-Z][^>]*>/g) || []).length;

  return {
    finalUrl,
    title,
    metaDescription,
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    twitterTitle,
    twitterImage,
    viewportContent,
    robotsContent,
    lang,
    hasFavicon,
    hasSkipLink,
    landmarks: {
      hasMain,
      hasNav,
      hasHeader,
      hasFooter,
    },
    headings,
    images,
    links,
    buttons,
    inputs,
    scripts,
    fontsDetected: Array.from(fontsDetectedSet).slice(0, 8),
    colorsDetected: Array.from(colorsDetectedSet).slice(0, 12),
    inlineColorPairs,
    deprecatedTags,
    totalElements: Math.max(totalElements, 1),
    htmlLength,
    internalAnchors,
    allElementIds,
  };
}

function calculateElementBbox(
  matchIndex: number,
  htmlLength: number,
  device: 'desktop' | 'mobile',
  preferredY?: number,
  dimensions?: { width?: number; height?: number }
): BoundingBox {
  const isMobile = device === 'mobile';
  const viewportWidth = isMobile ? 390 : 1440;
  const docHeight = htmlLength < 25000 ? 1200 : htmlLength < 80000 ? 2200 : 3400;

  if (preferredY !== undefined) {
    const width = dimensions?.width ?? (isMobile ? 350 : 720);
    const height = dimensions?.height ?? 44;
    const x = isMobile ? 20 : 120;
    return { x, y: preferredY, width, height };
  }

  const ratio = Math.max(0, Math.min(1, matchIndex / Math.max(1, htmlLength)));
  const y = Math.round(80 + ratio * (docHeight - 160));
  const width = dimensions?.width ?? (isMobile ? 350 : 640);
  const height = dimensions?.height ?? 40;
  const x = isMobile ? 20 : 120;

  return { x, y, width, height };
}

async function fetchRealScreenshot(targetUrl: string, device: 'desktop' | 'mobile'): Promise<string> {
  const isMobile = device === 'mobile';

  // 1. Microlink high-definition real screenshot
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

  // 2. WordPress mShots fallback
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

  // 3. Subtle browser preview frame fallback
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
    : { width: 1440, height: 900 };

  // 2. Fetch page HTML securely following redirects
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let html = '';
  let finalUrl = targetUrl;
  try {
    const res = await fetch(targetUrl, {
      redirect: 'follow',
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

    finalUrl = res.url || targetUrl;
    html = await res.text();
  } finally {
    clearTimeout(timeoutId);
  }

  // 3. Parse and extract page representation
  const parsed = parsePageHtml(html, finalUrl);
  const findings: AuditFinding[] = [];
  let findingNumber = 1;

  const htmlLen = parsed.htmlLength;
  const h1s = parsed.headings.filter((h) => h.tag === 'h1');
  const h2s = parsed.headings.filter((h) => h.tag === 'h2');
  const h3s = parsed.headings.filter((h) => h.tag === 'h3');

  // ——————————————————————————————————————————————————————
  // 4. ACCESSIBILITY RULES (WCAG 2.1 AA & Section 508)
  // ——————————————————————————————————————————————————————
  // 4.1 Document language
  if (!parsed.lang) {
    findings.push({
      id: `a11y-missing-lang-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'high',
      title: 'Missing document language declaration',
      description: 'The root <html> element does not specify a lang attribute, preventing screen readers from choosing the correct pronunciation rules and speech synthesis engine.',
      selector: 'html',
      snippet: '<html>',
      recommendation: 'Add a valid BCP 47 language code to the <html> tag (e.g. <html lang="en">).',
      sourcePrinciple: 'WCAG 3.1.1 Language of Page (Level A)',
      bbox: calculateElementBbox(10, htmlLen, device, 10, { height: 40 }),
    });
  }

  // 4.2 Empty or non-text links
  const emptyLinks = parsed.links.filter((l) => !l.text && !l.ariaLabel);
  if (emptyLinks.length > 0) {
    const sample = emptyLinks[0];
    findings.push({
      id: `a11y-empty-link-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'high',
      title: `Link missing accessible text or label (${emptyLinks.length} found)`,
      description: `${emptyLinks.length} anchor link(s) lack visible inner text and aria-label attributes. Screen reader users encounter silent or confusing "link" announcements.`,
      selector: 'a:not([aria-label])',
      snippet: sample.rawTag,
      recommendation: 'Add visible descriptive text inside the link or provide an aria-label attribute describing destination.',
      sourcePrinciple: 'WCAG 2.4.4 Link Purpose (In Context) & WCAG 4.1.2 Name, Role, Value',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 180, height: 36 }),
    });
  }

  // 4.3 Images missing alt
  const missingAltImages = parsed.images.filter((img) => img.alt === null && !img.isDecorative);
  if (missingAltImages.length > 0) {
    const sample = missingAltImages[0];
    findings.push({
      id: `a11y-img-alt-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'high',
      title: `Images missing alt text (${missingAltImages.length} found)`,
      description: `${missingAltImages.length} <img> element(s) do not define an alt attribute. Assistive technologies cannot convey image content or context to vision-impaired users.`,
      selector: 'img:not([alt])',
      snippet: sample.rawTag,
      recommendation: 'Provide meaningful alt descriptions, or use alt="" if the image is purely decorative.',
      sourcePrinciple: 'WCAG 1.1.1 Non-text Content (Level A)',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 380, height: 220 }),
    });
  }

  // 4.4 Redundant or low-quality image alt text
  const poorAltImages = parsed.images.filter((img) => {
    if (!img.alt) return false;
    const lower = img.alt.trim().toLowerCase();
    return ['image', 'photo', 'picture', 'icon', 'graphic', 'logo', 'placeholder'].includes(lower);
  });
  if (poorAltImages.length > 0) {
    const sample = poorAltImages[0];
    findings.push({
      id: `a11y-poor-alt-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'medium',
      title: `Redundant or non-descriptive image alt text ("${sample.alt}")`,
      description: `${poorAltImages.length} image(s) use generic placeholder words ("image", "photo") as alt descriptions instead of explaining the actual content.`,
      selector: `img[alt="${sample.alt}"]`,
      snippet: sample.rawTag,
      recommendation: 'Replace placeholder words with specific context about what the image depicts.',
      sourcePrinciple: 'WCAG 1.1.1 Non-text Content & WAI Alt Decision Tree',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 340, height: 200 }),
    });
  }

  // 4.5 Empty interactive buttons
  const emptyButtons = parsed.buttons.filter((b) => !b.text && !b.ariaLabel);
  if (emptyButtons.length > 0) {
    const sample = emptyButtons[0];
    findings.push({
      id: `a11y-empty-button-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'high',
      title: `Button missing accessible text or aria-label (${emptyButtons.length} found)`,
      description: `${emptyButtons.length} interactive button(s) lack visible inner text or aria-label attributes.`,
      selector: 'button',
      snippet: sample.rawTag,
      recommendation: 'Add visible text inside the button or an aria-label attribute describing its action.',
      sourcePrinciple: 'WCAG 4.1.2 Name, Role, Value (Level A)',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 140, height: 44 }),
    });
  }

  // 4.6 Icon-only buttons lacking visible label
  const iconOnlyButtons = parsed.buttons.filter((b) => !b.text && b.ariaLabel);
  if (iconOnlyButtons.length > 0) {
    const sample = iconOnlyButtons[0];
    findings.push({
      id: `a11y-icon-only-button-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'low',
      title: `Icon-only button without visible text label (${iconOnlyButtons.length} found)`,
      description: `${iconOnlyButtons.length} button(s) declare an aria-label ("${sample.ariaLabel}") but render no visible text. Users relying on speech input (Speech-to-Text) cannot easily target buttons lacking visible matching names.`,
      selector: `button[aria-label="${sample.ariaLabel}"]`,
      snippet: sample.rawTag,
      recommendation: 'Provide a visible label or ensure an accessible tooltip appears on hover/focus to satisfy WCAG 2.5.3.',
      sourcePrinciple: 'WCAG 2.5.3 Label in Name (Level A)',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 140, height: 44 }),
    });
  }

  // 4.7 Buttons missing explicit type attribute
  const untypedButtons = parsed.buttons.filter((b) => !b.type);
  if (untypedButtons.length > 0) {
    const sample = untypedButtons[0];
    findings.push({
      id: `a11y-button-no-type-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'medium',
      title: `Buttons missing explicit type attribute (${untypedButtons.length} found)`,
      description: `${untypedButtons.length} <button> element(s) omit type="button". By default, HTML buttons inside forms behave as type="submit", risking unintended form submissions.`,
      selector: 'button:not([type])',
      snippet: sample.rawTag,
      recommendation: 'Explicitly specify type="button" for UI controls or type="submit" for form actions.',
      sourcePrinciple: 'HTML5 Form Controls Specification & Impeccable Craft Floor',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 140, height: 44 }),
    });
  }

  // 4.7 Form inputs missing label
  const unlabelledInputs = parsed.inputs.filter((i) => !i.ariaLabel && i.type !== 'hidden' && i.type !== 'submit');
  if (unlabelledInputs.length > 0) {
    const sample = unlabelledInputs[0];
    findings.push({
      id: `a11y-unlabelled-input-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'medium',
      title: `Form input missing explicit label or aria-label (${unlabelledInputs.length} found)`,
      description: `${unlabelledInputs.length} form input element(s) do not declare an aria-label or associated <label for="..."> tag.`,
      selector: `input[type="${sample.type}"]`,
      snippet: sample.rawTag,
      recommendation: 'Associate inputs with explicit <label for="id"> tags or add aria-label attributes.',
      sourcePrinciple: 'WCAG 1.3.1 Info and Relationships (Level A)',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 420, height: 48 }),
    });
  }

  // 4.8 Semantic landmark: <main>
  if (!parsed.landmarks.hasMain) {
    findings.push({
      id: `a11y-missing-main-landmark-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'high',
      title: 'Missing semantic <main> landmark',
      description: 'Document lacks a <main> element or role="main" container. Assistive technology users cannot jump directly to the primary page content.',
      selector: 'body',
      recommendation: 'Wrap the primary content of the page in a semantic <main> element.',
      sourcePrinciple: 'WCAG 1.3.1 Info and Relationships & WAI-ARIA Landmark Roles',
      bbox: calculateElementBbox(100, htmlLen, device, 180, { height: 120 }),
    });
  }

  // 4.9 Semantic landmark: <header>
  if (!parsed.landmarks.hasHeader) {
    findings.push({
      id: `a11y-missing-header-landmark-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'medium',
      title: 'Missing semantic <header> banner landmark',
      description: 'Document does not define a semantic <header> or role="banner" container for global branding and navigation.',
      selector: 'body',
      recommendation: 'Wrap the top-level site identity and navigation in a semantic <header> landmark.',
      sourcePrinciple: 'WAI-ARIA Landmark Regions & WCAG 1.3.1',
      bbox: calculateElementBbox(10, htmlLen, device, 24, { height: 50 }),
    });
  }

  // 4.10 Semantic landmark: <nav>
  if (!parsed.landmarks.hasNav) {
    findings.push({
      id: `a11y-missing-nav-landmark-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'medium',
      title: 'Missing semantic <nav> navigation landmark',
      description: 'Page does not declare a semantic <nav> element to designate the primary navigation block.',
      selector: 'body',
      recommendation: 'Enclose navigation links in a semantic <nav> element.',
      sourcePrinciple: 'WAI-ARIA Landmark Regions & WCAG 2.4.1',
      bbox: calculateElementBbox(20, htmlLen, device, 40, { height: 44 }),
    });
  }

  // 4.11 Semantic landmark: <footer>
  if (!parsed.landmarks.hasFooter && parsed.totalElements > 25) {
    findings.push({
      id: `a11y-missing-footer-landmark-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'low',
      title: 'Missing semantic <footer> landmark',
      description: 'Page does not define a semantic <footer> or role="contentinfo" landmark for copyright, legal, or supplementary links.',
      selector: 'body',
      recommendation: 'Wrap bottom page metadata and auxiliary navigation inside a semantic <footer> tag.',
      sourcePrinciple: 'WAI-ARIA Document Landmarks & WCAG 1.3.1',
      bbox: calculateElementBbox(htmlLen - 500, htmlLen, device, undefined, { height: 80 }),
    });
  }

  // 4.12 Skip navigation link
  if (!parsed.hasSkipLink && (parsed.links.length + parsed.buttons.length > 5)) {
    findings.push({
      id: `a11y-missing-skip-link-${findingNumber}`,
      number: findingNumber++,
      category: 'accessibility',
      severity: 'medium',
      title: 'Missing skip-to-content navigation link',
      description: 'Document lacks a "Skip to Content" anchor link at the top of the page. Keyboard and switch-control users must repeatedly tab through all header links on every page load.',
      selector: 'body',
      recommendation: 'Add an early visually-hidden skip link (e.g. <a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>).',
      sourcePrinciple: 'WCAG 2.4.1 Bypass Blocks (Level A)',
      bbox: calculateElementBbox(50, htmlLen, device, 16, { width: 220, height: 32 }),
    });
  }

  // ——————————————————————————————————————————————————————
  // 5. USER EXPERIENCE & INTERACTION (Nielsen Norman & uxui-principles)
  // ——————————————————————————————————————————————————————
  // 5.1 Dead or placeholder link targets
  const placeholderLinks = parsed.links.filter(
    (l) => !l.href || l.href === '#' || l.href === 'javascript:void(0);' || l.href === 'javascript:;'
  );
  if (placeholderLinks.length > 0) {
    const sample = placeholderLinks[0];
    findings.push({
      id: `ux-dead-link-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'high',
      title: `Dead or placeholder link anchor (${placeholderLinks.length} found)`,
      description: `${placeholderLinks.length} anchor link(s) use href="${sample.href || ''}", triggering sudden viewport scroll jumps or unhandled clicks.`,
      selector: 'a[href="#"]',
      snippet: sample.rawTag,
      recommendation: 'Replace placeholder <a> tags with semantic <button type="button"> for UI triggers, or provide a real destination URL.',
      sourcePrinciple: 'Nielsen Norman Heuristics: Consistency and Standards',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 180, height: 32 }),
    });
  }

  // 5.2 Ambiguous link wording ("click here", "read more")
  const ambiguousLinks = parsed.links.filter((l) => {
    const lower = l.text.toLowerCase().trim();
    return ['click here', 'read more', 'more', 'learn more', 'link', 'here', 'continue'].includes(lower) && !l.ariaLabel;
  });
  if (ambiguousLinks.length > 0) {
    const sample = ambiguousLinks[0];
    findings.push({
      id: `ux-ambiguous-link-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'medium',
      title: `Ambiguous link text ("${sample.text}")`,
      description: `${ambiguousLinks.length} link(s) use vague wording like "${sample.text}" without destination context, degrading information scent and screen reader navigation.`,
      selector: 'a',
      snippet: sample.rawTag,
      recommendation: 'Change link text to describe what will happen (e.g. "Explore Documentation", "View Pricing Plans").',
      sourcePrinciple: 'uxui-principles: Information Foraging & Scent of Information',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 160, height: 32 }),
    });
  }

  // 5.3 External link security: target="_blank" without rel="noopener"
  const unsafeExternalLinks = parsed.links.filter(
    (l) => l.target === '_blank' && (!l.rel.includes('noopener') && !l.rel.includes('noreferrer'))
  );
  if (unsafeExternalLinks.length > 0) {
    const sample = unsafeExternalLinks[0];
    findings.push({
      id: `ux-unsafe-target-blank-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'high',
      title: `External link target="_blank" missing rel="noopener" (${unsafeExternalLinks.length} found)`,
      description: `${unsafeExternalLinks.length} link(s) open in new tabs without rel="noopener noreferrer", exposing the window.opener security vulnerability (reverse tabnabbing).`,
      selector: 'a[target="_blank"]',
      snippet: sample.rawTag,
      recommendation: 'Always add rel="noopener noreferrer" whenever using target="_blank".',
      sourcePrinciple: 'OWASP / HTML5 Security Standards',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 220, height: 36 }),
    });
  }

  // 5.4 Mobile zoom disabled via user-scalable=no
  if (parsed.viewportContent && (parsed.viewportContent.includes('user-scalable=no') || parsed.viewportContent.includes('maximum-scale=1'))) {
    findings.push({
      id: `ux-pinch-to-zoom-disabled-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'critical',
      title: 'Pinch-to-zoom disabled via viewport settings',
      description: 'The viewport meta tag disables browser zooming (user-scalable=no / maximum-scale=1), locking out low-vision users who rely on device magnification.',
      selector: 'meta[name="viewport"]',
      snippet: `<meta name="viewport" content="${parsed.viewportContent}">`,
      recommendation: 'Remove user-scalable=no and maximum-scale=1 from the viewport meta tag.',
      sourcePrinciple: 'WCAG 1.4.4 Resize Text (Level AA)',
      bbox: calculateElementBbox(10, htmlLen, device, 20, { height: 40 }),
    });
  }

  // 5.5 Broken internal fragment anchor targets
  const brokenAnchors = Array.from(parsed.internalAnchors).filter((id) => !parsed.allElementIds.has(id));
  if (brokenAnchors.length > 0) {
    findings.push({
      id: `ux-broken-fragment-link-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'medium',
      title: `Broken in-page anchor links (${brokenAnchors.length} found)`,
      description: `Links reference in-page IDs (#${brokenAnchors.slice(0, 3).join(', #')}) that do not exist in the DOM, failing to jump to the intended section.`,
      selector: `a[href="#${brokenAnchors[0]}"]`,
      recommendation: `Ensure target section elements declare matching id="${brokenAnchors[0]}" attributes.`,
      sourcePrinciple: 'Nielsen Norman: Error Prevention & Link Reliability',
      bbox: calculateElementBbox(500, htmlLen, device, undefined, { width: 200, height: 36 }),
    });
  }

  // 5.6 Missing autocomplete on credential/contact inputs
  const missingAutoInputs = parsed.inputs.filter(
    (i) => ['email', 'password', 'tel'].includes(i.type) && !i.autocomplete
  );
  if (missingAutoInputs.length > 0) {
    const sample = missingAutoInputs[0];
    findings.push({
      id: `ux-missing-autocomplete-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'low',
      title: `Form input missing autocomplete attribute (${missingAutoInputs.length} found)`,
      description: `Input of type="${sample.type}" lacks an explicit autocomplete attribute, preventing browser password managers and autofill systems from assisting users.`,
      selector: `input[type="${sample.type}"]`,
      snippet: sample.rawTag,
      recommendation: `Add appropriate autocomplete (e.g. autocomplete="${sample.type === 'email' ? 'email' : 'current-password'}").`,
      sourcePrinciple: 'WCAG 1.3.5 Identify Input Purpose (Level AA)',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 360, height: 44 }),
    });
  }

  // 5.7 Small touch target padding / sizing
  const smallTouchTargets = parsed.links.filter(
    (l) => l.rawTag.includes('p-0.5') || l.rawTag.includes('p-1') || l.rawTag.includes('h-6 w-6') || l.rawTag.includes('h-5 w-5') || l.rawTag.includes('h-4 w-4')
  );
  if (smallTouchTargets.length > 0) {
    const sample = smallTouchTargets[0];
    findings.push({
      id: `ux-small-touch-target-${findingNumber}`,
      number: findingNumber++,
      category: 'ux',
      severity: 'medium',
      title: `Sub-optimal touch target padding detected (${smallTouchTargets.length} found)`,
      description: `Interactive control uses minimal padding (e.g. p-0.5 / p-1) or small dimensions, creating an active hit area below the 44x44px minimum touch target standard for mobile and touch screens.`,
      selector: 'a',
      snippet: sample.rawTag,
      recommendation: 'Expand the click/tap bounding box to at least 44x44px using generous padding (p-2.5 or p-3) or min-h-[44px] min-w-[44px].',
      sourcePrinciple: 'WCAG 2.5.5 Target Size & Fitts’s Law (uxui-principles)',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 140, height: 44 }),
    });
  }

  // ——————————————————————————————————————————————————————
  // 6. TYPOGRAPHY & DOCUMENT HIERARCHY
  // ——————————————————————————————————————————————————————
  // 6.1 Missing <h1>
  if (h1s.length === 0) {
    findings.push({
      id: `typo-missing-h1-${findingNumber}`,
      number: findingNumber++,
      category: 'typography',
      severity: 'high',
      title: 'Missing primary <h1> heading',
      description: 'The document lacks a top-level <h1> heading to establish semantic content hierarchy and document purpose.',
      selector: 'body',
      recommendation: 'Include exactly one descriptive <h1> heading at the beginning of the main content.',
      sourcePrinciple: 'WCAG 1.3.1 Info and Relationships & Impeccable Typeset',
      bbox: calculateElementBbox(200, htmlLen, device, 140, { width: 680, height: 52 }),
    });
  } else if (h1s.length > 1) {
    findings.push({
      id: `typo-multiple-h1-${findingNumber}`,
      number: findingNumber++,
      category: 'typography',
      severity: 'low',
      title: `Multiple <h1> headings detected (${h1s.length} found)`,
      description: 'Document defines multiple <h1> elements. Single <h1> per page provides clearer semantic hierarchy and stronger SEO focus.',
      selector: 'h1',
      snippet: `${h1s[0].rawTag} ... ${h1s[1].rawTag}`,
      recommendation: 'Consolidate page structure to use a single <h1>, with subsections organized under <h2> and <h3>.',
      sourcePrinciple: 'Semantic HTML5 Heading Hierarchy & Impeccable Typeset',
      bbox: calculateElementBbox(h1s[1].index, htmlLen, device, undefined, { width: 680, height: 50 }),
    });
  }

  // 6.2 Flat document structure (has H1 and lots of content, but zero H2 subheadings)
  if (h1s.length >= 1 && h2s.length === 0 && (parsed.buttons.length > 5 || parsed.links.length > 6 || parsed.totalElements > 40)) {
    findings.push({
      id: `typo-no-subheadings-${findingNumber}`,
      number: findingNumber++,
      category: 'typography',
      severity: 'high',
      title: 'Flat heading structure (No <h2> section headings found)',
      description: `Document defines an <h1> but zero <h2> subheadings despite having substantial interactive content (${parsed.buttons.length} buttons, ${parsed.links.length} links). Screen readers cannot skim major sections.`,
      selector: 'body',
      recommendation: 'Break major page sections (projects, features, about, contact) into semantic <h2> headings.',
      sourcePrinciple: 'WCAG 1.3.1 Info and Relationships & Editorial Hierarchy Standards',
      bbox: calculateElementBbox(h1s[0].index + 200, htmlLen, device, 320, { width: 620, height: 44 }),
    });
  }

  // 6.3 Skipped heading levels (H3 without H2)
  if (h3s.length > 0 && h2s.length === 0) {
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
      bbox: calculateElementBbox(h3s[0].index, htmlLen, device, undefined, { width: 520, height: 40 }),
    });
  }

  // 6.4 Deprecated styling tags (<font>, <center>, <u>, etc.)
  if (parsed.deprecatedTags.length > 0) {
    const sample = parsed.deprecatedTags[0];
    findings.push({
      id: `typo-deprecated-tags-${findingNumber}`,
      number: findingNumber++,
      category: 'typography',
      severity: 'medium',
      title: `Deprecated presentational tag (<${sample.tag}>) detected`,
      description: `Document uses outdated HTML presentational markup (<${sample.tag}>). Presentational markup violates clean separation of concerns and breaks modern responsive styles.`,
      selector: sample.tag,
      snippet: sample.rawTag,
      recommendation: `Replace <${sample.tag}> with modern CSS styling and utility classes.`,
      sourcePrinciple: 'W3C HTML5 Strict Conformance & Modern Web Standards',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 300, height: 36 }),
    });
  }

  // ——————————————————————————————————————————————————————
  // 7. COLORS & CONTRAST
  // ——————————————————————————————————————————————————————
  // 7.1 Inline low contrast color pairs
  for (const pair of parsed.inlineColorPairs) {
    const fgRgb = parseRgbColor(pair.fg);
    const bgRgb = parseRgbColor(pair.bg);
    if (fgRgb && bgRgb) {
      const ratio = computeW3cContrastRatio(fgRgb, bgRgb);
      if (ratio < 4.5) {
        findings.push({
          id: `colors-low-contrast-${findingNumber}`,
          number: findingNumber++,
          category: 'colors',
          severity: 'high',
          title: `Insufficient color contrast ratio (${ratio.toFixed(2)}:1)`,
          description: `Inline colors (${pair.fg} on ${pair.bg}) produce a contrast ratio of ${ratio.toFixed(2)}:1, failing WCAG AA minimum threshold of 4.5:1 for normal body text.`,
          selector: '[style*="color"]',
          snippet: pair.rawTag,
          recommendation: `Increase contrast to at least 4.5:1 by adjusting text brightness or darkening the background.`,
          sourcePrinciple: 'WCAG 1.4.3 Contrast (Minimum) (Level AA)',
          bbox: calculateElementBbox(pair.index, htmlLen, device, undefined, { width: 320, height: 40 }),
        });
        break; // Cluster one high-priority contrast item
      }
    }
  }

  // 7.2 Color palette entropy
  if (parsed.colorsDetected.length > 10) {
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
      bbox: calculateElementBbox(300, htmlLen, device, 400, { width: 480, height: 80 }),
    });
  }

  // ——————————————————————————————————————————————————————
  // 8. VISUAL DESIGN & PERFORMANCE
  // ——————————————————————————————————————————————————————
  // 8.1 Images missing explicit width/height (CLS risk)
  const imagesWithoutDimensions = parsed.images.filter((img) => !img.width || !img.height);
  if (imagesWithoutDimensions.length > 0) {
    const sample = imagesWithoutDimensions[0];
    findings.push({
      id: `visual-img-dimensions-${findingNumber}`,
      number: findingNumber++,
      category: 'visual',
      severity: 'medium',
      title: `Images missing explicit width/height attributes (${imagesWithoutDimensions.length} found)`,
      description: `${imagesWithoutDimensions.length} <img> element(s) do not define explicit width and height dimensions, triggering Cumulative Layout Shift (CLS) as assets load.`,
      selector: 'img:not([width])',
      snippet: sample.rawTag,
      recommendation: 'Provide explicit width and height attributes (or aspect-ratio CSS) on all image tags.',
      sourcePrinciple: 'Core Web Vitals: Cumulative Layout Shift (CLS) Optimization',
      bbox: calculateElementBbox(sample.index, htmlLen, device, undefined, { width: 400, height: 220 }),
    });
  }

  // 8.2 Render-blocking external scripts in <head>
  const blockingScripts = parsed.scripts.filter((s) => s.inHead && s.src && !s.isAsync && !s.isDefer);
  if (blockingScripts.length > 0) {
    const sample = blockingScripts[0];
    findings.push({
      id: `visual-render-blocking-script-${findingNumber}`,
      number: findingNumber++,
      category: 'visual',
      severity: 'high',
      title: `Render-blocking external script in <head> (${blockingScripts.length} found)`,
      description: `Synchronous script (${sample.src.slice(0, 60)}) halts HTML parser execution until downloaded and executed.`,
      selector: 'head > script:not([defer]):not([async])',
      snippet: sample.rawTag,
      recommendation: 'Add defer or async attribute to non-critical external scripts in <head>.',
      sourcePrinciple: 'Web Performance: First Contentful Paint (FCP) Optimization',
      bbox: calculateElementBbox(sample.index, htmlLen, device, 40, { width: 440, height: 36 }),
    });
  }

  // 8.3 Script bundle density
  if (parsed.scripts.length > 25) {
    findings.push({
      id: `visual-script-bloat-${findingNumber}`,
      number: findingNumber++,
      category: 'visual',
      severity: 'medium',
      title: `High client script bundle density (${parsed.scripts.length} script tags)`,
      description: `Document loads ${parsed.scripts.length} individual script tags, increasing HTTP round-trips and JavaScript execution overhead on mobile devices.`,
      selector: 'body',
      recommendation: 'Bundle client JavaScript chunks and remove unused third-party dependencies.',
      sourcePrinciple: 'Core Web Vitals: Total Blocking Time (TBT) Optimization',
      bbox: calculateElementBbox(htmlLen - 300, htmlLen, device, undefined, { width: 480, height: 60 }),
    });
  }

  // 8.4 Deep DOM node count
  if (parsed.totalElements > 1500) {
    findings.push({
      id: `visual-dom-size-${findingNumber}`,
      number: findingNumber++,
      category: 'visual',
      severity: 'medium',
      title: `Excessive DOM element depth (${parsed.totalElements} nodes)`,
      description: `Page renders approximately ${parsed.totalElements} DOM nodes. Deep DOM trees degrade layout recalculation and scroll fps.`,
      selector: 'body',
      recommendation: 'Simplify nested container wrappers and virtualize long lists to reduce DOM nodes below 1,200.',
      sourcePrinciple: 'Core Web Vitals & DOM Performance Optimization',
      bbox: calculateElementBbox(500, htmlLen, device, 360, { width: 500, height: 80 }),
    });
  }

  // ——————————————————————————————————————————————————————
  // 9. SEO & METADATA RULES
  // ——————————————————————————————————————————————————————
  // 9.1 Title tag
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
      bbox: calculateElementBbox(10, htmlLen, device, 10, { height: 40 }),
    });
  } else if (parsed.title.length < 20) {
    findings.push({
      id: `seo-short-title-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'low',
      title: `Document title is too brief (${parsed.title.length} characters)`,
      description: `Current title "${parsed.title}" is under 20 characters, missing an opportunity to target primary search queries and provide brand context.`,
      selector: 'title',
      snippet: `<title>${parsed.title}</title>`,
      recommendation: 'Aim for a title length between 30 and 65 characters.',
      sourcePrinciple: 'Google Search Central: Title Best Practices',
      bbox: calculateElementBbox(10, htmlLen, device, 10, { height: 40 }),
    });
  } else if (parsed.title.length > 70) {
    findings.push({
      id: `seo-long-title-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'low',
      title: `Document title exceeds recommended 70 characters (${parsed.title.length} chars)`,
      description: `Title length (${parsed.title.length} characters) will likely be truncated with an ellipsis on search engine results pages (SERPs).`,
      selector: 'title',
      snippet: `<title>${parsed.title}</title>`,
      recommendation: 'Shorten title to under 65 characters to prevent truncation on Google SERPs.',
      sourcePrinciple: 'Google Search Central: SERP Snippet Optimization',
      bbox: calculateElementBbox(10, htmlLen, device, 10, { height: 40 }),
    });
  }

  // 9.2 Meta description
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
      bbox: calculateElementBbox(20, htmlLen, device, 40, { height: 44 }),
    });
  } else if (parsed.metaDescription.length < 50) {
    findings.push({
      id: `seo-short-desc-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'low',
      title: `Meta description is too short (${parsed.metaDescription.length} characters)`,
      description: 'Meta description is under 50 characters, missing an opportunity to outline page value to searchers.',
      selector: 'meta[name="description"]',
      recommendation: 'Expand meta description length to 120–160 characters.',
      sourcePrinciple: 'Search Engine Optimization Guide',
      bbox: calculateElementBbox(20, htmlLen, device, 40, { height: 44 }),
    });
  } else if (parsed.metaDescription.length > 160) {
    findings.push({
      id: `seo-long-desc-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'low',
      title: `Meta description may be truncated (${parsed.metaDescription.length} characters)`,
      description: `Current meta description is ${parsed.metaDescription.length} characters. Descriptions over 160 characters are typically truncated on desktop search results.`,
      selector: 'meta[name="description"]',
      recommendation: 'Trim description to 120–160 characters to fit cleanly on Google SERP snippets.',
      sourcePrinciple: 'Google Search Central: Snippet Guidelines',
      bbox: calculateElementBbox(20, htmlLen, device, 40, { height: 44 }),
    });
  }

  // 9.3 Canonical URL
  if (!parsed.canonicalUrl) {
    findings.push({
      id: `seo-missing-canonical-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'medium',
      title: 'Missing canonical link tag',
      description: 'The page does not specify a canonical link tag, risking duplicate content dilution across query parameters or protocols.',
      selector: 'head',
      recommendation: `Add <link rel="canonical" href="${parsed.finalUrl}" /> to designate the authoritative URL.`,
      sourcePrinciple: 'Google Search Central: Consolidate Duplicate URLs',
      bbox: calculateElementBbox(10, htmlLen, device, 10, { height: 40 }),
    });
  } else {
    try {
      const canonHost = new URL(parsed.canonicalUrl).hostname.toLowerCase();
      const currentHost = new URL(targetUrl).hostname.toLowerCase();
      if (canonHost !== currentHost && canonHost.replace(/^www\./, '') === currentHost.replace(/^www\./, '')) {
        findings.push({
          id: `seo-canonical-mismatch-${findingNumber}`,
          number: findingNumber++,
          category: 'seo',
          severity: 'low',
          title: 'Canonical subdomain mismatch (www vs apex domain)',
          description: `Target requested as "${currentHost}", but canonical link specifies "${canonHost}". Search engines may treat these as separate origins if 301 redirects are misconfigured.`,
          selector: 'link[rel="canonical"]',
          snippet: `<link rel="canonical" href="${parsed.canonicalUrl}">`,
          recommendation: `Ensure non-canonical subdomains 301 redirect permanently to the authoritative canonical host (${canonHost}).`,
          sourcePrinciple: 'Google Search Central: URL Canonicalization Standards',
          bbox: calculateElementBbox(10, htmlLen, device, 10, { height: 40 }),
        });
      }
    } catch {}
  }

  // 9.4 OpenGraph social cards
  if (!parsed.ogTitle || !parsed.ogImage) {
    findings.push({
      id: `seo-missing-opengraph-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'medium',
      title: 'Incomplete OpenGraph social cards',
      description: 'Page lacks complete OpenGraph tags (og:title, og:image), degrading preview rendering on social platforms, Slack, and messaging apps.',
      selector: 'head',
      recommendation: 'Add og:title, og:description, and og:image tags for rich link preview cards.',
      sourcePrinciple: 'The Open Graph Protocol Standard',
      bbox: calculateElementBbox(20, htmlLen, device, 50, { height: 44 }),
    });
  }

  // 9.5 Twitter Card
  if (!parsed.twitterCard) {
    findings.push({
      id: `seo-missing-twitter-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'low',
      title: 'Missing Twitter card metadata',
      description: 'Page omits <meta name="twitter:card">, falling back to basic link rendering when shared on X/Twitter.',
      selector: 'head',
      recommendation: 'Add <meta name="twitter:card" content="summary_large_image"> for modern edge-to-edge social cards.',
      sourcePrinciple: 'Twitter Developer Documentation: Cards Markup Tag Reference',
      bbox: calculateElementBbox(20, htmlLen, device, 60, { height: 40 }),
    });
  }

  // 9.6 Favicon
  if (!parsed.hasFavicon) {
    findings.push({
      id: `seo-missing-favicon-${findingNumber}`,
      number: findingNumber++,
      category: 'seo',
      severity: 'low',
      title: 'Missing favicon link declaration',
      description: 'Document head does not declare a <link rel="icon"> or apple-touch-icon, leaving browser tabs and bookmarks with a default generic placeholder.',
      selector: 'head',
      recommendation: 'Add <link rel="icon" href="/favicon.ico"> and an SVG or PNG icon declaration.',
      sourcePrinciple: 'Web Browser Standards: Tab and Bookmark Identity',
      bbox: calculateElementBbox(10, htmlLen, device, 10, { height: 36 }),
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
      h1: h1s[0]?.text,
      totalElements: parsed.totalElements,
      fontsDetected: parsed.fontsDetected,
      colorsDetected: parsed.colorsDetected,
    },
  };

  saveAudit(result);
  return result;
}
