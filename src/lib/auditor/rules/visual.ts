import { Page } from 'playwright';
import { AuditFinding } from '@/types/audit';

export async function runVisualAudit(page: Page): Promise<AuditFinding[]> {
  try {
    const rawVisualIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const winWidth = window.innerWidth;

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

      // 1. Horizontal Page Overflow
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body ? document.body.scrollWidth : 0;
      const maxScroll = Math.max(docScrollWidth, bodyScrollWidth);

      if (maxScroll > winWidth + 5) {
        let offendingEl: any = null;
        let maxWidth = winWidth;

        document.querySelectorAll('*').forEach((el: any) => {
          const r = el.getBoundingClientRect();
          if (r.right > winWidth + 5 && r.width > maxWidth) {
            maxWidth = r.width;
            offendingEl = el;
          }
        });

        issues.push({
          rule: 'horizontal-scroll-overflow',
          severity: 'critical',
          title: 'Unintended horizontal page overflow',
          description: `The layout exceeds the viewport width by ${Math.round(maxScroll - winWidth)}px (scrollWidth: ${maxScroll}px vs viewport: ${winWidth}px), causing unwanted horizontal scrolling.`,
          selector: offendingEl ? getCssSelector(offendingEl) : 'html',
          snippet: offendingEl ? (offendingEl.outerHTML || '').slice(0, 160) : '<html>',
          bbox: offendingEl ? getBbox(offendingEl) : { x: 0, y: 0, width: winWidth, height: 100 },
          recommendation: 'Check fixed pixel widths or negative margins. Apply max-w-full, overflow-x-hidden, or responsive container constraints.',
          sourcePrinciple: 'Impeccable Audit & Responsive Craft Floor',
        });
      }

      // 2. Elements with text clipped by overflow:hidden
      const elementsWithOverflow = document.querySelectorAll('div, p, span, section, article');
      let clippedCount = 0;
      elementsWithOverflow.forEach((el) => {
        if (clippedCount >= 3) return;
        const style = window.getComputedStyle(el);
        if (style.overflow === 'hidden' || style.overflowY === 'hidden') {
          if (el.scrollHeight > el.clientHeight + 10 && el.clientHeight > 20 && el.textContent?.trim()) {
            clippedCount++;
            issues.push({
              rule: 'clipped-text-overflow',
              severity: 'medium',
              title: 'Content clipped by container overflow constraints',
              description: `Container has overflow: hidden and clips text content (scrollHeight: ${el.scrollHeight}px vs visible height: ${el.clientHeight}px).`,
              selector: getCssSelector(el),
              snippet: el.outerHTML.slice(0, 160),
              bbox: getBbox(el),
              recommendation: 'Allow container to adjust height dynamically (min-height instead of fixed height) or ensure scrollable access.',
              sourcePrinciple: 'uxui-principles (Content Integrity & Information Availability)',
            });
          }
        }
      });

      // 3. Gestalt Proximity Violation in Headings
      // Impeccable Craft Floor rule: "Tight groups, generous separation, more space above a heading than below it."
      const headings = document.querySelectorAll('h2, h3, h4');
      let headingProximityCount = 0;
      headings.forEach((h) => {
        if (headingProximityCount >= 2) return;
        const prev = h.previousElementSibling;
        if (!prev) return;
        const style = window.getComputedStyle(h);
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;

        if (marginBottom > 0 && marginTop < marginBottom && marginTop < 12) {
          headingProximityCount++;
          issues.push({
            rule: 'gestalt-heading-proximity-inversion',
            severity: 'low',
            title: 'Heading proximity inversion (more space below than above)',
            description: `Heading has margin-top (${Math.round(marginTop)}px) smaller than margin-bottom (${Math.round(marginBottom)}px). By Gestalt proximity, headings must visually bind closer to the content they introduce than preceding sections.`,
            selector: getCssSelector(h),
            snippet: h.outerHTML.slice(0, 160),
            bbox: getBbox(h),
            recommendation: 'Increase margin-top or reduce margin-bottom so the heading visually groups with its body content.',
            sourcePrinciple: 'Impeccable Craft Floor (Spacing Rhythm) & Gestalt Law of Proximity',
          });
        }
      });

      // 4. Fixed width elements breaking mobile/responsive boundaries
      const fixedWidthElements = document.querySelectorAll('div, table, pre, img');
      let fixedWidthCount = 0;
      fixedWidthElements.forEach((el) => {
        if (fixedWidthCount >= 3) return;
        const r = el.getBoundingClientRect();
        if (r.width > winWidth) {
          fixedWidthCount++;
          issues.push({
            rule: 'element-exceeds-viewport',
            severity: 'high',
            title: `Element width (${Math.round(r.width)}px) exceeds viewport width (${winWidth}px)`,
            description: `Element rendered with width of ${Math.round(r.width)}px which breaks outside the current viewport envelope.`,
            selector: getCssSelector(el),
            snippet: el.outerHTML.slice(0, 160),
            bbox: getBbox(el),
            recommendation: 'Apply responsive width rules such as max-width: 100%; or overflow-x: auto; to prevent viewport overflow.',
            sourcePrinciple: 'ui-ux-pro-max & Impeccable Responsive Design Check',
          });
        }
      });

      // 5. Unsized Images causing Cumulative Layout Shift (CLS)
      const images = document.querySelectorAll('img:not([width]):not([height])');
      let unsizedImageCount = 0;
      images.forEach((img) => {
        if (unsizedImageCount >= 3) return;
        const style = window.getComputedStyle(img);
        const hasAspectRatio = style.aspectRatio && style.aspectRatio !== 'auto';
        if (!hasAspectRatio) {
          unsizedImageCount++;
          issues.push({
            rule: 'unsized-image-layout-shift',
            severity: 'medium',
            title: 'Image missing explicit width/height dimensions (risk of CLS)',
            description: 'Image does not declare width/height attributes or CSS aspect-ratio. When the image asset loads asynchronously, it causes sudden cumulative layout shift (CLS).',
            selector: getCssSelector(img),
            snippet: img.outerHTML.slice(0, 160),
            bbox: getBbox(img),
            recommendation: 'Set width and height attributes or CSS aspect-ratio on <img> to reserve layout space prior to image download.',
            sourcePrinciple: 'performance-profiling (Core Web Vitals Cumulative Layout Shift)',
          });
        }
      });

      // 6. DOM Node Count Bloat (> 1500 elements)
      const totalElements = document.querySelectorAll('*').length;
      if (totalElements > 1500) {
        issues.push({
          rule: 'dom-element-bloat',
          severity: totalElements > 3000 ? 'high' : 'low',
          title: `Excessive DOM node count (${totalElements} elements)`,
          description: `Document contains ${totalElements} DOM nodes (recommended ceiling is 1,500). High DOM tree depth increases memory consumption and causes scroll frame drops.`,
          selector: 'body',
          snippet: '<body>...</body>',
          bbox: { x: 0, y: 0, width: winWidth, height: 100 },
          recommendation: 'Virtualize long lists, remove deeply nested wrapping divs, and lazy-load off-screen components.',
          sourcePrinciple: 'performance-profiling & Lighthouse DOM Optimization Standards',
        });
      }

      return issues;
    });

    return rawVisualIssues.map((issue, idx) => ({
      id: `visual-${issue.rule}-${idx + 1}`,
      number: 0,
      category: 'visual',
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
  } catch (err: unknown) {
    console.error('Error running visual audit:', err);
    return [];
  }
}
