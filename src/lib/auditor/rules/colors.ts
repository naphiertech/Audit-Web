import { Page } from 'playwright';
import { AuditFinding } from '@/types/audit';

export async function runColorsAudit(page: Page): Promise<{
  findings: AuditFinding[];
  colorsDetected: string[];
}> {
  try {
    const result = await page.evaluate(() => {
      const issues: any[] = [];
      const colorsSet = new Set<string>();

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

      const parseRgb = (colorStr: string): [number, number, number, number] | null => {
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return null;
        return [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          match[4] !== undefined ? parseFloat(match[4]) : 1,
        ];
      };

      const getLuminance = (r: number, g: number, b: number): number => {
        const a = [r, g, b].map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      };

      const getContrastRatio = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
        const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
        const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      };

      const findEffectiveBgColor = (el: Element): [number, number, number] => {
        let current: Element | null = el;
        while (current && current !== document.documentElement) {
          const style = window.getComputedStyle(current);
          const bg = parseRgb(style.backgroundColor);
          if (bg && bg[3] > 0.6) {
            return [bg[0], bg[1], bg[2]];
          }
          current = current.parentElement;
        }
        return [255, 255, 255];
      };

      // 1. Text to Background Contrast
      const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button');
      let lowContrastCount = 0;

      textElements.forEach((el) => {
        if (lowContrastCount >= 3) return;
        const text = (el.textContent || '').trim();
        if (text.length < 3) return;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

        const textColor = parseRgb(style.color);
        if (!textColor || textColor[3] < 0.2) return;

        const rgbText: [number, number, number] = [textColor[0], textColor[1], textColor[2]];
        const rgbBg = findEffectiveBgColor(el);

        const ratio = getContrastRatio(rgbText, rgbBg);
        const fontSize = parseFloat(style.fontSize);
        const isBold = parseInt(style.fontWeight, 10) >= 600 || style.fontWeight === 'bold';
        const isLarge = fontSize >= 24 || (fontSize >= 18.5 && isBold);
        const requiredRatio = isLarge ? 3.0 : 4.5;

        colorsSet.add(`rgb(${rgbText.join(',')})`);
        colorsSet.add(`rgb(${rgbBg.join(',')})`);

        if (ratio < requiredRatio && ratio > 1.05) {
          lowContrastCount++;
          issues.push({
            rule: 'low-color-contrast',
            severity: ratio < 2.5 ? 'critical' : 'high',
            title: `Low text contrast ratio (${ratio.toFixed(2)}:1)`,
            description: `Text element has a contrast ratio of ${ratio.toFixed(2)}:1 against its background, failing WCAG AA requirement of ${requiredRatio}:1.`,
            selector: getCssSelector(el),
            snippet: el.outerHTML.slice(0, 160),
            bbox: getBbox(el),
            recommendation: `Increase contrast between text (${style.color}) and background to meet minimum ${requiredRatio}:1 ratio.`,
            sourcePrinciple: 'WCAG 1.4.3 & Impeccable Craft Floor (Contrast ≥4.5:1)',
          });
        }
      });

      // 2. Links distinguishable only by color (no underline)
      const paragraphLinks = document.querySelectorAll('p a, li a');
      let linkUnderlineIssueCount = 0;
      paragraphLinks.forEach((link) => {
        if (linkUnderlineIssueCount >= 2) return;
        const style = window.getComputedStyle(link);
        const parentStyle = link.parentElement ? window.getComputedStyle(link.parentElement) : null;

        if (
          style.textDecorationLine === 'none' &&
          parentStyle &&
          style.color !== parentStyle.color
        ) {
          linkUnderlineIssueCount++;
          issues.push({
            rule: 'link-color-only-distinction',
            severity: 'medium',
            title: 'Inline link distinguished only by color',
            description: 'Link inside running text relies exclusively on color without an underline or icon. Users with color vision deficiencies may not perceive it as interactive.',
            selector: getCssSelector(link),
            snippet: link.outerHTML.slice(0, 160),
            bbox: getBbox(link),
            recommendation: 'Add text-decoration: underline; or an indicator icon so links are distinguishable independent of color perception.',
            sourcePrinciple: 'uxui-principles (Perceivable Distinctions) & WCAG 1.4.1',
          });
        }
      });

      return {
        issues,
        colorsDetected: Array.from(colorsSet).slice(0, 12),
      };
    });

    const findings: AuditFinding[] = result.issues.map((issue: any, idx: number) => ({
      id: `color-${issue.rule}-${idx + 1}`,
      number: 0,
      category: 'colors',
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
      colorsDetected: result.colorsDetected,
    };
  } catch (err: unknown) {
    console.error('Error running colors audit:', err);
    return { findings: [], colorsDetected: [] };
  }
}
