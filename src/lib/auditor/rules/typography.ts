import { Page } from 'playwright';
import { AuditFinding } from '@/types/audit';

export async function runTypographyAudit(page: Page): Promise<{
  findings: AuditFinding[];
  fontsDetected: string[];
}> {
  try {
    const result = await page.evaluate(() => {
      const issues: any[] = [];
      const fontsSet = new Set<string>();

      const getCssSelector = (el: Element): string => {
        if (el.id) return `#${CSS.escape(el.id)}`;
        const tagName = el.tagName.toLowerCase();
        const classes = Array.from(el.classList)
          .filter((c) => !c.includes(':') && !c.includes('['))
          .slice(0, 2)
          .map((c) => `.${CSS.escape(c)}`)
          .join('');
        const parent = el.parentElement;
        if (!parent || parent.tagName === 'BODY') return `${tagName}${classes}`;
        return `${parent.tagName.toLowerCase()} > ${tagName}${classes}`;
      };

      const getBbox = (el: Element) => {
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      };

      // Collect font families
      document.querySelectorAll('body, h1, h2, h3, h4, h5, h6, p, a, button, input, span').forEach((el) => {
        const style = window.getComputedStyle(el);
        const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        if (family) fontsSet.add(family);
      });

      // 1. Heading Hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const h1s = headings.filter((h) => h.tagName.toLowerCase() === 'h1');

      if (h1s.length === 0) {
        issues.push({
          rule: 'missing-h1',
          severity: 'high',
          title: 'Document lacks a main <h1> heading',
          description: 'No <h1> heading was located in the document. A primary <h1> is essential for semantic outline, cognitive landmark anchoring, and screen readers.',
          selector: 'body',
          snippet: '<body>...</body>',
          bbox: { x: 0, y: 0, width: 300, height: 40 },
          recommendation: 'Add a semantic <h1> at the top of the main content area summarizing the page topic.',
          sourcePrinciple: 'Impeccable Typeset & WCAG Document Structure',
        });
      } else if (h1s.length > 1) {
        issues.push({
          rule: 'multiple-h1',
          severity: 'medium',
          title: `Multiple <h1> headings found (${h1s.length})`,
          description: `Page contains ${h1s.length} separate <h1> tags. Using a single <h1> clarifies document hierarchy.`,
          selector: getCssSelector(h1s[1]),
          snippet: h1s[1].outerHTML.slice(0, 160),
          bbox: getBbox(h1s[1]),
          recommendation: 'Demote secondary <h1> headings to <h2> to maintain a strict visual and semantic hierarchy.',
          sourcePrinciple: 'Impeccable Typeset & Editorial Hierarchy',
        });
      }

      // Heading level skipping
      let lastLevel = 0;
      for (const h of headings) {
        const level = parseInt(h.tagName.substring(1), 10);
        if (lastLevel > 0 && level > lastLevel + 1) {
          issues.push({
            rule: 'skipped-heading-level',
            severity: 'medium',
            title: `Heading level skipped: <h${lastLevel}> to <h${level}>`,
            description: `Heading structure jumps from <h${lastLevel}> directly to <h${level}>, skipping intermediate levels.`,
            selector: getCssSelector(h),
            snippet: h.outerHTML.slice(0, 160),
            bbox: getBbox(h),
            recommendation: `Change <h${level}> to <h${lastLevel + 1}> or adjust prior headings to keep an unbroken hierarchy.`,
            sourcePrinciple: 'uxui-principles & Semantic Document Hierarchy',
          });
          break;
        }
        lastLevel = level;
      }

      // 2. Minimum Font Size Legibility (< 12px)
      const textElements = document.querySelectorAll('p, span, li, a');
      let smallTextCount = 0;
      textElements.forEach((el) => {
        if (smallTextCount >= 3) return;
        const text = (el.textContent || '').trim();
        if (text.length < 5) return;

        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);

        if (fontSize < 12 && style.display !== 'none' && style.visibility !== 'hidden') {
          smallTextCount++;
          issues.push({
            rule: 'small-font-size',
            severity: 'high',
            title: `Font size below readable threshold (${fontSize}px)`,
            description: `Text element renders at ${fontSize}px, below the minimum readable standard of 12px (recommended 15-16px for comfortable reading).`,
            selector: getCssSelector(el),
            snippet: el.outerHTML.slice(0, 160),
            bbox: getBbox(el),
            recommendation: 'Increase font-size to at least 14-16px for body copy or minimum 12px for micro-captions.',
            sourcePrinciple: 'ui-ux-pro-max & Impeccable Typography Floor',
          });
        }
      });

      // 3. Line Height / Leading (< 1.25 or > 2.2)
      let badLineHeightCount = 0;
      textElements.forEach((el) => {
        if (badLineHeightCount >= 3) return;
        const text = (el.textContent || '').trim();
        if (text.length < 60) return;

        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const lineHeight = parseFloat(style.lineHeight);

        if (!isNaN(lineHeight) && fontSize > 0) {
          const ratio = lineHeight / fontSize;
          if (ratio < 1.25) {
            badLineHeightCount++;
            issues.push({
              rule: 'cramped-line-height',
              severity: 'medium',
              title: `Cramped line height (${ratio.toFixed(2)}x)`,
              description: `Paragraph text has a tight line-height ratio of ${ratio.toFixed(2)}, causing ascenders and descenders to collide.`,
              selector: getCssSelector(el),
              snippet: el.outerHTML.slice(0, 160),
              bbox: getBbox(el),
              recommendation: 'Set line-height to 1.5 - 1.6 for comfortable body text reading rhythm.',
              sourcePrinciple: 'ui-ux-pro-max & Impeccable Craft Floor (Vertical Rhythm)',
            });
          }
        }
      });

      // 4. Optimal Measure / Line Length (> 85ch or > 800px)
      // Reference: Impeccable Craft Floor: "body measure 65-75ch"
      const paragraphs = document.querySelectorAll('p');
      let longLineCount = 0;
      paragraphs.forEach((p) => {
        if (longLineCount >= 2) return;
        const text = (p.textContent || '').trim();
        const rect = p.getBoundingClientRect();
        if (rect.width > 800 && text.length > 140) {
          longLineCount++;
          issues.push({
            rule: 'excessive-measure-length',
            severity: 'low',
            title: `Excessive reading measure (${Math.round(rect.width)}px)`,
            description: `Paragraph spans ${Math.round(rect.width)}px across the viewport. Typographic best practices advise keeping line length between 65 and 75 characters (max ~750px) to prevent eye fatigue.`,
            selector: getCssSelector(p),
            snippet: p.outerHTML.slice(0, 160),
            bbox: getBbox(p),
            recommendation: 'Add max-width: 65ch; or container envelope constraints to maintain comfortable reading rhythm.',
            sourcePrinciple: 'Impeccable Craft Floor (Body Measure 65-75ch)',
          });
        }
      });

      // 5. Excessive font families (> 4)
      const uniqueFamilies = Array.from(fontsSet);
      if (uniqueFamilies.length > 4) {
        issues.push({
          rule: 'too-many-font-families',
          severity: 'low',
          title: `Excessive font family variance (${uniqueFamilies.length} families)`,
          description: `Detected ${uniqueFamilies.length} distinct font families: ${uniqueFamilies.slice(0, 5).join(', ')}. Dilutes visual identity and inflates page load weight.`,
          selector: 'body',
          snippet: `Fonts: ${uniqueFamilies.slice(0, 5).join(', ')}`,
          bbox: { x: 0, y: 0, width: 200, height: 50 },
          recommendation: 'Standardize on 1-2 primary typefaces (e.g. 1 body font and 1 mono/display font).',
          sourcePrinciple: 'Impeccable Craft Floor & ui-ux-pro-max',
        });
      }

      return {
        issues,
        fontsDetected: uniqueFamilies,
      };
    });

    const findings: AuditFinding[] = result.issues.map((issue: any, idx: number) => ({
      id: `typo-${issue.rule}-${idx + 1}`,
      number: 0,
      category: 'typography',
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      selector: issue.selector,
      snippet: issue.snippet,
      bbox: issue.bbox || undefined,
      recommendation: issue.recommendation,
      sourcePrinciple: issue.sourcePrinciple,
      isHeuristic: false,
    }));

    return {
      findings,
      fontsDetected: result.fontsDetected,
    };
  } catch (err: unknown) {
    console.error('Error running typography audit:', err);
    return { findings: [], fontsDetected: [] };
  }
}
