import { Page } from 'playwright';
import { AuditFinding } from '@/types/audit';

export async function runUxAudit(page: Page): Promise<AuditFinding[]> {
  try {
    const rawUxIssues = await page.evaluate(() => {
      const issues: any[] = [];

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
        if (rect.width === 0 && rect.height === 0) return null;
        return {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      };

      // 1. Fitts's Law: Touch Target Minimum Size (< 44x44px)
      // Reference: uxui-principles (Principle #12 - Fitts's Law), ui-ux-pro-max, WCAG 2.5.5
      const interactiveElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
      let smallTargetCount = 0;
      interactiveElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

        if ((rect.width < 32 || rect.height < 32) && smallTargetCount < 3) {
          smallTargetCount++;
          issues.push({
            rule: 'fitts-law-touch-target',
            severity: 'medium',
            title: `Touch target too small (${Math.round(rect.width)}x${Math.round(rect.height)}px)`,
            description: `Element clickable area (${Math.round(rect.width)}x${Math.round(rect.height)}px) violates Fitts's Law and WCAG 2.5.5 touch target guidelines (minimum 44x44px on mobile, 32px on desktop).`,
            selector: getCssSelector(el),
            snippet: el.outerHTML.slice(0, 160),
            bbox: getBbox(el),
            recommendation: 'Increase touch area using min-width: 44px; min-height: 44px; or generous padding.',
            sourcePrinciple: 'uxui-principles (Fitts’s Law) & Impeccable Craft Floor',
          });
        }
      });

      // 2. Broken or Placeholder Links
      const links = document.querySelectorAll('a');
      let emptyLinkCount = 0;
      links.forEach((link) => {
        const href = link.getAttribute('href');
        const text = (link.textContent || '').trim();
        const ariaLabel = link.getAttribute('aria-label');
        const hasAria = !!ariaLabel || !!link.querySelector('img[alt]');

        if ((!href || href === '#' || href === 'javascript:void(0);' || href === 'javascript:;') && emptyLinkCount < 3) {
          emptyLinkCount++;
          issues.push({
            rule: 'empty-or-placeholder-link',
            severity: 'high',
            title: 'Dead or placeholder link anchor',
            description: `Link has href="${href || ''}", causing an unintended page scroll jump or dead interaction.`,
            selector: getCssSelector(link),
            snippet: link.outerHTML.slice(0, 160),
            bbox: getBbox(link),
            recommendation: 'Replace with semantic <button type="button"> for UI actions or supply valid URL destination.',
            sourcePrinciple: 'Nielsen Norman Heuristics (Consistency & Standards)',
          });
        }

        const lower = text.toLowerCase();
        if ((lower === 'click here' || lower === 'read more' || lower === 'more' || lower === 'link') && !hasAria) {
          issues.push({
            rule: 'vague-link-text',
            severity: 'medium',
            title: `Ambiguous link text ("${text}")`,
            description: 'Link text lacks descriptive context when encountered by screen readers or users scanning the layout.',
            selector: getCssSelector(link),
            snippet: link.outerHTML.slice(0, 160),
            bbox: getBbox(link),
            recommendation: 'Make link text inform the user of the destination (e.g. "View Pricing Plans") or provide aria-label.',
            sourcePrinciple: 'uxui-principles (Information Foraging & Scent)',
          });
        }
      });

      // 3. Fake Interactive Elements (div/span styled with cursor:pointer)
      const fakeButtons = document.querySelectorAll('div, span, p, i');
      let fakeBtnCount = 0;
      fakeButtons.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.cursor === 'pointer' && !el.closest('button, a, label, [role="button"]') && fakeBtnCount < 3) {
          const role = el.getAttribute('role');
          const tabIndex = el.getAttribute('tabindex');
          if (!role && tabIndex === null) {
            fakeBtnCount++;
            issues.push({
              rule: 'non-semantic-interactive',
              severity: 'high',
              title: 'Non-semantic element styled as interactive control',
              description: `<${el.tagName.toLowerCase()}> has CSS cursor: pointer, but lacks role="button" or keyboard accessibility (tabindex="0").`,
              selector: getCssSelector(el),
              snippet: el.outerHTML.slice(0, 160),
              bbox: getBbox(el),
              recommendation: 'Replace with native <button> or provide role="button", tabindex="0", and Enter/Space keyboard handlers.',
              sourcePrinciple: 'Impeccable Craft Floor (Working Controls & Keyboard Focus)',
            });
          }
        }
      });

      // 4. Missing Form Labels
      const formControls = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
      let unlabeledCount = 0;
      formControls.forEach((input) => {
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
        const isWrappedByLabel = !!input.closest('label');
        const ariaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
        const placeholder = input.getAttribute('placeholder');

        if (!hasLabel && !isWrappedByLabel && !ariaLabel && unlabeledCount < 3) {
          unlabeledCount++;
          issues.push({
            rule: 'missing-form-label',
            severity: 'high',
            title: 'Form control lacks persistent accessible label',
            description: placeholder
              ? `Input relies solely on placeholder="${placeholder}". Placeholders disappear on keystroke and do not meet label standards.`
              : 'Form input lacks an associated <label> or aria-label.',
            selector: getCssSelector(input),
            snippet: input.outerHTML.slice(0, 160),
            bbox: getBbox(input),
            recommendation: 'Provide a visible <label for="..."> or aria-label describing the input purpose.',
            sourcePrinciple: 'uxui-principles & Nielsen Norman Form Usability Guidelines',
          });
        }
      });

      // 5. Hick's Law: Excessive Top-Level Choices / Cluttered Navigation
      const navMenus = document.querySelectorAll('nav, header ul');
      navMenus.forEach((nav) => {
        const directLinks = nav.querySelectorAll(':scope > li, :scope > a, :scope > div > a');
        if (directLinks.length > 9) {
          issues.push({
            rule: 'hicks-law-choice-overload',
            severity: 'medium',
            title: `Navigation choice overload (${directLinks.length} top-level options)`,
            description: `Navigation presents ${directLinks.length} direct options simultaneously, violating Hick's Law (decision time increases logarithmically with choice count).`,
            selector: getCssSelector(nav),
            snippet: nav.outerHTML.slice(0, 160),
            bbox: getBbox(nav),
            recommendation: 'Group secondary links under categorical dropdowns or a consolidated menu to reduce cognitive load.',
            sourcePrinciple: 'uxui-principles (Hick’s Law & Miller’s 7±2 Rule)',
          });
        }
      });

      // 6. Form CRO: Missing Autocomplete on Standard Personal Inputs
      const sensitiveInputs = document.querySelectorAll('input[type="email"], input[type="tel"], input[type="password"], input[name*="name"], input[name*="phone"], input[name*="email"], input[name*="postal"], input[name*="zip"]');
      let missingAutocompleteCount = 0;
      sensitiveInputs.forEach((input) => {
        const autocomplete = input.getAttribute('autocomplete');
        if ((!autocomplete || autocomplete === 'off') && missingAutocompleteCount < 3) {
          missingAutocompleteCount++;
          const type = input.getAttribute('type') || 'text';
          const name = input.getAttribute('name') || '';
          issues.push({
            rule: 'form-cro-missing-autocomplete',
            severity: 'low',
            title: `Form input missing autocomplete attribute (<input type="${type}">)`,
            description: `Input (${name ? `name="${name}"` : `type="${type}"`}) does not specify a standard browser autocomplete attribute. Autocomplete reduces user typing friction by up to 30%.`,
            selector: getCssSelector(input),
            snippet: input.outerHTML.slice(0, 160),
            bbox: getBbox(input),
            recommendation: `Add appropriate autocomplete attribute (e.g. autocomplete="email", autocomplete="tel", autocomplete="given-name").`,
            sourcePrinciple: 'form-cro (Form Ergonomics & Conversion Rate Optimization)',
          });
        }
      });

      // 7. Form CRO: Missing numeric inputmode on numeric fields
      const numericCandidates = document.querySelectorAll('input[name*="phone"], input[name*="tel"], input[name*="zip"], input[name*="postal"], input[name*="pin"], input[name*="cvv"], input[name*="card"]');
      let missingInputModeCount = 0;
      numericCandidates.forEach((input) => {
        const inputmode = input.getAttribute('inputmode');
        const type = input.getAttribute('type');
        if (!inputmode && type !== 'number' && missingInputModeCount < 2) {
          missingInputModeCount++;
          issues.push({
            rule: 'form-cro-missing-inputmode',
            severity: 'low',
            title: 'Numeric input missing mobile inputmode="numeric"',
            description: 'Mobile keyboards will default to full QWERTY keyboard instead of a dedicated number pad for numeric data entry.',
            selector: getCssSelector(input),
            snippet: input.outerHTML.slice(0, 160),
            bbox: getBbox(input),
            recommendation: 'Add inputmode="numeric" or inputmode="tel" to trigger the numerical keypad on touch devices.',
            sourcePrinciple: 'form-cro (Mobile Touch Input Ergonomics)',
          });
        }
      });

      return issues;
    });

    return rawUxIssues.map((issue, idx) => ({
      id: `ux-${issue.rule}-${idx + 1}`,
      number: 0,
      category: 'ux',
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
    console.error('Error running UX audit:', err);
    return [];
  }
}
