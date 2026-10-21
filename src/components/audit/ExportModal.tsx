'use client';

import React, { useState, useEffect } from 'react';
import { AuditResult } from '@/types/audit';
import {
  generateAgentsMarkdown,
  generateAuditMarkdown,
  generateAiPrompt,
  generateCursorRules,
  generateClaudeMd,
} from '@/lib/auditor/report-generator';
import { X, Copy, Check, Download, Bot, FileText, Code2, Sparkles, Terminal } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AuditResult;
}

export function ExportModal({ isOpen, onClose, result }: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<'agents' | 'cursor' | 'claude' | 'audit' | 'json'>('agents');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const agentsMd = generateAgentsMarkdown(result);
  const cursorRules = generateCursorRules(result);
  const claudeMd = generateClaudeMd(result);
  const auditMd = generateAuditMarkdown(result);
  const jsonContent = JSON.stringify(result, null, 2);

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'agents': return agentsMd;
      case 'cursor': return cursorRules;
      case 'claude': return claudeMd;
      case 'audit': return auditMd;
      case 'json': return jsonContent;
    }
  };

  const currentContent = getCurrentContent();

  const handleCopyCurrent = async () => {
    await navigator.clipboard.writeText(currentContent);
    setCopiedType('current');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyPrompt = async () => {
    const prompt = generateAiPrompt(result);
    await navigator.clipboard.writeText(prompt);
    setCopiedType('prompt');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownload = () => {
    let filename = 'AGENTS.md';
    let mime = 'text/markdown';

    if (activeTab === 'cursor') {
      filename = '.cursorrules';
      mime = 'text/plain';
    } else if (activeTab === 'claude') {
      filename = 'CLAUDE.md';
      mime = 'text/markdown';
    } else if (activeTab === 'audit') {
      filename = 'AUDIT.md';
      mime = 'text/markdown';
    } else if (activeTab === 'json') {
      filename = `audit-${result.id}.json`;
      mime = 'application/json';
    }

    const blob = new Blob([currentContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs: { id: 'agents' | 'cursor' | 'claude' | 'audit' | 'json'; label: string; icon: React.ElementType }[] = [
    { id: 'agents', label: 'AGENTS.MD', icon: Bot },
    { id: 'cursor', label: '.CURSORRULES', icon: Terminal },
    { id: 'claude', label: 'CLAUDE.MD', icon: Sparkles },
    { id: 'audit', label: 'AUDIT.MD', icon: FileText },
    { id: 'json', label: 'JSON RAW', icon: Code2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[85vh] bg-[var(--c-surface)] border border-[var(--c-line-strong)] shadow-2xl flex flex-col text-[var(--c-ink)] overflow-hidden">
        {/* Modal Header (Fixed, shrink-0) */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--c-line)] bg-[var(--c-bg-alt)]">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-[var(--c-accent)] shrink-0" />
            <div>
              <h3 className="display-tight font-bold text-base text-[var(--c-ink)]">
                EXPORT SPECIFICATION
              </h3>
              <p className="mono text-[11px] text-[var(--c-ink-3)]">
                Calibrated defect remediation rules for autonomous coding agents & IDEs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--c-ink-3)] hover:text-[var(--c-ink)] hover:bg-[var(--c-surface)] transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Action Toolbar (Fixed, shrink-0, never clipped) */}
        <div className="shrink-0 border-b border-[var(--c-line)] bg-[var(--c-surface)] px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Format Selector Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 mono text-[11px] font-semibold uppercase tracking-wider border transition-all ${
                    isActive
                      ? 'bg-[var(--c-ink)] text-[var(--c-bg)] border-[var(--c-ink)] shadow-xs'
                      : 'bg-[var(--c-bg-alt)] text-[var(--c-ink-2)] border-[var(--c-line)] hover:border-[var(--c-line-strong)] hover:text-[var(--c-ink)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Export Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="btn btn-quiet btn-sm"
              title="Copy prompt formatted for Claude, GPT-4, Gemini"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--c-accent)]" />
              <span>{copiedType === 'prompt' ? 'PROMPT COPIED!' : 'AI PROMPT'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCurrent}
              className="btn btn-primary btn-sm"
            >
              {copiedType === 'current' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--c-good)]" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY FILE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-quiet btn-sm"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD</span>
            </button>
          </div>
        </div>

        {/* Code Content Body (Scrollable, min-h-0 prevents flex overlap) */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-auto bg-[var(--c-bg-alt)]">
          <pre className="text-xs mono text-[var(--c-ink)] whitespace-pre-wrap break-all leading-relaxed p-4 bg-[var(--c-surface)] border border-[var(--c-line)] shadow-xs">
            {currentContent}
          </pre>
        </div>

        {/* Modal Footer (Fixed, shrink-0) */}
        <div className="shrink-0 px-6 py-3 border-t border-[var(--c-line)] bg-[var(--c-surface)] flex items-center justify-between text-xs text-[var(--c-ink-3)]">
          <div className="mono text-[11px]">
            Target: <strong className="text-[var(--c-ink)]">{result.url}</strong> · {result.findings.length} findings
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mono text-[11px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)] underline"
          >
            [Close Window]
          </button>
        </div>
      </div>
    </div>
  );
}
