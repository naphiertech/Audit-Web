import {
  calculateDiminishingMultiplier,
  deduplicateFindings,
  calculateScores,
  CATEGORY_TOTAL_CHECKS,
} from '../src/lib/auditor/scoring.js';
import { AuditFinding } from '../src/types/audit.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
}

console.log('🧪 Testing Enhanced Audit Rating Mechanism...\n');

// 1. Test Diminishing Multiplier
console.log('1. Testing Diminishing Returns Multiplier...');
assert(calculateDiminishingMultiplier(1) === 1.0, '1 instance must be 1.0');
const mult3 = calculateDiminishingMultiplier(3);
assert(mult3 === 1.7, `3 instances must be 1.7, got ${mult3}`);
const mult10 = calculateDiminishingMultiplier(10);
assert(mult10 === 2.35, `10 instances must be 2.35, got ${mult10}`);
const mult50 = calculateDiminishingMultiplier(50);
assert(mult50 === 2.5, `50 instances must be capped at 2.5, got ${mult50}`);
console.log('✓ Diminishing returns curve verified.');

// 2. Test Component-Level Defect Clustering
console.log('\n2. Testing Component Clustering...');
const rawFindings: AuditFinding[] = [
  {
    id: 'f1',
    number: 1,
    category: 'ux',
    severity: 'medium',
    title: 'Touch target too small',
    description: 'Element clickable area violates Fitts Law',
    selector: 'div > button.btn-1',
    recommendation: 'Increase touch area',
    sourcePrinciple: 'uxui-principles (Fitts Law)',
    bbox: { x: 10, y: 20, width: 24, height: 24 },
  },
  {
    id: 'f2',
    number: 2,
    category: 'ux',
    severity: 'medium',
    title: 'Touch target too small',
    description: 'Element clickable area violates Fitts Law',
    selector: 'div > button.btn-2',
    recommendation: 'Increase touch area',
    sourcePrinciple: 'uxui-principles (Fitts Law)',
    bbox: { x: 10, y: 60, width: 24, height: 24 },
  },
  {
    id: 'f3',
    number: 3,
    category: 'ux',
    severity: 'medium',
    title: 'Touch target too small',
    description: 'Element clickable area violates Fitts Law',
    selector: 'div > button.btn-3',
    recommendation: 'Increase touch area',
    sourcePrinciple: 'uxui-principles (Fitts Law)',
    bbox: { x: 10, y: 100, width: 24, height: 24 },
  },
  {
    id: 'f4',
    number: 4,
    category: 'typography',
    severity: 'low',
    title: 'Body text size below recommendation',
    description: 'Font size 11px',
    selector: 'p.caption',
    recommendation: 'Use 13px+',
  },
];

const clustered = deduplicateFindings(rawFindings);
assert(clustered.length === 2, `Expected 2 unique clustered findings, got ${clustered.length}`);
const uxCluster = clustered.find((c) => c.category === 'ux');
assert(uxCluster?.instancesCount === 3, `Expected 3 instances for touch target, got ${uxCluster?.instancesCount}`);
assert(uxCluster?.instanceSelectors?.length === 3, 'Expected 3 instance selectors');
assert(uxCluster?.instanceBboxes?.length === 3, 'Expected 3 instance bounding boxes');
console.log('✓ Component defect clustering verified.');

// 3. Test Scoring Without and With Critical Accessibility Veto
console.log('\n3. Testing Scoring Calculation & Coverage Ratio...');
const scoreWithoutVeto = calculateScores(clustered);
console.log(`  - Overall Score: ${scoreWithoutVeto.overallScore}/100`);
console.log(`  - Evaluated Checks: ${scoreWithoutVeto.totalChecksPassed}/${scoreWithoutVeto.totalChecksEvaluated} passed`);
assert(scoreWithoutVeto.totalChecksEvaluated === 36, 'Total checks evaluated must be 36');
assert(!scoreWithoutVeto.isVetoApplied, 'Veto should NOT be applied when no critical accessibility issue');

// Now add 1 Critical Accessibility violation to test the Non-Compliance Ceiling
console.log('\n4. Testing Accessibility Hard Veto (Non-Compliance Ceiling)...');
const criticalA11yFindings: AuditFinding[] = [
  ...clustered,
  {
    id: 'f5',
    number: 5,
    category: 'accessibility',
    severity: 'critical',
    title: 'Keyboard trap detected in modal',
    description: 'Focus is trapped and user cannot escape dialog',
    selector: 'div.modal',
    recommendation: 'Ensure Escape key unmounts dialog or releases focus',
  },
];

const scoreWithVeto = calculateScores(criticalA11yFindings);
console.log(`  - Overall Score with Critical A11y: ${scoreWithVeto.overallScore}/100`);
console.log(`  - Veto Applied: ${scoreWithVeto.isVetoApplied}`);
console.log(`  - Veto Reason: ${scoreWithVeto.vetoReason}`);
assert(scoreWithVeto.isVetoApplied === true, 'Veto MUST be applied for critical accessibility defect');
assert(scoreWithVeto.overallScore <= 49, `Overall score must be capped at 49, got ${scoreWithVeto.overallScore}`);
console.log('✓ Accessibility Hard Veto verified.');

console.log('\n✅ ALL 4 RATING MECHANISM ENHANCEMENTS TESTED AND VERIFIED PERFECTLY!');
