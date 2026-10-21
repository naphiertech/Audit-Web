export type CategoryId =
  | "accessibility"
  | "ux"
  | "visual"
  | "typography"
  | "contrast"
  | "metadata";

export type Severity = "critical" | "serious" | "moderate" | "minor" | "pass";

export type Source = "specimen" | "url" | "markup";

export interface Category {
  id: CategoryId;
  index: string;
  label: string;
  short: string;
  description: string;
  note: string;
  checks: string[];
}

export interface Evidence {
  label: string;
  value: string;
}

export interface Finding {
  /** Deterministic identifier, e.g. A11Y-03. */
  id: string;
  check: string;
  category: CategoryId;
  severity: Exclude<Severity, "pass">;
  title: string;
  summary: string;
  recommendation: string;
  occurrences: number;
  selector?: string;
  snippet?: string;
  evidence: Evidence[];
  /** Marker region in rendered-page percentages, when measurable. */
  region?: { x: number; y: number; w: number; h: number };
}

export interface CategoryResult {
  id: CategoryId;
  score: number;
  findings: number;
  tested: string;
}

export interface AuditStats {
  elements: number;
  textNodes: number;
  fonts: string[];
  fontSizes: number[];
  colors: number;
  images: number;
  links: number;
  controls: number;
  height: number;
  viewportWidth: number;
}

export interface AuditReport {
  id: string;
  url: string;
  displayUrl: string;
  pageTitle: string;
  inspectedAt: string;
  source: Source;
  specimenId?: string;
  overall: number;
  grade: string;
  verdict: string;
  categories: CategoryResult[];
  findings: Finding[];
  passes: number;
  stats: AuditStats;
  notes: string[];
  html: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "accessibility",
    index: "01",
    label: "Accessibility",
    short: "Access",
    description:
      "Can every visitor perceive the page, understand its controls and move through it? We read the rendered document the way assistive technology does.",
    note: "Inclusion",
    checks: [
      "Image alternatives",
      "Accessible control names",
      "Programmatic form labels",
      "Heading order",
      "Page language",
      "Landmarks",
      "Duplicate identifiers",
      "Sequential tab order",
    ],
  },
  {
    id: "ux",
    index: "02",
    label: "User Experience",
    short: "Experience",
    description:
      "The quiet parts of a page that decide whether it works: a clear title, navigable structure, honest link labels and controls you can actually hit.",
    note: "Orientation",
    checks: [
      "Document viewport",
      "Page title presence",
      "Heading structure",
      "Link purpose",
      "Touch target size",
      "Skip-to-content",
      "New-window cues",
      "Form guidance",
    ],
  },
  {
    id: "visual",
    index: "03",
    label: "Visual Design",
    short: "Visual",
    description:
      "Measured layout signals rather than taste. We check that the composition stays inside the canvas, images reserve their space and the system holds together.",
    note: "Structure",
    checks: [
      "Horizontal overflow",
      "Image dimensions",
      "Palette sprawl",
      "Shape consistency",
      "Responsive asset hints",
    ],
  },
  {
    id: "typography",
    index: "04",
    label: "Typography",
    short: "Type",
    description:
      "The type system in the wild. We count real rendered families, sizes, line heights and the measure of the running text — then flag the drift.",
    note: "Voice",
    checks: [
      "Font family count",
      "Type size inventory",
      "Small body text",
      "Tight line height",
      "Overlong line length",
    ],
  },
  {
    id: "contrast",
    index: "05",
    label: "Colour & Contrast",
    short: "Contrast",
    description:
      "Every visible text node is sampled against its nearest painted surface and checked against WCAG AA. We also inspect whether keyboard focus stays visible.",
    note: "Legibility",
    checks: [
      "AA body contrast",
      "AA large-text contrast",
      "Low-contrast UI samples",
      "Visible focus rules",
    ],
  },
  {
    id: "metadata",
    index: "06",
    label: "Search & Metadata",
    short: "Metadata",
    description:
      "How the page introduces itself to machines and to the people who meet it in a search result, a message or a social card.",
    note: "Identity",
    checks: [
      "Meta description",
      "Title length",
      "Open Graph title",
      "Social image",
      "Canonical address",
      "Single primary heading",
    ],
  },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<CategoryId, Category>;

export const TOTAL_CHECKS = CATEGORIES.reduce((sum, c) => sum + c.checks.length, 0);

export const CATEGORY_WEIGHTS: Record<CategoryId, number> = {
  accessibility: 0.24,
  ux: 0.2,
  visual: 0.14,
  typography: 0.16,
  contrast: 0.16,
  metadata: 0.1,
};

export const SEVERITY_ORDER: Record<Exclude<Severity, "pass">, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

export function gradeFor(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Sound";
  if (score >= 65) return "Imperfect";
  if (score >= 50) return "Fragile";
  return "Critical";
}

export function verdictFor(score: number): string {
  if (score >= 90) return "The evidence holds. A few small corrections remain.";
  if (score >= 80) return "A strong page with specific, fixable weak points.";
  if (score >= 65) return "The fundamentals are present. Several issues erode the experience.";
  if (score >= 50) return "Structural issues are holding the interface back.";
  return "The page leaves too much to chance. Start with the critical findings.";
}
