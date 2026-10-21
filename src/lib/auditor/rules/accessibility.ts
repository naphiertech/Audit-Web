import { Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { AuditFinding, Severity } from '@/types/audit';

export async function runAccessibilityAudit(page: Page): Promise<AuditFinding[]> {
  try {
    // Inject axe-core
    const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');
    const axeScript = fs.readFileSync(axePath, 'utf8');
    await page.evaluate(axeScript);

    // Run axe in page context
    const axeResults = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally
      const results = await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
        },
      });

      return results.violations.map((v: any) => {
        return {
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.slice(0, 3).map((n: any) => {
            const el = document.querySelector(n.target.join(' '));
            let bbox = null;
            if (el) {
              const rect = el.getBoundingClientRect();
              bbox = {
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height,
              };
            }
            return {
              target: n.target.join(' '),
              html: n.html ? n.html.slice(0, 200) : '',
              failureSummary: n.failureSummary,
              bbox,
            };
          }),
        };
      });
    });

    const findings: AuditFinding[] = [];
    let counter = 1;

    for (const v of axeResults) {
      let severity: Severity = 'medium';
      if (v.impact === 'critical') severity = 'critical';
      else if (v.impact === 'serious') severity = 'high';
      else if (v.impact === 'moderate') severity = 'medium';
      else if (v.impact === 'minor') severity = 'low';

      for (const node of v.nodes) {
        findings.push({
          id: `a11y-${v.id}-${counter++}`,
          number: 0, // Assigned in scoring deduplication
          category: 'accessibility',
          severity,
          title: v.help || v.description,
          description: `${v.description}. ${node.failureSummary || ''}`.trim(),
          selector: node.target || 'body',
          snippet: node.html,
          bbox: node.bbox || undefined,
          recommendation: `Ensure WCAG compliance: ${v.helpUrl ? `Review WCAG reference at ${v.helpUrl}.` : ''} Fix: ${v.help}`,
          isHeuristic: false,
        });
      }
    }

    return findings;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error running accessibility audit:', message);
    return [
      {
        id: 'a11y-error',
        number: 1,
        category: 'accessibility',
        severity: 'low',
        title: 'Accessibility audit encountered an unexpected evaluation error',
        description: `Could not complete full axe-core pass: ${message}`,
        selector: 'body',
        recommendation: 'Verify target site allows client script execution.',
        isHeuristic: true,
      },
    ];
  }
}
