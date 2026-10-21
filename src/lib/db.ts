import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { AuditResult, AuditSummary } from '@/types/audit';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'audits.db');

let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (_db) return _db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      device TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      categories_json TEXT NOT NULL,
      findings_json TEXT NOT NULL,
      screenshot_data TEXT NOT NULL,
      meta_json TEXT NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audits_url ON audits(url);
    CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at);
  `);

  _db = db;
  return db;
}

export function saveAudit(result: AuditResult): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO audits (
      id, url, device, overall_score, categories_json, findings_json, screenshot_data, meta_json, execution_time_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    result.id,
    result.url,
    result.device,
    result.overallScore,
    JSON.stringify(result.categories),
    JSON.stringify(result.findings),
    result.screenshot,
    JSON.stringify({
      viewport: result.viewport,
      documentDimensions: result.documentDimensions,
      meta: result.meta,
    }),
    result.executionTimeMs,
    result.timestamp
  );
}

export function getAuditById(id: string): AuditResult | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM audits WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  const extra = JSON.parse(row.meta_json as string);

  return {
    id: row.id as string,
    url: row.url as string,
    timestamp: row.created_at as string,
    device: row.device as 'desktop' | 'mobile',
    viewport: extra.viewport || { width: 1440, height: 900 },
    documentDimensions: extra.documentDimensions || extra.viewport || { width: 1440, height: 900 },
    overallScore: Number(row.overall_score),
    categories: JSON.parse(row.categories_json as string),
    findings: JSON.parse(row.findings_json as string),
    screenshot: row.screenshot_data as string,
    executionTimeMs: Number(row.execution_time_ms),
    meta: extra.meta || { title: row.url as string, totalElements: 0, fontsDetected: [], colorsDetected: [] },
  };
}

export function getLatestAuditForUrl(url: string, device: 'desktop' | 'mobile' = 'desktop'): AuditResult | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT id FROM audits WHERE url = ? AND device = ? ORDER BY created_at DESC LIMIT 1`);
  const row = stmt.get(url, device) as { id: string } | undefined;
  if (!row) return null;
  return getAuditById(row.id);
}

export function listAuditHistory(limit: number = 20): AuditSummary[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, url, device, overall_score, categories_json, findings_json, created_at 
    FROM audits 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  const rows = stmt.all(limit) as Array<Record<string, unknown>>;

  return rows.map((r) => {
    const cats = JSON.parse(r.categories_json as string);
    const findings = JSON.parse(r.findings_json as string);
    return {
      id: r.id as string,
      url: r.url as string,
      timestamp: r.created_at as string,
      device: r.device as 'desktop' | 'mobile',
      overallScore: Number(r.overall_score),
      totalIssues: findings.length,
      categories: {
        accessibility: cats.accessibility?.score ?? 100,
        ux: cats.ux?.score ?? 100,
        visual: cats.visual?.score ?? 100,
        typography: cats.typography?.score ?? 100,
        colors: cats.colors?.score ?? 100,
        seo: cats.seo?.score ?? 100,
      },
    };
  });
}
