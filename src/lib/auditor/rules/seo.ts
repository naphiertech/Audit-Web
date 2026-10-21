import { Page } from 'playwright';
import { AuditFinding } from '@/types/audit';

export async function runSeoAudit(page: Page): Promise<AuditFinding[]> {
  try {
    const rawSeoIssues = await page.evaluate(() => {
      const issues: any[] = [];

      // 1. Title Tag
      const titleEl = document.querySelector('title');
      const titleText = titleEl ? (titleEl.textContent || '').trim() : '';

      if (!titleEl || !titleText) {
        issues.push({
          rule: 'seo-missing-title',
          severity: 'high',
          title: 'Missing or empty <title> tag',
          description: 'Document does not define a page title. Search engines and browser tabs rely on <title> as the primary identifier.',
          selector: 'head',
          snippet: '<head>...</head>',
          recommendation: 'Add a descriptive <title> tag within <head> (recommended 30–60 characters).',
          sourcePrinciple: 'seo-audit (Search Engine Indexation & Tab Identification)',
        });
      } else if (titleText.length < 15) {
        issues.push({
          rule: 'seo-short-title',
          severity: 'medium',
          title: `Page title is too brief (${titleText.length} characters)`,
          description: `Current title "${titleText}" is too short to provide meaningful context for search engine results.`,
          selector: 'title',
          snippet: titleEl.outerHTML,
          recommendation: 'Expand title to 30–60 characters including brand and primary page topic.',
          sourcePrinciple: 'seo-audit (Title Optimization)',
        });
      } else if (titleText.length > 70) {
        issues.push({
          rule: 'seo-long-title',
          severity: 'low',
          title: `Page title exceeds search snippet limit (${titleText.length} characters)`,
          description: `Title length (${titleText.length} chars) will likely be truncated with an ellipsis on search engine results pages (SERPs).`,
          selector: 'title',
          snippet: titleEl.outerHTML,
          recommendation: 'Shorten title to under 60 characters so it fits on Google desktop and mobile SERPs.',
          sourcePrinciple: 'seo-audit (SERP Snippet Truncation)',
        });
      }

      // 2. Meta Description
      const descEl = document.querySelector('meta[name="description"]');
      const descContent = descEl ? (descEl.getAttribute('content') || '').trim() : '';

      if (!descEl || !descContent) {
        issues.push({
          rule: 'seo-missing-description',
          severity: 'high',
          title: 'Missing meta description tag',
          description: 'Document lacks a <meta name="description"> tag. Search engines may generate arbitrary text snippets from page content.',
          selector: 'head',
          snippet: '<head>...</head>',
          recommendation: 'Add <meta name="description" content="..."> summarizing the page in 70–155 characters.',
          sourcePrinciple: 'seo-audit (Search Snippet Click-Through Rate)',
        });
      } else if (descContent.length < 50) {
        issues.push({
          rule: 'seo-short-description',
          severity: 'low',
          title: `Meta description is short (${descContent.length} characters)`,
          description: 'Meta description is under 50 characters, missing an opportunity to describe the value proposition to searchers.',
          selector: 'meta[name="description"]',
          snippet: descEl.outerHTML,
          recommendation: 'Expand description to 70–155 characters with targeted keywords.',
          sourcePrinciple: 'seo-audit (Description Scent & Foraging)',
        });
      }

      // 3. Viewport Meta Tag
      const viewportEl = document.querySelector('meta[name="viewport"]');
      if (!viewportEl || !viewportEl.getAttribute('content')) {
        issues.push({
          rule: 'seo-missing-viewport',
          severity: 'critical',
          title: 'Missing responsive <meta name="viewport"> tag',
          description: 'Page has no viewport meta tag, causing mobile browsers to render in desktop emulation mode and heavily penalizing mobile search ranking.',
          selector: 'head',
          snippet: '<head>...</head>',
          recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to <head>.',
          sourcePrinciple: 'Mobile-First Indexing & Responsive Web Standards',
        });
      }

      // 4. Canonical URL Link
      const canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl || !canonicalEl.getAttribute('href')) {
        issues.push({
          rule: 'seo-missing-canonical',
          severity: 'medium',
          title: 'Missing canonical URL (<link rel="canonical">)',
          description: 'Document does not declare a canonical URL. Search engines may index duplicate URL variations (e.g. trailing slashes, query parameters).',
          selector: 'head',
          snippet: '<head>...</head>',
          recommendation: 'Declare <link rel="canonical" href="https://example.com/canonical-path" /> to consolidate ranking signals.',
          sourcePrinciple: 'seo-audit (Canonical URL Architecture)',
        });
      }

      // 5. OpenGraph Social Sharing Metadata
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogImage = document.querySelector('meta[property="og:image"]');

      if (!ogTitle || !ogImage) {
        const missing: string[] = [];
        if (!ogTitle) missing.push('og:title');
        if (!ogImage) missing.push('og:image');

        issues.push({
          rule: 'seo-missing-opengraph',
          severity: 'medium',
          title: `Incomplete OpenGraph metadata (missing ${missing.join(', ')})`,
          description: `Social sharing platforms (Slack, Twitter/X, LinkedIn, Discord) will fail to generate visual link preview cards without ${missing.join(' and ')}.`,
          selector: 'head',
          snippet: '<head>...</head>',
          recommendation: `Add <meta property="og:title" content="..."> and <meta property="og:image" content="https://..."> (1200x630px recommended).`,
          sourcePrinciple: 'seo-audit (Social Media Card Indexation)',
        });
      }

      // 6. Robots Noindex Detection
      const robotsEl = document.querySelector('meta[name="robots"]');
      if (robotsEl) {
        const content = (robotsEl.getAttribute('content') || '').toLowerCase();
        if (content.includes('noindex')) {
          issues.push({
            rule: 'seo-robots-noindex',
            severity: 'high',
            title: 'Robots meta tag explicitly blocks indexing ("noindex")',
            description: `Document contains <meta name="robots" content="${content}"> which instructs search engine crawlers not to index this page.`,
            selector: 'meta[name="robots"]',
            snippet: robotsEl.outerHTML,
            recommendation: 'Remove "noindex" directive if this is a public production page meant to appear in search results.',
            sourcePrinciple: 'seo-audit (Crawlability & Indexability Safeguards)',
          });
        }
      }

      // 7. HTML Lang Attribute
      const htmlEl = document.documentElement;
      const lang = htmlEl.getAttribute('lang');
      if (!lang || !lang.trim()) {
        issues.push({
          rule: 'seo-missing-html-lang',
          severity: 'medium',
          title: 'Root <html> element missing lang attribute',
          description: 'Search engines and screen readers cannot determine the language of the content, which impairs regional search targeting and text-to-speech pronunciation.',
          selector: 'html',
          snippet: `<html${htmlEl.className ? ` class="${htmlEl.className}"` : ''}>`,
          recommendation: 'Specify the primary document language (e.g. <html lang="en">).',
          sourcePrinciple: 'WCAG 3.1.1 (Language of Page) & International SEO',
        });
      }

      return issues;
    });

    return rawSeoIssues.map((issue: any, index: number) => ({
      id: `finding-seo-${Date.now()}-${index}`,
      number: 0,
      category: 'seo',
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      selector: issue.selector,
      snippet: issue.snippet,
      recommendation: issue.recommendation,
      isHeuristic: false,
      sourcePrinciple: issue.sourcePrinciple,
    }));
  } catch (err) {
    console.warn('Failed to run SEO audit pass:', err);
    return [];
  }
}
