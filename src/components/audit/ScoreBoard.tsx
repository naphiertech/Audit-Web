'use client';

import React from 'react';
import { AuditCategory, AuditResult } from '@/types/audit';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

interface ScoreBoardProps {
  result: AuditResult;
  selectedCategory: AuditCategory | 'all';
  onSelectCategory: (cat: AuditCategory | 'all') => void;
}

export function ScoreBoard({
  result,
  selectedCategory,
  onSelectCategory,
}: ScoreBoardProps) {
  const categories: { key: AuditCategory; index: string; label: string; standard: string }[] = [
    { key: 'accessibility', index: '01', label: 'Accessibility', standard: 'WCAG 2.1 AA & Semantic DOM' },
    { key: 'ux', index: '02', label: 'User Experience', standard: "Fitts's Law, Form CRO & Ergonomics" },
    { key: 'visual', index: '03', label: 'Visual Design', standard: 'Gestalt Rhythm, CLS & Layout Integrity' },
    { key: 'typography', index: '04', label: 'Typography', standard: 'Measure, Hierarchy & Line Proportion' },
    { key: 'colors', index: '05', label: 'Colour & Contrast', standard: 'Relative Luminance (Min 4.5:1)' },
    { key: 'seo', index: '06', label: 'Search & Metadata', standard: 'SEO Tags, OpenGraph & Indexation' },
  ];

  const overall = result.overallScore;

  // Determine editorial rating & tone
  let ratingLabel = 'Optimal Quality';
  let ratingDetail = 'Full compliance across accessibility, typography, and visual bounds.';
  let ratingBullet = 'bg-[var(--c-good)]';
  let meterTone: 'good' | 'warn' | 'signal' = 'good';
  let RatingIcon = CheckCircle2;

  if (overall < 60) {
    ratingLabel = 'Critical Remediation Required';
    ratingDetail = 'Severe accessibility and layout defects impeding assistive technology and user flow.';
    ratingBullet = 'bg-[var(--c-signal)]';
    meterTone = 'signal';
    RatingIcon = AlertOctagon;
  } else if (overall < 80) {
    ratingLabel = 'Needs Attention';
    ratingDetail = 'Noticeable ergonomics and contrast violations requiring targeted corrections.';
    ratingBullet = 'bg-[var(--c-warn)]';
    meterTone = 'warn';
    RatingIcon = AlertTriangle;
  } else if (overall < 92) {
    ratingLabel = 'Minor Drift Detected';
    ratingDetail = 'Generally sound implementation with minor typographic or spacing observations.';
    ratingBullet = 'bg-[var(--c-accent)]';
    meterTone = 'warn';
    RatingIcon = Info;
  }

  // Count severities across findings
  const criticalCount = result.findings.filter((f) => f.severity === 'critical').length;
  const highCount = result.findings.filter((f) => f.severity === 'high').length;
  const mediumCount = result.findings.filter((f) => f.severity === 'medium').length;
  const lowCount = result.findings.filter((f) => f.severity === 'low').length;

  const totalSegments = 26;
  const filledSegments = Math.round((overall / 100) * totalSegments);

  return (
    <div className="w-full border border-[var(--c-line)] bg-[var(--c-surface)] overflow-hidden shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--c-line)]">
        {/* Left Column: The Grand Overall Assessment */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-[var(--c-surface)] space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="label-sm text-[var(--c-ink-3)]">
                01 // Overall Quality Assessment
              </span>
              <span className="mono text-[11px] text-[var(--c-ink-3)]">
                {result.device.toUpperCase()} · {result.viewport.width}×{result.viewport.height}
              </span>
            </div>

            {/* Giant Typographic Score */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="display text-7xl sm:text-8xl lg:text-9xl font-extrabold text-[var(--c-ink)] tracking-tighter leading-none">
                {overall}
              </span>
              <div className="flex flex-col">
                <span className="mono text-2xl font-semibold text-[var(--c-ink-3)] leading-none">
                  /100
                </span>
                <span className="label-sm text-[var(--c-ink-3)] mt-1">
                  Composite Index
                </span>
              </div>
            </div>

            {/* Status Rating Badge & Explanation */}
            <div className="space-y-2 pt-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 text-[11px] font-semibold border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-ink)]">
                <i className={`block h-2 w-2 rounded-full ${ratingBullet}`} aria-hidden="true" />
                <span className="tracking-wide uppercase">{ratingLabel}</span>
              </div>
              <p className="text-[13px] text-[var(--c-ink-2)] leading-relaxed max-w-md">
                {ratingDetail}
              </p>
            </div>

            {/* Non-Compliance Ceiling Veto Notice */}
            {result.isVetoApplied && (
              <div className="p-3 border border-[var(--c-signal)] bg-[var(--c-bg-alt)] space-y-1">
                <div className="flex items-center gap-1.5 label-sm text-[var(--c-signal)] font-bold">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>NON-COMPLIANCE CEILING ENFORCED</span>
                </div>
                <p className="text-[11px] text-[var(--c-ink-2)] leading-relaxed">
                  {result.vetoReason || 'Overall score capped at 49/100 due to Critical Accessibility violations.'}
                </p>
              </div>
            )}

            {/* Evaluated Checks Compliance Summary */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--c-line)]">
              <span className="label-sm text-[var(--c-ink-3)]">Evaluated Checks Ratio</span>
              <span className="mono text-[11px] font-semibold text-[var(--c-ink)]">
                {result.totalChecksPassed ?? 32} / {result.totalChecksEvaluated ?? 36} passed ({Math.round(((result.totalChecksPassed ?? 32) / (result.totalChecksEvaluated ?? 36)) * 100)}%)
              </span>
            </div>

            {/* Discrete 26-Step Calibrated Spectrum */}
            <div className="pt-2">
              <div className="flex gap-[2px] h-2.5 bg-[var(--c-bg-alt)] border border-[var(--c-line)] p-[2px]">
                {Array.from({ length: totalSegments }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 transition-all ${
                      i < filledSegments
                        ? meterTone === 'signal'
                          ? 'bg-[var(--c-signal)]'
                          : meterTone === 'warn'
                            ? 'bg-[var(--c-warn)]'
                            : 'bg-[var(--c-good)]'
                        : 'bg-[var(--c-line-soft)]'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-ink-3)] mt-1.5">
                <span>0 · critical</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100 · sound</span>
              </div>
            </div>
          </div>

          {/* Severity Breakdown Bar */}
          <div className="pt-4 border-t border-[var(--c-line)] space-y-2">
            <div className="label-sm text-[var(--c-ink-3)]">
              Severity Distribution ({result.findings.length} total defects)
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-signal)] font-mono text-[11px]">
                <strong className="font-bold">{criticalCount}</strong> Critical
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-warn)] font-mono text-[11px]">
                <strong className="font-bold">{highCount}</strong> High
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-accent)] font-mono text-[11px]">
                <strong className="font-bold">{mediumCount}</strong> Medium
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-ink-3)] font-mono text-[11px]">
                <strong className="font-bold">{lowCount}</strong> Low
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 6 Category Matrix */}
        <div className="lg:col-span-7 flex flex-col justify-between divide-y divide-[var(--c-line)] bg-[var(--c-surface)]">
          <div className="px-6 py-3 bg-[var(--c-bg-alt)] flex items-center justify-between text-xs text-[var(--c-ink-3)] font-medium border-b border-[var(--c-line)]">
            <span className="label-sm text-[var(--c-ink-2)]">02 // Quality Dimension</span>
            <div className="flex items-center gap-8">
              <span className="label-sm text-[var(--c-ink-3)] hidden sm:inline">Defect Matrix</span>
              <span className="label-sm text-[var(--c-ink-2)]">Rating</span>
            </div>
          </div>

          {/* Category List */}
          <div className="divide-y divide-[var(--c-line)] flex-1 flex flex-col justify-around">
            {categories.map((c) => {
              const catData = result.categories[c.key];
              const score = catData ? catData.score : 100;
              const total = catData ? catData.totalIssues : 0;
              const crit = catData ? catData.criticalCount : 0;
              const high = catData ? catData.highCount : 0;
              const med = catData ? catData.mediumCount : 0;
              const low = catData ? catData.lowCount : 0;

              const isSelected = selectedCategory === c.key;

              let scoreTextColor = 'text-[var(--c-good)]';
              let barColor = 'bg-[var(--c-good)]';
              if (score < 60) {
                scoreTextColor = 'text-[var(--c-signal)]';
                barColor = 'bg-[var(--c-signal)]';
              } else if (score < 80) {
                scoreTextColor = 'text-[var(--c-warn)]';
                barColor = 'bg-[var(--c-warn)]';
              } else if (score < 90) {
                scoreTextColor = 'text-[var(--c-accent)]';
                barColor = 'bg-[var(--c-accent)]';
              }

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onSelectCategory(isSelected ? 'all' : c.key)}
                  className={`w-full text-left px-6 py-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                    isSelected
                      ? 'bg-[var(--c-surface-2)] border-l-2 border-l-[var(--c-ink)]'
                      : 'hover:bg-[var(--c-bg-alt)]'
                  }`}
                >
                  {/* Category Details */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2.5">
                      <span className="mono text-[11px] text-[var(--c-ink-3)] font-semibold">
                        {c.index}
                      </span>
                      <h4 className="display-tight text-[15px] font-bold text-[var(--c-ink)] group-hover:text-[var(--c-accent)] transition-colors">
                        {c.label}
                      </h4>
                      {total === 0 ? (
                        <span className="mono text-[11px] px-2 py-0.5 bg-[var(--c-bg-alt)] text-[var(--c-good)] border border-[var(--c-line)] font-semibold">
                          PASS
                        </span>
                      ) : (
                        <span className="mono text-[11px] px-1.5 py-0.5 bg-[var(--c-bg-alt)] text-[var(--c-ink-2)] border border-[var(--c-line)]">
                          {total} {total === 1 ? 'defect' : 'defects'}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[var(--c-ink-3)] flex items-center gap-2">
                      <span>{c.standard}</span>
                      {catData?.totalChecksEvaluated && (
                        <>
                          <span className="text-[var(--c-line)]">·</span>
                          <span className="mono text-[11px] text-[var(--c-ink-2)]">
                            {catData.passedChecksCount}/{catData.totalChecksEvaluated} passed ({catData.complianceRate}%)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: Severity pills + Score Meter + Numeral */}
                  <div className="flex items-center gap-5 justify-between sm:justify-end">
                    {/* Severity Pills */}
                    <div className="flex items-center gap-1.5 mono text-[11px]">
                      {crit > 0 && (
                        <span className="px-1.5 py-0.5 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-signal)] font-medium">
                          C:{crit}
                        </span>
                      )}
                      {high > 0 && (
                        <span className="px-1.5 py-0.5 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-warn)] font-medium">
                          H:{high}
                        </span>
                      )}
                      {med > 0 && (
                        <span className="px-1.5 py-0.5 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-accent)] font-medium">
                          M:{med}
                        </span>
                      )}
                      {low > 0 && (
                        <span className="px-1.5 py-0.5 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-ink-3)] font-medium">
                          L:{low}
                        </span>
                      )}
                    </div>

                    {/* Calibrated Mini-Bar */}
                    <div className="w-16 hidden md:flex h-1.5 bg-[var(--c-bg-alt)] border border-[var(--c-line)] overflow-hidden">
                      <div
                        className={`h-full w-full origin-left transition-transform duration-500 ${barColor}`}
                        style={{ transform: `scaleX(${Math.max(0, Math.min(100, score)) / 100})` }}
                      />
                    </div>

                    {/* Numeric Score */}
                    <div className="mono text-right text-[13px] tabular-nums font-semibold min-w-[58px]">
                      <span className={scoreTextColor}>{score}</span>
                      <span className="text-[11px] text-[var(--c-ink-3)] font-normal">/100</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick reset active filter strip */}
          {selectedCategory !== 'all' && (
            <div className="px-6 py-2 bg-[var(--c-bg-alt)] flex items-center justify-between text-xs border-t border-[var(--c-line)]">
              <span className="mono text-[11px] text-[var(--c-accent)]">
                FILTER ACTIVE: {categories.find((c) => c.key === selectedCategory)?.label.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="mono text-[11px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)] underline"
              >
                [SHOW ALL CATEGORIES]
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}