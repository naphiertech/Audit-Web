'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuditCategory, AuditFinding, AuditResult, Severity } from '@/types/audit';
import { ScoreBoard } from '@/components/audit/ScoreBoard';
import { ScreenshotInspector } from '@/components/audit/ScreenshotInspector';
import { FindingCard } from '@/components/audit/FindingCard';
import { ExportModal } from '@/components/audit/ExportModal';
import { HistoryDrawer } from '@/components/audit/HistoryDrawer';
import { SiteNav } from '@/components/landing/SiteNav';
import { SiteFooter } from '@/components/landing/SiteFooter';
import {
  Search,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function AuditReportPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Retrieving inspection archive...');
  const [error, setError] = useState<string | null>(null);

  const [currentResult, setCurrentResult] = useState<AuditResult | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (!auditId) return;
    loadAuditById(auditId);
  }, [auditId]);

  useEffect(() => {
    if (currentResult) {
      const target = currentResult.url || 'Audit Report';
      document.title = `${target} (${currentResult.overallScore}/100) | AUDIT/WEB`;
    }
  }, [currentResult]);

  const loadAuditById = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingStep('Retrieving inspection archive...');
      const res = await fetch(`/api/audit/${id}`);
      const data = await res.json();
      if (data.result) {
        setCurrentResult(data.result);
        setDevice(data.result.device);
        setSelectedFindingId(null);
      } else {
        throw new Error(data.error || 'Audit not found');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleRunAudit = async (overrideUrl?: string, overrideDevice?: 'desktop' | 'mobile') => {
    if (!currentResult) return;
    const targetUrl = (overrideUrl || currentResult.url).trim();
    if (!targetUrl) return;

    const targetDevice = overrideDevice || device;

    setIsLoading(true);
    setError(null);
    setLoadingStep('Launching headless Chromium engine...');

    try {
      const timer1 = setTimeout(() => setLoadingStep('Enforcing SSRF boundaries & resolving DNS...'), 1800);
      const timer2 = setTimeout(() => setLoadingStep('Executing axe-core WCAG 2.1 AA evaluation...'), 5000);
      const timer3 = setTimeout(() => setLoadingStep('Analyzing DOM geometry, typography & chromatic balance...'), 9000);

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          device: targetDevice,
          forceRerun: true,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to complete audit');
      }

      router.push(`/audit/${data.result.id}`);
      setCurrentResult(data.result);
      setDevice(data.result.device);
      setSelectedFindingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSwitchDevice = (newDevice: 'desktop' | 'mobile') => {
    setDevice(newDevice);
    if (currentResult && currentResult.url) {
      handleRunAudit(currentResult.url, newDevice);
    }
  };

  // Filtered findings based on category, severity, and search query
  const filteredFindings = currentResult
    ? currentResult.findings.filter((f) => {
        if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
        if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            f.title.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q) ||
            f.selector.toLowerCase().includes(q)
          );
        }
        return true;
      })
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--c-bg)] text-[var(--c-ink)] transition-colors duration-200">
      {/* Top Pre-header Identity Ribbon */}
      <div className="border-b border-[var(--c-line)] bg-[var(--c-bg-alt)]/70 px-4 py-1.5 mono text-[12px] font-medium tracking-normal text-[var(--c-ink-2)] text-center hidden sm:block">
        Independent Interface Inspection · Rendered Evidence / Six Categories · Local Session
      </div>

      {/* Unified Site Navigation with ThemeToggle & Breadcrumbs */}
      <SiteNav
        variant="audit"
        onNewAudit={() => router.push('/')}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 wrap py-8 sm:py-10 space-y-8">
        {/* Loading Indicator View */}
        {isLoading && (
          <div className="p-16 border border-[var(--c-line)] bg-[var(--c-surface)] text-center space-y-4">
            <div className="w-9 h-9 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mono text-sm font-semibold text-[var(--c-ink)]">{loadingStep}</p>
            <p className="mono text-xs text-[var(--c-ink-3)]">Running deterministic rule execution on rendered DOM...</p>
          </div>
        )}

        {/* Error Feedback View */}
        {error && !isLoading && (
          <div className="p-6 border border-[var(--c-signal)] bg-[var(--c-bg-alt)] text-[var(--c-signal)] flex items-start gap-4 text-xs mono">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="font-bold uppercase tracking-wider">Execution Error</div>
              <div className="text-[var(--c-ink-2)]">{error}</div>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="btn btn-quiet btn-sm mt-3"
              >
                Return to home index
              </button>
            </div>
          </div>
        )}

        {/* Results Presentation View */}
        {currentResult && !isLoading && (
          <div className="space-y-8">
            {/* Level A: Telemetry Identity Strip */}
            <div className="bg-[var(--c-surface)] border border-[var(--c-line)] px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="label-sm text-[var(--c-ink-3)]">AUDIT TARGET:</span>
                <a
                  href={currentResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="display-tight text-[15px] font-bold text-[var(--c-ink)] hover:text-[var(--c-accent)] flex items-center gap-1.5 underline decoration-[var(--c-line)] hover:decoration-[var(--c-accent)] transition-colors"
                >
                  <span>{currentResult.url}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--c-ink-3)]" />
                </a>
                <span className="text-[var(--c-line)]">·</span>
                <span className="mono text-[11px] text-[var(--c-ink-3)]">
                  {new Date(currentResult.timestamp).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="mono text-[11px] text-[var(--c-ink-3)]">
                  VIEWPORT: <strong className="text-[var(--c-ink)]">{currentResult.documentDimensions?.width || currentResult.viewport.width}×{currentResult.documentDimensions?.height || currentResult.viewport.height}PX</strong>
                </span>

                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="btn btn-quiet btn-sm"
                  title="View past inspection runs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAudit(currentResult.url, currentResult.device)}
                  disabled={isLoading}
                  className="btn btn-quiet btn-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--c-accent)]" />
                  <span>Re-scan Target</span>
                </button>
              </div>
            </div>

            {/* Level B & C: Grand Scoreboard + Asymmetric Category Ledger */}
            <ScoreBoard
              result={currentResult}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Inspection Workspace Grid (Screenshot CAD Inspector + Findings Ledger) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Purpose-Built Website Inspector (7 Cols) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center gap-2 label text-[var(--c-ink)]">
                    <span>03 // Spatial Inspection Workspace</span>
                  </div>
                  <span className="mono text-[11px] text-[var(--c-ink-3)]">
                    Click pin markers to synchronize findings
                  </span>
                </div>

                <ScreenshotInspector
                  result={currentResult}
                  selectedFindingId={selectedFindingId}
                  onSelectFinding={(id) => {
                    setSelectedFindingId(id);
                    const el = document.getElementById(`finding-${id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  filteredFindings={filteredFindings}
                  onOpenExport={() => setIsExportOpen(true)}
                  onSwitchDevice={handleSwitchDevice}
                />
              </div>

              {/* Right Column: Findings Ledger (5 Cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="label text-[var(--c-ink)]">
                    04 // Findings Ledger ({filteredFindings.length} defects)
                  </span>
                  {(selectedCategory !== 'all' || selectedSeverity !== 'all' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedSeverity('all');
                        setSearchQuery('');
                      }}
                      className="mono text-xs text-[var(--c-accent)] hover:underline"
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-[var(--c-surface)] border border-[var(--c-line)] p-4 space-y-3 shadow-xs">
                  {/* Search Bar */}
                  <div className="border border-[var(--c-line)] bg-[var(--c-bg-alt)] flex items-center px-3 py-2 text-xs">
                    <Search className="w-3.5 h-3.5 text-[var(--c-ink-3)] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by rule, element selector, or defect..."
                      className="bg-transparent text-[var(--c-ink)] placeholder-[var(--c-ink-3)] w-full focus:outline-hidden mono text-xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mono text-[11px] text-[var(--c-ink-3)] hover:text-[var(--c-ink)] ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Severity Pill Filter Buttons */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => {
                      const isSel = selectedSeverity === sev;
                      const count = sev === 'all'
                        ? currentResult.findings.length
                        : currentResult.findings.filter((f) => f.severity === sev).length;

                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setSelectedSeverity(sev)}
                          className={`py-1.5 px-1 mono text-[11px] font-semibold uppercase tracking-wider text-center border transition-all ${
                            isSel
                              ? 'bg-[var(--c-ink)] text-[var(--c-bg)] border-[var(--c-ink)]'
                              : 'bg-[var(--c-surface)] text-[var(--c-ink-2)] border-[var(--c-line)] hover:border-[var(--c-line-strong)]'
                          }`}
                        >
                          <div>{sev}</div>
                          <div className="text-[11px] opacity-70 font-normal">({count})</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scrollable Findings Cards List */}
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {filteredFindings.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-[var(--c-line)] bg-[var(--c-surface)] space-y-2">
                      <Sparkles className="w-6 h-6 text-[var(--c-good)] mx-auto" />
                      <p className="display-tight text-sm font-bold text-[var(--c-ink)]">
                        No defects found matching criteria
                      </p>
                      <p className="mono text-xs text-[var(--c-ink-3)]">
                        Try loosening the search keyword or severity filters.
                      </p>
                    </div>
                  ) : (
                    filteredFindings.map((finding) => (
                      <div key={finding.id} id={`finding-${finding.id}`}>
                        <FindingCard
                          finding={finding}
                          isSelected={selectedFindingId === finding.id}
                          onSelect={() => setSelectedFindingId(finding.id)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Specification Modal */}
      {currentResult && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          result={currentResult}
        />
      )}

      {/* Historical Runs Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectAudit={(id) => loadAuditById(id)}
      />

      {/* Unified Site Footer */}
      <SiteFooter />
    </div>
  );
}
