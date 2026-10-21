'use client';

import React, { useEffect, useState } from 'react';
import { AuditSummary } from '@/types/audit';
import { X, ExternalLink, Clock, ChevronRight } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudit: (id: string) => void;
}

export function HistoryDrawer({ isOpen, onClose, onSelectAudit }: HistoryDrawerProps) {
  const [history, setHistory] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);

      let localList: AuditSummary[] = [];
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('auditweb_local_history');
          if (raw) localList = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Failed to parse local history:', e);
      }

      fetch('/api/history')
        .then((res) => res.json())
        .then((data) => {
          const serverList: AuditSummary[] = data.history || [];
          const map = new Map<string, AuditSummary>();
          for (const item of localList) map.set(item.id, item);
          for (const item of serverList) {
            if (!map.has(item.id)) map.set(item.id, item);
          }
          setHistory(Array.from(map.values()));
        })
        .catch(() => {
          if (localList.length > 0) setHistory(localList);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-[var(--c-surface)] border-l border-[var(--c-line-strong)] shadow-2xl flex flex-col text-[var(--c-ink)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-line)] bg-[var(--c-bg-alt)]">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[var(--c-accent)]" />
            <h3 className="display-tight font-bold text-sm tracking-wide text-[var(--c-ink)]">
              INSPECTION ARCHIVE
            </h3>
            <span className="mono text-[11px] px-2 py-0.5 bg-[var(--c-surface)] text-[var(--c-ink-3)] border border-[var(--c-line)]">
              {history.length} runs
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--c-ink-3)] hover:text-[var(--c-ink)] hover:bg-[var(--c-surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-auto divide-y divide-[var(--c-line)]">
          {loading ? (
            <div className="text-center py-16 mono text-xs text-[var(--c-ink-3)]">
              Retrieving inspection history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 mono text-xs text-[var(--c-ink-3)]">
              No prior audits recorded in database.
            </div>
          ) : (
            history.map((item) => {
              const dateStr = new Date(item.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              let scoreColor = 'text-[var(--c-good)]';
              if (item.overallScore < 60) scoreColor = 'text-[var(--c-signal)]';
              else if (item.overallScore < 80) scoreColor = 'text-[var(--c-warn)]';
              else if (item.overallScore < 90) scoreColor = 'text-[var(--c-accent)]';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectAudit(item.id);
                    onClose();
                  }}
                  className="p-4 hover:bg-[var(--c-bg-alt)] cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="space-y-1 pr-3 truncate">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[11px] uppercase tracking-wider text-[var(--c-ink-3)] border border-[var(--c-line)] px-1.5 py-0.2 bg-[var(--c-bg-alt)]">
                        {item.device}
                      </span>
                      <span className="mono text-[11px] text-[var(--c-ink-3)]">
                        {dateStr}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-[var(--c-ink)] truncate group-hover:text-[var(--c-accent)] transition-colors">
                      {item.url}
                    </div>
                    <div className="mono text-[11px] text-[var(--c-ink-3)]">
                      {item.id}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`mono text-base font-bold tabular-nums ${scoreColor}`}>
                        {item.overallScore}
                      </div>
                      <div className="mono text-[11px] text-[var(--c-ink-3)]">
                        / 100
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--c-ink-3)] group-hover:text-[var(--c-ink)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--c-line)] bg-[var(--c-bg-alt)] text-center">
          <p className="mono text-[11px] text-[var(--c-ink-3)]">
            Persisted in local SQLite database
          </p>
        </div>
      </div>
    </div>
  );
}
