'use client';

import React, { useState } from 'react';
import { AuditFinding } from '@/types/audit';
import { Copy, Check, ChevronDown, ChevronUp, Wrench, AlertCircle, Code } from 'lucide-react';

interface FindingCardProps {
  finding: AuditFinding;
  isSelected: boolean;
  onSelect: () => void;
}

export function FindingCard({ finding, isSelected, onSelect }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedSelector, setCopiedSelector] = useState(false);

  // Intentional severity color mapping
  const severityStyles = {
    critical: 'text-[var(--c-signal)] border-[var(--c-line)] bg-[var(--c-bg-alt)]',
    high: 'text-[var(--c-warn)] border-[var(--c-line)] bg-[var(--c-bg-alt)]',
    medium: 'text-[var(--c-accent)] border-[var(--c-line)] bg-[var(--c-bg-alt)]',
    low: 'text-[var(--c-ink-3)] border-[var(--c-line)] bg-[var(--c-bg-alt)]',
  }[finding.severity];

  const handleCopySelector = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(finding.selector);
    setCopiedSelector(true);
    setTimeout(() => setCopiedSelector(false), 1500);
  };

  return (
    <div
      onClick={onSelect}
      className={`border transition-all cursor-pointer ${
        isSelected
          ? 'bg-[var(--c-surface-2)] border-[var(--c-accent)] shadow-xs ring-1 ring-[var(--c-accent)]/40'
          : 'bg-[var(--c-surface)] border-[var(--c-line)] hover:border-[var(--c-line-strong)] hover:bg-[var(--c-bg-alt)]'
      }`}
    >
      <div className="p-4 sm:p-5 space-y-3">
        {/* 1. Top Row: Severity Stamp & Issue Identifier */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[11px] mono font-bold uppercase tracking-wider border ${severityStyles}`}>
              {finding.severity}
            </span>
            <span className="mono text-xs text-[var(--c-ink-3)] font-semibold">
              #{finding.number.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-[var(--c-line)]">·</span>
            <span className="label-sm text-[var(--c-ink-2)] capitalize">
              {finding.category}
            </span>
            {finding.instancesCount && finding.instancesCount > 1 && (
              <span className="mono text-[11px] px-1.5 py-0.2 border border-[var(--c-line)] bg-[var(--c-bg-alt)] text-[var(--c-ink-2)] font-semibold">
                {finding.instancesCount} INSTANCES
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 text-[var(--c-ink-3)] hover:text-[var(--c-ink)] transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. Specific Issue Title */}
        <h4 className="display-tight font-bold text-base text-[var(--c-ink)] leading-snug">
          {finding.title}
        </h4>

        {/* 3. Category & Governing Rule Reference */}
        {finding.sourcePrinciple && (
          <div className="mono text-[11px] text-[var(--c-ink-3)] flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--c-accent)]" />
            <span>Standard: {finding.sourcePrinciple}</span>
          </div>
        )}

        {/* 4. Evidence / Problem Description */}
        <p className={`text-[13px] text-[var(--c-ink-2)] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
          {finding.description}
        </p>

        {/* Offending Code Snippet (Expanded) */}
        {isExpanded && finding.snippet && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 mono text-[11px] uppercase tracking-wider text-[var(--c-ink-3)]">
              <Code className="w-3 h-3 text-[var(--c-ink-3)]" />
              <span>OFFENDING DOM FRAGMENT:</span>
            </div>
            <pre className="p-3 bg-[var(--c-bg-alt)] border border-[var(--c-line)] text-[11px] mono text-[var(--c-ink)] overflow-x-auto whitespace-pre-wrap break-all">
              {finding.snippet}
            </pre>
          </div>
        )}

        {/* 5. Selector Pill */}
        <div className="flex items-center justify-between gap-2 p-2 bg-[var(--c-bg-alt)] border border-[var(--c-line)] text-[11px] mono text-[var(--c-ink-2)]">
          <span className="truncate">
            <strong className="text-[var(--c-ink-3)]">SEL:</strong> {finding.selector}
            {finding.instanceSelectors && finding.instanceSelectors.length > 1 && (
              <span className="text-[var(--c-ink-3)] ml-1">
                (+{finding.instanceSelectors.length - 1} more)
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={handleCopySelector}
            className="p-1 text-[var(--c-ink-3)] hover:text-[var(--c-ink)] transition-colors shrink-0"
            title="Copy element selector"
          >
            {copiedSelector ? <Check className="w-3.5 h-3.5 text-[var(--c-good)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 6. Recommended Action / Fix */}
        <div className="p-3 bg-[var(--c-bg-alt)] border-l-2 border-l-[var(--c-accent)] border-y border-r border-[var(--c-line)] space-y-1">
          <div className="flex items-center gap-1.5 label-sm text-[var(--c-accent)]">
            <Wrench className="w-3 h-3" />
            <span>RECOMMENDED REMEDIATION:</span>
          </div>
          <p className="text-xs text-[var(--c-ink-2)] leading-relaxed">
            {finding.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
