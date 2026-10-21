import { AuditCategory, AuditFinding, CategoryScore, Severity, BoundingBox } from '@/types/audit';

export const CATEGORY_TOTAL_CHECKS: Record<AuditCategory, number> = {
  accessibility: 8,
  ux: 8,
  visual: 5,
  typography: 5,
  colors: 4,
  seo: 6,
};

const SEVERITY_BASE_WEIGHTS: Record<Severity, number> = {
  critical: 16,
  high: 8,
  medium: 4,
  low: 2,
};

const CATEGORY_WEIGHTS: Record<AuditCategory, number> = {
  accessibility: 0.25,
  ux: 0.20,
  visual: 0.15,
  typography: 0.15,
  colors: 0.15,
  seo: 0.10,
};

const CATEGORY_NAMES: Record<AuditCategory, string> = {
  accessibility: 'Accessibility',
  ux: 'User Experience',
  visual: 'Visual Design',
  typography: 'Typography',
  colors: 'Colors',
  seo: 'Search & Metadata',
};

/**
 * Calculates a diminishing returns multiplier for repeated instances of the same rule.
 * 1st instance: 1.0 (100% penalty)
 * 2nd-3rd instances: +0.35 each
 * 4th-6th instances: +0.15 each
 * 7th+ instances: +0.05 each (capped at 2.5x max)
 */
export function calculateDiminishingMultiplier(count: number): number {
  if (count <= 1) return 1.0;
  let multiplier = 1.0;
  // Instances 2 and 3: 35% each
  multiplier += Math.min(2, count - 1) * 0.35;
  // Instances 4 to 6: 15% each
  if (count > 3) {
    multiplier += Math.min(3, count - 3) * 0.15;
  }
  // Instances 7+: 5% each, capped at 2.5 max
  if (count > 6) {
    multiplier += Math.min(20, count - 6) * 0.05;
  }
  return Math.min(2.5, multiplier);
}

/**
 * Clusters repeated DOM node violations of the same rule into component-level findings.
 */
export function deduplicateFindings(findings: AuditFinding[]): AuditFinding[] {
  const clusterMap = new Map<string, AuditFinding[]>();

  for (const f of findings) {
    // Group by category, title, and source standard
    const key = `${f.category}:${f.title}:${f.sourcePrinciple || ''}`;
    const existing = clusterMap.get(key) || [];
    existing.push(f);
    clusterMap.set(key, existing);
  }

  const clustered: AuditFinding[] = [];

  for (const [, group] of clusterMap.entries()) {
    const primary = group[0];
    const count = group.length;

    const instanceSelectors = Array.from(new Set(group.map((g) => g.selector).filter(Boolean)));
    const instanceBboxes = group
      .map((g) => g.bbox)
      .filter((b): b is BoundingBox => Boolean(b && b.width > 0 && b.height > 0));

    let description = primary.description;
    if (count > 1 && !description.includes('instances detected')) {
      description = `${description} (${count} instances detected across components).`;
    }

    clustered.push({
      ...primary,
      description,
      instancesCount: count,
      instanceSelectors,
      instanceBboxes,
    });
  }

  // Renumber sequentially 1..N
  return clustered.map((f, idx) => ({
    ...f,
    number: idx + 1,
  }));
}

export function calculateScores(findings: AuditFinding[]): {
  overallScore: number;
  categories: Record<AuditCategory, CategoryScore>;
  isVetoApplied?: boolean;
  vetoReason?: string;
  totalChecksEvaluated: number;
  totalChecksPassed: number;
} {
  const categoriesList: AuditCategory[] = ['accessibility', 'ux', 'visual', 'typography', 'colors', 'seo'];

  const categories: Partial<Record<AuditCategory, CategoryScore>> = {};
  let totalEvaluatedAll = 0;
  let totalPassedAll = 0;

  let criticalAccessibilityCount = 0;

  for (const cat of categoriesList) {
    const catFindings = findings.filter((f) => f.category === cat);
    const totalChecks = CATEGORY_TOTAL_CHECKS[cat];
    totalEvaluatedAll += totalChecks;

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalDeduction = 0;

    for (const f of catFindings) {
      const instances = f.instancesCount || 1;
      const multiplier = calculateDiminishingMultiplier(instances);

      if (f.severity === 'critical') {
        criticalCount += instances;
        totalDeduction += SEVERITY_BASE_WEIGHTS.critical * multiplier;
        if (cat === 'accessibility') {
          criticalAccessibilityCount += instances;
        }
      } else if (f.severity === 'high') {
        highCount += instances;
        totalDeduction += SEVERITY_BASE_WEIGHTS.high * multiplier;
      } else if (f.severity === 'medium') {
        mediumCount += instances;
        totalDeduction += SEVERITY_BASE_WEIGHTS.medium * multiplier;
      } else {
        lowCount += instances;
        totalDeduction += SEVERITY_BASE_WEIGHTS.low * multiplier;
      }
    }

    const failedChecksCount = Math.min(totalChecks, catFindings.length);
    const passedChecksCount = Math.max(0, totalChecks - failedChecksCount);
    const complianceRate = Math.round((passedChecksCount / totalChecks) * 100);
    totalPassedAll += passedChecksCount;

    const score = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));

    categories[cat] = {
      category: cat,
      name: CATEGORY_NAMES[cat],
      score,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      totalIssues: catFindings.length,
      totalChecksEvaluated: totalChecks,
      passedChecksCount,
      complianceRate,
    };
  }

  // Weighted overall score
  let weightedSum = 0;
  for (const cat of categoriesList) {
    const catScore = categories[cat]?.score ?? 100;
    weightedSum += catScore * CATEGORY_WEIGHTS[cat];
  }

  let overallScore = Math.max(0, Math.min(100, Math.round(weightedSum)));
  let isVetoApplied = false;
  let vetoReason: string | undefined;

  // Enforce Critical Accessibility Hard Veto (Non-Compliance Ceiling)
  if (criticalAccessibilityCount >= 1) {
    if (overallScore > 49) {
      overallScore = 49;
      isVetoApplied = true;
      vetoReason = `Non-Compliance Ceiling enforced: ${criticalAccessibilityCount} critical accessibility violation${
        criticalAccessibilityCount > 1 ? 's' : ''
      } impede assistive technology access. Overall score is capped at 49/100 until critical defects are remediated.`;
    }
  }

  return {
    overallScore,
    categories: categories as Record<AuditCategory, CategoryScore>,
    isVetoApplied,
    vetoReason,
    totalChecksEvaluated: totalEvaluatedAll,
    totalChecksPassed: totalPassedAll,
  };
}
