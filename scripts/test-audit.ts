import { runAuditEngine } from '../src/lib/auditor/engine.js';
import {
  generateAuditMarkdown,
  generateAiPrompt,
  generateCursorRules,
  generateClaudeMd,
  generateAgentsMarkdown,
} from '../src/lib/auditor/report-generator.js';
import { listAuditHistory, getAuditById } from '../src/lib/db.js';

async function main() {
  console.log('🧪 Starting End-to-End Audit Verification...\n');

  // Test target: example.com
  const targetUrl = 'https://example.com';
  console.log(`[1/4] Running audit against ${targetUrl}...`);
  const result = await runAuditEngine({
    url: targetUrl,
    device: 'desktop',
    forceRerun: true,
  });

  console.log('✓ Audit completed successfully!');
  console.log(`  - Audit ID: ${result.id}`);
  console.log(`  - Target: ${result.url}`);
  console.log(`  - Viewport: ${result.viewport.width}x${result.viewport.height}`);
  console.log(`  - Document Dimensions: ${result.documentDimensions.width}x${result.documentDimensions.height}`);
  if (!result.documentDimensions || result.documentDimensions.height <= 0) {
    throw new Error('documentDimensions not captured!');
  }
  console.log(`  - Overall Score: ${result.overallScore} / 100`);
  console.log(`  - Total Findings: ${result.findings.length}`);
  console.log(`  - Execution Time: ${(result.executionTimeMs / 1000).toFixed(2)}s`);
  console.log(`  - Screenshot size: ${Math.round(result.screenshot.length / 1024)} KB base64`);

  console.log('\n[2/4] Category Scores Breakdown (6 Categories):');
  const expectedCategories = ['accessibility', 'ux', 'visual', 'typography', 'colors', 'seo'];
  for (const cat of expectedCategories) {
    const data = result.categories[cat as keyof typeof result.categories];
    if (!data) {
      throw new Error(`Category ${cat} missing from audit result!`);
    }
    console.log(`  - ${data.name.padEnd(20)}: ${data.score}/100 (${data.totalIssues} issues)`);
  }

  console.log('\n[3/4] Testing Persistence & Database:');
  const history = listAuditHistory(5);
  console.log(`  - Saved audits in DB: ${history.length}`);
  const retrieved = getAuditById(result.id);
  if (!retrieved || retrieved.id !== result.id) {
    throw new Error('Database retrieval mismatch!');
  }
  console.log(`  - Successfully verified DB retrieval for ID: ${retrieved.id}`);

  console.log('\n[4/4] Testing Export Formats (AGENTS.md, .cursorrules, CLAUDE.md, AUDIT.md):');
  const markdown = generateAuditMarkdown(result);
  if (!markdown.includes('# UI/UX & Accessibility Audit Report') || !markdown.includes('Executive Summary')) {
    throw new Error('Markdown report format mismatch!');
  }
  console.log(`  - AUDIT.md generated (${markdown.length} chars)`);

  const agentsMd = generateAgentsMarkdown(result);
  if (!agentsMd.includes('AGENTS.md') || !agentsMd.includes('Prioritized Action Checklist')) {
    throw new Error('AGENTS.md format mismatch!');
  }
  console.log(`  - AGENTS.md generated (${agentsMd.length} chars)`);

  const cursorRules = generateCursorRules(result);
  if (!cursorRules.includes('.cursorrules') || !cursorRules.includes('Priority Violations')) {
    throw new Error('.cursorrules format mismatch!');
  }
  console.log(`  - .cursorrules generated (${cursorRules.length} chars)`);

  const claudeMd = generateClaudeMd(result);
  if (!claudeMd.includes('CLAUDE.md') || !claudeMd.includes('Operating Mode: Surgical Quality Engineer')) {
    throw new Error('CLAUDE.md format mismatch!');
  }
  console.log(`  - CLAUDE.md generated (${claudeMd.length} chars)`);

  const prompt = generateAiPrompt(result);
  console.log(`  - Full AI Prompt generated (${prompt.length} chars)`);

  console.log('\n✅ ALL VERIFICATION CHECKS PASSED PERFECTLY!');
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
