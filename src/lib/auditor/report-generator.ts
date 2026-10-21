import { AuditResult, AuditFinding, Severity } from '@/types/audit';

/**
 * Generates an AGENTS.md document specifically optimized for frontier AI coding models
 * (Claude 3.7 / 3.5 Sonnet, GPT-4o / o1 / o3, Gemini 2.5 Flash / Pro, Groq Llama 3.3).
 *
 * Provides:
 * 1. Strict Agent Execution Persona and Guardrails
 * 2. Prioritized Task Checklist (- [ ]) sorted Critical -> High -> Medium -> Low
 * 3. Exact Element Selectors and Source-Code Search Regex/Patterns
 * 4. Root Cause Explanations and Surgical Remediation Diffs (Before vs After)
 * 5. Deterministic Verification Criteria for the agent to verify its fixes
 */
export function generateAgentsMarkdown(result: AuditResult): string {
  const date = new Date(result.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const lines: string[] = [];

  // Machine-Readable Header & Agent Context
  lines.push(`# AGENTS.md — Autonomous Remediation Protocol`);
  lines.push(`> Target URL: \`${result.url}\` | Viewport: \`${result.device.toUpperCase()} (${result.viewport.width}x${result.viewport.height})\` | Date: \`${date}\``);
  lines.push(`> Overall Quality Score: **${result.overallScore} / 100** | Total Defects: **${result.findings.length}**`);
  lines.push(``);

  // Agent Operating Contract
  lines.push(`## 1. Agent Operating Directives`);
  lines.push(``);
  lines.push(`You are a Principal Frontend Engineer and Accessibility Specialist. Your objective is to resolve all flagged defects in the target codebase with surgical precision.`);
  lines.push(``);
  lines.push(`### Mandatory Rules:`);
  lines.push(`1. **Surgical Scope**: Modify ONLY the files and components directly causing the flagged violations. Do not refactor unrelated working logic or reformat unaffected lines.`);
  lines.push(`2. **No Placeholders**: Never write \`// ... rest of code\` or omit implementation details. Provide complete, runnable code changes.`);
  lines.push(`3. **Zero Regressions**: Preserve existing design tokens, CSS variables, event handlers, and responsive behavior.`);
  lines.push(`4. **Priority Sequence**: Resolve **CRITICAL** issues first, followed by **HIGH**, **MEDIUM**, and **LOW**.`);
  lines.push(`5. **Verification**: After modifying each component, verify the fix against the listed "Verification Criterion" before marking the task complete.`);
  lines.push(``);

  // Executive Scorecard
  lines.push(`## 2. Quality Scorecard`);
  lines.push(``);
  lines.push(`| Category | Score | Status | Critical | High | Medium | Low | Total Issues |`);
  lines.push(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`);
  lines.push(`| **Overall System** | **${result.overallScore} / 100** | ${getScoreStatus(result.overallScore)} | ${countSeverity(result, 'critical')} | ${countSeverity(result, 'high')} | ${countSeverity(result, 'medium')} | ${countSeverity(result, 'low')} | **${result.findings.length}** |`);

  for (const cat of Object.values(result.categories)) {
    lines.push(`| ${cat.name} | ${cat.score} / 100 | ${getScoreStatus(cat.score)} | ${cat.criticalCount} | ${cat.highCount} | ${cat.mediumCount} | ${cat.lowCount} | ${cat.totalIssues} |`);
  }
  lines.push(``);

  if (result.isVetoApplied) {
    lines.push(`> ⚠️ **CRITICAL COMPLIANCE NOTICE**: Non-Compliance Ceiling enforced.`);
    lines.push(`> ${result.vetoReason}`);
    lines.push(``);
  }

  if (result.totalChecksEvaluated) {
    lines.push(`> **Audit Coverage**: ${result.totalChecksPassed} / ${result.totalChecksEvaluated} automated standards passed.`);
    lines.push(``);
  }

  if (result.findings.length === 0) {
    lines.push(`## 3. Remediation Checklist`);
    lines.push(``);
    lines.push(`- [x] All automated checks passed with 100/100 score. No remediation required.`);
    return lines.join('\n');
  }

  // Sorted findings: Critical -> High -> Medium -> Low
  const severityWeight: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sortedFindings = [...result.findings].sort(
    (a, b) => severityWeight[a.severity] - severityWeight[b.severity]
  );

  // Interactive Task List
  lines.push(`## 3. Prioritized Action Checklist`);
  lines.push(``);
  sortedFindings.forEach((f) => {
    lines.push(`- [ ] **[${f.severity.toUpperCase()}]** \`#${f.number}\`: ${f.title} (\`${f.category}\` on \`${f.selector}\`)`);
  });
  lines.push(``);

  // Detailed Playbook for Every Finding
  lines.push(`## 4. Defect Remediation Playbook`);
  lines.push(``);

  sortedFindings.forEach((f) => {
    lines.push(`### Defect #${f.number}: ${f.title}`);
    lines.push(``);
    lines.push(`- **Severity**: \`${f.severity.toUpperCase()}\``);
    lines.push(`- **Category**: \`${f.category.toUpperCase()}\``);
    if (f.sourcePrinciple) {
      lines.push(`- **Governing Standard / Principle**: \`${f.sourcePrinciple}\``);
    }
    lines.push(`- **Target DOM Selector**: \`${f.selector}\``);
    if (f.instancesCount && f.instancesCount > 1) {
      lines.push(`- **Component Cluster**: \`${f.instancesCount} instances detected across elements\``);
      if (f.instanceSelectors && f.instanceSelectors.length > 1) {
        lines.push(`- **Other Selectors**: \`${f.instanceSelectors.slice(1, 6).join('`, `')}${f.instanceSelectors.length > 6 ? '…' : ''}\``);
      }
    }
    if (f.bbox) {
      lines.push(`- **Rendered Coordinates**: \`x: ${Math.round(f.bbox.x)}px, y: ${Math.round(f.bbox.y)}px | ${Math.round(f.bbox.width)}x${Math.round(f.bbox.height)}px\``);
    }
    lines.push(``);

    // File Locator Guide for AI
    lines.push(`#### Component Discovery Hint`);
    lines.push(`Search your repository using tools like \`grep\` or \`ripgrep\` to locate the source template or component:`);
    lines.push(`\`\`\`bash`);
    lines.push(generateSearchCommand(f));
    lines.push(`\`\`\``);
    lines.push(``);

    // Failure Cause
    lines.push(`#### Root Cause`);
    lines.push(`${f.description}`);
    lines.push(``);

    // Offending Snippet
    if (f.snippet) {
      lines.push(`#### Offending DOM Snippet`);
      lines.push(`\`\`\`html`);
      lines.push(f.snippet);
      lines.push(`\`\`\``);
      lines.push(``);
    }

    // Recommended Surgical Fix
    lines.push(`#### Recommended Surgical Solution`);
    lines.push(`${f.recommendation}`);
    lines.push(``);

    // Verification Criterion for the AI
    lines.push(`#### Verification Criterion`);
    lines.push(`- ${generateVerificationCriterion(f)}`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  });

  lines.push(`*Generated by Open AuditWeb — Autonomous AI Quality Engineering Protocol*`);
  return lines.join('\n');
}

/**
 * Standard Human-Readable AUDIT.md report
 */
export function generateAuditMarkdown(result: AuditResult): string {
  const date = new Date(result.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const lines: string[] = [];

  lines.push(`# UI/UX & Accessibility Audit Report`);
  lines.push(`> Target: [${result.url}](${result.url}) | Viewport: **${result.device.toUpperCase()}** (${result.viewport.width}x${result.viewport.height}) | Date: **${date}**`);
  lines.push(``);
  lines.push(`## Executive Summary`);
  lines.push(``);
  lines.push(`| Category | Score | Rating | Critical | High | Medium | Low | Total Defects |`);
  lines.push(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`);
  lines.push(`| **Overall System Health** | **${result.overallScore} / 100** | ${getScoreStatus(result.overallScore)} | ${countSeverity(result, 'critical')} | ${countSeverity(result, 'high')} | ${countSeverity(result, 'medium')} | ${countSeverity(result, 'low')} | **${result.findings.length}** |`);

  for (const cat of Object.values(result.categories)) {
    lines.push(`| ${cat.name} | ${cat.score} / 100 | ${getScoreStatus(cat.score)} | ${cat.criticalCount} | ${cat.highCount} | ${cat.mediumCount} | ${cat.lowCount} | ${cat.totalIssues} |`);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Defect Ledger`);
  lines.push(``);

  if (result.findings.length === 0) {
    lines.push(`### Perfect Score! No issues detected.`);
    return lines.join('\n');
  }

  const categoryOrder = [
    { key: 'accessibility', label: '1. Accessibility Findings' },
    { key: 'ux', label: '2. User Experience Findings' },
    { key: 'visual', label: '3. Visual Design Findings' },
    { key: 'typography', label: '4. Typography Findings' },
    { key: 'colors', label: '5. Color & Contrast Findings' },
    { key: 'seo', label: '6. Search & Metadata (SEO) Findings' },
  ] as const;

  for (const group of categoryOrder) {
    const items = result.findings.filter((f) => f.category === group.key);
    lines.push(`### ${group.label} (${items.length})`);
    lines.push(``);

    if (items.length === 0) {
      lines.push(`*No defects identified in this category.*`);
      lines.push(``);
      continue;
    }

    for (const item of items) {
      lines.push(`#### [#${item.number}] [${item.severity.toUpperCase()}] ${item.title}`);
      lines.push(`- **Category**: \`${item.category}\``);
      lines.push(`- **Severity**: \`${item.severity}\``);
      if (item.sourcePrinciple) {
        lines.push(`- **Governing Principle**: \`${item.sourcePrinciple}\``);
      }
      lines.push(`- **Target Selector**: \`${item.selector}\``);
      if (item.bbox) {
        lines.push(`- **Location**: \`x: ${Math.round(item.bbox.x)}px, y: ${Math.round(item.bbox.y)}px (${Math.round(item.bbox.width)}x${Math.round(item.bbox.height)}px)\``);
      }
      lines.push(`- **Issue Description**: ${item.description}`);
      if (item.snippet) {
        lines.push(`- **Offending Code/DOM Snippet**:`);
        lines.push(`\`\`\`html`);
        lines.push(item.snippet);
        lines.push(`\`\`\``);
      }
      lines.push(`- **Recommended Action**: ${item.recommendation}`);
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(`*Generated by Open AuditWeb — Free, Deterministic Quality Engineering Engine*`);
  return lines.join('\n');
}

/**
 * Generates a .cursorrules configuration snippet for developers using Cursor IDE.
 */
export function generateCursorRules(result: AuditResult): string {
  const critical = result.findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const items = critical.slice(0, 10).map((f) => `- [${f.severity.toUpperCase()}] ${f.title} on selector \`${f.selector}\`: ${f.recommendation}`).join('\n');

  return `# .cursorrules — Automated Remediation Instructions
# Generated by Open AuditWeb for target: ${result.url}

You are an expert Frontend Quality and Accessibility Engineer.
Your mandate is to resolve all UI/UX, Accessibility, and Design defects reported by the audit engine.

## Priority Violations to Fix First:
${items || '- All high-priority violations resolved.'}

## Codebase Quality Rules:
1. Touch targets must have minimum 44x44px bounding box or 8px clearance.
2. Text line lengths must not exceed 75 characters (measure 45–75ch).
3. Text color relative luminance contrast ratio must meet WCAG 2.1 AA (min 4.5:1).
4. Do not use non-semantic elements (<div onClick...>) for interactive triggers; use native <button>.
5. All images must declare width and height or aspect-ratio to prevent layout shifts.
6. Provide meaningful <title>, meta description, and responsive viewport.
7. Always provide complete, working code with zero placeholders or unasked refactors.
`;
}

/**
 * Generates a CLAUDE.md file snippet for Claude Code CLI and Anthropic agents.
 */
export function generateClaudeMd(result: AuditResult): string {
  const sorted = [...result.findings].sort((a, b) => {
    const weights: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return weights[a.severity] - weights[b.severity];
  });

  const tasks = sorted.map((f) => `- [ ] **${f.severity.toUpperCase()}** \`#${f.number}\`: ${f.title} (Selector: \`${f.selector}\`) -> ${f.recommendation}`).join('\n');

  return `# CLAUDE.md — Frontend Audit Remediation Guide
Target: ${result.url}
Score: ${result.overallScore}/100 (${result.findings.length} total defects)

## Operating Mode: Surgical Quality Engineer
- Review the prioritized checklist below.
- Use grep/ripgrep to locate the affected templates or components in the project.
- Modify only the necessary code lines to satisfy the recommendation without altering existing design tokens.
- Test your changes locally before committing.

## Prioritized Task List:
${tasks}
`;
}

/**
 * High-potency prompt snippet to paste directly into AI models (Claude, ChatGPT, Groq, Gemini)
 */
export function generateAiPrompt(result: AuditResult): string {
  const agentsMd = generateAgentsMarkdown(result);
  return `Please review the following AGENTS.md quality audit specification for "${result.url}".
Act as our Principal Frontend Engineer: execute surgical, minimal-diff fixes for all listed defects, starting with CRITICAL and HIGH severity issues.
Ensure all verification criteria are satisfied without breaking existing styling or layout.

${agentsMd}`;
}

function countSeverity(result: AuditResult, sev: 'critical' | 'high' | 'medium' | 'low'): number {
  return result.findings.filter((f) => f.severity === sev).length;
}

function getScoreStatus(score: number): string {
  if (score >= 90) return 'Optimal';
  if (score >= 75) return 'Needs Attention';
  return 'Urgent Remediation';
}

function generateSearchCommand(f: AuditFinding): string {
  if (f.snippet) {
    const cleanSnippet = f.snippet
      .replace(/[\n\r]+/g, ' ')
      .trim()
      .slice(0, 40)
      .replace(/"/g, '\\"');
    return `rg -F "${cleanSnippet}"\n# or\ngit grep -F "${cleanSnippet}"`;
  }
  const cleanSelector = f.selector.replace(/[:[\]]/g, '');
  return `rg "${cleanSelector}"`;
}

function generateVerificationCriterion(f: AuditFinding): string {
  if (f.category === 'accessibility') {
    return `Inspect with axe-core or Chrome DevTools Accessibility tree; verify 0 violations for rule '${f.title}'.`;
  }
  if (f.category === 'colors') {
    return `Check computed color and background-color styles; verify relative luminance contrast ratio meets WCAG 2.1 AA (min 4.5:1 for normal text, 3:1 for large text).`;
  }
  if (f.category === 'typography') {
    return `Ensure text line measure stays within 45–75 characters and line-height is at least 1.4em.`;
  }
  if (f.category === 'ux') {
    return `Ensure touch/click target has at least 44x44px accessible dimensions or 8px clearance.`;
  }
  if (f.category === 'seo') {
    return `Inspect document <head>; verify meta tags and canonical links are populated and meet character standards.`;
  }
  return `Ensure bounding box has no negative margin clipping or horizontal overflow.`;
}
