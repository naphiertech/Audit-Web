import { AuditResult } from '@/types/audit';

const SAMPLE_SCREENSHOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900" fill="#f8f7f4">
  <rect width="1440" height="900" fill="#fbfaf8"/>
  <rect x="0" y="0" width="1440" height="64" fill="#ffffff" stroke="#e5e5df" stroke-width="1"/>
  <circle cx="48" cy="32" r="14" fill="#111111"/>
  <rect x="76" y="24" width="96" height="16" rx="3" fill="#111111"/>
  <rect x="1180" y="18" width="180" height="28" rx="4" fill="#111111"/>
  <rect x="120" y="140" width="480" height="44" rx="4" fill="#111111"/>
  <rect x="120" y="200" width="640" height="20" rx="3" fill="#737373"/>
  <rect x="120" y="232" width="520" height="20" rx="3" fill="#737373"/>
  <rect x="120" y="280" width="160" height="40" rx="4" fill="#111111"/>
  <rect x="120" y="380" width="360" height="240" rx="6" fill="#ffffff" stroke="#e5e5df" stroke-width="1"/>
  <rect x="520" y="380" width="360" height="240" rx="6" fill="#ffffff" stroke="#e5e5df" stroke-width="1"/>
  <rect x="920" y="380" width="360" height="240" rx="6" fill="#ffffff" stroke="#e5e5df" stroke-width="1"/>
</svg>`;

export const SAMPLE_AUDIT: AuditResult = {
  id: 'sample-audit-001',
  url: 'https://example.com',
  timestamp: '2026-10-21T12:00:00.000Z',
  device: 'desktop',
  viewport: { width: 1440, height: 900 },
  documentDimensions: { width: 1440, height: 900 },
  overallScore: 92,
  categories: {
    accessibility: {
      category: 'accessibility',
      name: 'Accessibility',
      score: 85,
      criticalCount: 0,
      highCount: 1,
      mediumCount: 1,
      lowCount: 0,
      totalIssues: 2,
    },
    ux: {
      category: 'ux',
      name: 'User Experience',
      score: 96,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 1,
      lowCount: 0,
      totalIssues: 1,
    },
    visual: {
      category: 'visual',
      name: 'Visual Hierarchy',
      score: 100,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      totalIssues: 0,
    },
    typography: {
      category: 'typography',
      name: 'Typography',
      score: 92,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 1,
      lowCount: 0,
      totalIssues: 1,
    },
    colors: {
      category: 'colors',
      name: 'Colors & Contrast',
      score: 100,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      totalIssues: 0,
    },
    seo: {
      category: 'seo',
      name: 'SEO & Meta',
      score: 80,
      criticalCount: 0,
      highCount: 1,
      mediumCount: 1,
      lowCount: 0,
      totalIssues: 2,
    },
  },
  findings: [
    {
      id: 'f-sample-01',
      number: 1,
      category: 'accessibility',
      severity: 'high',
      title: 'Missing document language declaration',
      description: 'The root <html> element lacks a valid lang attribute, hindering screen reader localization.',
      selector: 'html',
      recommendation: 'Add lang="en" to the root <html> element.',
      sourcePrinciple: 'WCAG 3.1.1 Language of Page (Level A)',
      bbox: { x: 0, y: 0, width: 1440, height: 64 },
    },
    {
      id: 'f-sample-02',
      number: 2,
      category: 'seo',
      severity: 'high',
      title: 'Missing meta description tag',
      description: 'The document <head> does not contain a <meta name="description"> tag for search indexers.',
      selector: 'head',
      recommendation: 'Add a concise meta description summarizing the page content (120-160 characters).',
      sourcePrinciple: 'Google Search Essentials: Meta Tags',
      bbox: { x: 0, y: 0, width: 1440, height: 64 },
    },
    {
      id: 'f-sample-03',
      number: 3,
      category: 'accessibility',
      severity: 'medium',
      title: 'Anchor missing descriptive accessible name',
      description: 'A navigation anchor element relies solely on an icon without an aria-label or accessible text.',
      selector: 'nav a:nth-child(3)',
      recommendation: 'Provide an aria-label="Documentation" or visible label for assistive technology.',
      sourcePrinciple: 'WCAG 4.1.2 Name, Role, Value (Level A)',
      bbox: { x: 1180, y: 18, width: 180, height: 28 },
    },
    {
      id: 'f-sample-04',
      number: 4,
      category: 'seo',
      severity: 'medium',
      title: 'Missing canonical link tag',
      description: 'The page does not declare a canonical URL, risking duplicate content indexation.',
      selector: 'head',
      recommendation: 'Include a <link rel="canonical" href="https://example.com" /> in the head element.',
      sourcePrinciple: 'Google Search Central: Canonicalization',
      bbox: { x: 0, y: 0, width: 1440, height: 64 },
    },
    {
      id: 'f-sample-05',
      number: 5,
      category: 'typography',
      severity: 'medium',
      title: 'Caption font size below 12px threshold',
      description: 'Footnote element uses 11px font size which can cause legibility strain on standard DPI screens.',
      selector: '.footnote',
      recommendation: 'Increase minimum secondary typography size to 12px or 0.75rem.',
      sourcePrinciple: 'UX/UI Design Principles: Minimum Legible Text Size',
      bbox: { x: 120, y: 232, width: 520, height: 20 },
    },
    {
      id: 'f-sample-06',
      number: 6,
      category: 'ux',
      severity: 'medium',
      title: 'Sub-optimal interactive touch target area',
      description: 'Header link has an interactive bounding box under 44px on standard touch-pointer viewports.',
      selector: 'header nav a',
      recommendation: 'Increase padding or min-height to 44px to satisfy WCAG touch target spacing.',
      sourcePrinciple: 'WCAG 2.5.5 Target Size',
      bbox: { x: 76, y: 24, width: 96, height: 16 },
    },
  ],
  screenshot: `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_SCREENSHOT_SVG)}`,
  executionTimeMs: 1420,
  meta: {
    title: 'Example Domain (Specimen Report)',
    description: 'Deterministic specimen audit report demonstrating AUDIT/WEB inspection metrics.',
    totalElements: 48,
    fontsDetected: ['system-ui', '-apple-system', 'sans-serif'],
    colorsDetected: ['#ffffff', '#111111', '#737373', '#f8f7f4'],
  },
};
