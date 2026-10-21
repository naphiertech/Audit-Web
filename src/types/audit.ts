export type AuditCategory = 'accessibility' | 'ux' | 'visual' | 'typography' | 'colors' | 'seo';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AuditFinding {
  id: string;
  number: number;
  category: AuditCategory;
  severity: Severity;
  title: string;
  description: string;
  selector: string;
  snippet?: string;
  bbox?: BoundingBox;
  recommendation: string;
  isHeuristic?: boolean;
  sourcePrinciple?: string; // Reference to uxui-principles, impeccable, or WCAG
  instancesCount?: number;
  instanceSelectors?: string[];
  instanceBboxes?: BoundingBox[];
}

export interface CategoryScore {
  category: AuditCategory;
  name: string;
  score: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalIssues: number;
  totalChecksEvaluated?: number;
  passedChecksCount?: number;
  complianceRate?: number;
}

export interface AuditResult {
  id: string;
  url: string;
  timestamp: string;
  device: 'desktop' | 'mobile';
  viewport: {
    width: number;
    height: number;
  };
  documentDimensions: {
    width: number;
    height: number;
  };
  overallScore: number;
  categories: Record<AuditCategory, CategoryScore>;
  findings: AuditFinding[];
  screenshot: string; // Full-page base64 data URL
  executionTimeMs: number;
  isVetoApplied?: boolean;
  vetoReason?: string;
  totalChecksEvaluated?: number;
  totalChecksPassed?: number;
  meta: {
    title: string;
    description?: string;
    h1?: string;
    totalElements: number;
    fontsDetected: string[];
    colorsDetected: string[];
  };
}

export interface AuditSummary {
  id: string;
  url: string;
  timestamp: string;
  device: 'desktop' | 'mobile';
  overallScore: number;
  totalIssues: number;
  categories: Record<AuditCategory, number>;
}
