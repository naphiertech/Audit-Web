import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { AuditResult, AuditSummary } from '@/types/audit';
import { SAMPLE_AUDIT } from './sampleAudit';

// On Vercel serverless functions, only /tmp is writable
const DB_DIR = process.env.VERCEL
  ? path.join('/tmp', 'auditweb-data')
  : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'audits.db');

let _db: DatabaseSync | null = null;
const _memoryStore = new Map<string, AuditResult>();

function getDb(): DatabaseSync | null {
  if (_db) return _db;

  try {
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
  } catch (err) {
    console.warn('SQLite storage unavailable, operating in in-memory mode:', err);
    return null;
  }
}

export function saveAudit(result: AuditResult): void {
  // Always update fast in-memory store
  _memoryStore.set(result.id, result);

  const db = getDb();
  if (!db) return;

  try {
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
  } catch (err) {
    console.warn('Failed to persist audit to SQLite:', err);
  }
}

export function getAuditById(id: string): AuditResult | null {
  if (id === 'sample-audit-001') {
    return SAMPLE_AUDIT;
  }

  // Fast path: in-memory cache
  if (_memoryStore.has(id)) {
    return _memoryStore.get(id) || null;
  }

  const db = getDb();
  if (!db) return null;

  try {
    const stmt = db.prepare(`SELECT * FROM audits WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) return null;

    const extra = JSON.parse(row.meta_json as string);

    const audit: AuditResult = {
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

    _memoryStore.set(id, audit);
    return audit;
  } catch (err) {
    console.warn('Failed to read audit from SQLite:', err);
    return null;
  }
}

export function getLatestAuditForUrl(url: string, device: 'desktop' | 'mobile' = 'desktop'): AuditResult | null {
  // Check memory store first
  for (const item of _memoryStore.values()) {
    if (item.url === url && item.device === device) {
      return item;
    }
  }

  const db = getDb();
  if (!db) return null;

  try {
    const stmt = db.prepare(`SELECT id FROM audits WHERE url = ? AND device = ? ORDER BY created_at DESC LIMIT 1`);
    const row = stmt.get(url, device) as { id: string } | undefined;
    if (!row) return null;
    return getAuditById(row.id);
  } catch (err) {
    console.warn('Failed to query latest audit from SQLite:', err);
    return null;
  }
}

export function listAuditHistory(limit: number = 20): AuditSummary[] {
  const boundedLimit = Math.min(Math.max(1, limit), 50);
  const db = getDb();

  const sampleSummary: AuditSummary = {
    id: SAMPLE_AUDIT.id,
    url: SAMPLE_AUDIT.url,
    timestamp: SAMPLE_AUDIT.timestamp,
    device: SAMPLE_AUDIT.device,
    overallScore: SAMPLE_AUDIT.overallScore,
    totalIssues: SAMPLE_AUDIT.findings.length,
    categories: {
      accessibility: SAMPLE_AUDIT.categories.accessibility.score,
      ux: SAMPLE_AUDIT.categories.ux.score,
      visual: SAMPLE_AUDIT.categories.visual.score,
      typography: SAMPLE_AUDIT.categories.typography.score,
      colors: SAMPLE_AUDIT.categories.colors.score,
      seo: SAMPLE_AUDIT.categories.seo.score,
    },
  };

  if (!db) {
    const memoryList: AuditSummary[] = Array.from(_memoryStore.values()).map((r) => ({
      id: r.id,
      url: r.url,
      timestamp: r.timestamp,
      device: r.device,
      overallScore: r.overallScore,
      totalIssues: r.findings.length,
      categories: {
        accessibility: r.categories.accessibility?.score ?? 100,
        ux: r.categories.ux?.score ?? 100,
        visual: r.categories.visual?.score ?? 100,
        typography: r.categories.typography?.score ?? 100,
        colors: r.categories.colors?.score ?? 100,
        seo: r.categories.seo?.score ?? 100,
      },
    }));

    if (memoryList.length === 0) {
      return [sampleSummary];
    }
    return memoryList.slice(0, boundedLimit);
  }

  try {
    const stmt = db.prepare(`
      SELECT id, url, device, overall_score, categories_json, findings_json, created_at 
      FROM audits 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    const rows = stmt.all(boundedLimit) as Array<Record<string, unknown>>;

    const results = rows.map((r) => {
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

    if (results.length === 0) {
      return [sampleSummary];
    }

    return results;
  } catch (err) {
    console.warn('Failed to query audit history from SQLite:', err);
    return [sampleSummary];
  }
}
