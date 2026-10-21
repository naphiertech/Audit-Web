'use client';

import React, { useRef, useState, useEffect } from 'react';
import { AuditFinding, AuditResult } from '@/types/audit';
import { generateAuditMarkdown } from '@/lib/auditor/report-generator';
import {
  Download,
  Copy,
  Check,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Laptop,
  Smartphone,
  Eye,
  Layers,
} from 'lucide-react';

interface ScreenshotInspectorProps {
  result: AuditResult;
  selectedFindingId: string | null;
  onSelectFinding: (id: string) => void;
  filteredFindings: AuditFinding[];
  onOpenExport: () => void;
  onSwitchDevice: (device: 'desktop' | 'mobile') => void;
}

export function ScreenshotInspector({
  result,
  selectedFindingId,
  onSelectFinding,
  filteredFindings,
  onOpenExport,
  onSwitchDevice,
}: ScreenshotInspectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [hoveredFinding, setHoveredFinding] = useState<AuditFinding | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'canvas' | 'live'>('canvas');

  // Document coordinate bounds
  const origW = result.documentDimensions?.width || result.viewport.width;
  const origH = result.documentDimensions?.height || result.viewport.height;

  // Findings with spatial bounding box
  const pinFindings = filteredFindings.filter(
    (f) => f.bbox && f.bbox.width > 0 && f.bbox.height > 0
  );

  // Auto-scroll to selected pin
  useEffect(() => {
    if (!selectedFindingId || !containerRef.current || !imageWrapperRef.current) return;
    const activeFinding = pinFindings.find((f) => f.id === selectedFindingId);
    if (!activeFinding || !activeFinding.bbox) return;

    const container = containerRef.current;
    const wrapper = imageWrapperRef.current;

    const scaleY = wrapper.clientHeight / origH;
    const targetY = activeFinding.bbox.y * scaleY;
    const targetX = (activeFinding.bbox.x / origW) * wrapper.clientWidth;

    container.scrollTo({
      top: Math.max(0, targetY - container.clientHeight / 2),
      left: Math.max(0, targetX - container.clientWidth / 2),
      behavior: 'smooth',
    });
  }, [selectedFindingId, origH, origW, pinFindings]);

  const handleCopyMarkdown = async () => {
    try {
      const md = generateAuditMarkdown(result);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      const md = generateAuditMarkdown(result);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AUDIT-${result.id}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.location.href = `/api/audit/${result.id}/export?format=markdown`;
    }
  };

  return (
    <div className="relative w-full border border-[var(--c-line)] bg-[var(--c-surface)] flex flex-col overflow-hidden shadow-xs">
      {/* Studio Inspection Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[var(--c-line)] bg-[var(--c-bg-alt)] text-xs">
        {/* Left: View Mode & Viewport Controls */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex bg-[var(--c-surface)] p-0.5 border border-[var(--c-line)]">
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1 font-semibold transition-colors ${
                viewMode === 'canvas'
                  ? 'bg-[var(--c-accent)] text-white shadow-xs'
                  : 'text-[var(--c-ink-3)] hover:text-[var(--c-ink)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="label-sm">Canvas ({pinFindings.length} pins)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('live')}
              className={`flex items-center gap-1.5 px-3 py-1 font-semibold transition-colors ${
                viewMode === 'live'
                  ? 'bg-[var(--c-accent)] text-white shadow-xs'
                  : 'text-[var(--c-ink-3)] hover:text-[var(--c-ink)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="label-sm">Live Iframe</span>
            </button>
          </div>

          {/* Device Toggle */}
          <div className="flex bg-[var(--c-surface)] p-0.5 border border-[var(--c-line)]">
            <button
              type="button"
              onClick={() => onSwitchDevice('desktop')}
              className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                result.device === 'desktop'
                  ? 'bg-[var(--c-ink)] text-[var(--c-bg)] font-medium'
                  : 'text-[var(--c-ink-3)] hover:text-[var(--c-ink)]'
              }`}
              title="Inspect Desktop Viewport (1440x900)"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span className="label-sm hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchDevice('mobile')}
              className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                result.device === 'mobile'
                  ? 'bg-[var(--c-ink)] text-[var(--c-bg)] font-medium'
                  : 'text-[var(--c-ink-3)] hover:text-[var(--c-ink)]'
              }`}
              title="Inspect Mobile Viewport (390x844)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="label-sm hidden sm:inline">Mobile</span>
            </button>
          </div>

          <span className="mono text-[11px] text-[var(--c-ink-3)] hidden md:inline">
            {origW}×{origH}px
          </span>
        </div>

        {/* Right: Zoom & Export Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'canvas' && (
            <div className="flex items-center bg-[var(--c-surface)] border border-[var(--c-line)] text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                title="Zoom Out"
                className="p-1.5 text-[var(--c-ink-3)] hover:text-[var(--c-ink)]"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 mono text-[11px] text-[var(--c-ink-2)] border-x border-[var(--c-line)]">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
                title="Zoom In"
                className="p-1.5 text-[var(--c-ink-3)] hover:text-[var(--c-ink)]"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                title="Reset Scale"
                className="p-1.5 text-[var(--c-ink-3)] hover:text-[var(--c-ink)] border-l border-[var(--c-line)]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenExport}
            className="btn btn-primary btn-sm px-3"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>EXPORT SPEC</span>
          </button>
          <button
            type="button"
            onClick={handleCopyMarkdown}
            title="Copy Report"
            className="p-2 text-[var(--c-ink-2)] hover:text-[var(--c-ink)] bg-[var(--c-surface)] border border-[var(--c-line)] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--c-good)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            title="Download Report"
            className="p-2 text-[var(--c-ink-2)] hover:text-[var(--c-ink)] bg-[var(--c-surface)] border border-[var(--c-line)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Inspection Viewport */}
      {viewMode === 'live' ? (
        <div className="w-full h-[660px] bg-[var(--c-bg-alt)] p-4 flex justify-center">
          <iframe
            src={result.url}
            title={`Live preview: ${result.url}`}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border border-[var(--c-line)] bg-white shadow-md"
            style={{
              maxWidth: result.device === 'mobile' ? '390px' : '100%',
            }}
          />
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative w-full h-[660px] overflow-auto bg-[var(--c-bg-alt)] flex justify-center items-start p-6 select-none scroll-smooth"
        >
          <div
            ref={imageWrapperRef}
            className="relative border border-[var(--c-line)] bg-[var(--c-surface)] transition-transform duration-100 origin-top shadow-md"
            style={{
              width: result.device === 'mobile' ? '390px' : '100%',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
            }}
          >
            {/* Full-Page Screenshot Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.screenshot}
              alt={`Inspection render: ${result.url}`}
              className="w-full h-auto block select-none"
            />

            {/* Calibrated Pin Overlay */}
            {pinFindings.map((finding) => {
              if (!finding.bbox) return null;

              const topPct = (finding.bbox.y / origH) * 100;
              const leftPct = (finding.bbox.x / origW) * 100;
              const widthPct = (finding.bbox.width / origW) * 100;
              const heightPct = (finding.bbox.height / origH) * 100;

              const isSelected = selectedFindingId === finding.id;

              // Severity marker styling
              let markerBg = 'bg-[var(--c-warn)] text-white';
              let boxBorder = 'border-[var(--c-warn)]';
              if (finding.severity === 'critical') {
                markerBg = 'bg-[var(--c-signal)] text-white';
                boxBorder = 'border-[var(--c-signal)]';
              } else if (finding.severity === 'medium') {
                markerBg = 'bg-[var(--c-accent)] text-white';
                boxBorder = 'border-[var(--c-accent)]';
              } else if (finding.severity === 'low') {
                markerBg = 'bg-[var(--c-ink-3)] text-white';
                boxBorder = 'border-[var(--c-ink-3)]';
              }

              return (
                <React.Fragment key={finding.id}>
                  {/* Bounding Box on Selected Pin */}
                  {isSelected && (
                    <>
                      <div
                        className={`absolute pointer-events-none border-2 border-dashed ${boxBorder} bg-[var(--c-accent)]/10 z-10`}
                        style={{
                          top: `${topPct}%`,
                          left: `${leftPct}%`,
                          width: `${Math.max(1.5, widthPct)}%`,
                          height: `${Math.max(0.8, heightPct)}%`,
                        }}
                      >
                        <span className="absolute -top-5 -left-1 mono text-[11px] px-1.5 py-0.2 bg-[var(--c-ink)] text-[var(--c-bg)] border border-[var(--c-line)]">
                          #{finding.number} {finding.severity.toUpperCase()}
                          {finding.instancesCount && finding.instancesCount > 1 ? ` (${finding.instancesCount}x)` : ''}
                        </span>
                      </div>

                      {/* Highlight other instances of this clustered component defect */}
                      {finding.instanceBboxes &&
                        finding.instanceBboxes.slice(1).map((ib, iIdx) => {
                          const iTop = (ib.y / origH) * 100;
                          const iLeft = (ib.x / origW) * 100;
                          const iW = (ib.width / origW) * 100;
                          const iH = (ib.height / origH) * 100;
                          return (
                            <div
                              key={`inst-${finding.id}-${iIdx}`}
                              className={`absolute pointer-events-none border border-dashed ${boxBorder} bg-[var(--c-accent)]/5 z-10`}
                              style={{
                                top: `${iTop}%`,
                                left: `${iLeft}%`,
                                width: `${Math.max(1.5, iW)}%`,
                                height: `${Math.max(0.8, iH)}%`,
                              }}
                            />
                          );
                        })}
                    </>
                  )}

                  {/* Tactile Pin Marker */}
                  <button
                    type="button"
                    onClick={() => onSelectFinding(finding.id)}
                    onMouseEnter={() => setHoveredFinding(finding)}
                    onMouseLeave={() => setHoveredFinding(null)}
                    className={`absolute z-20 flex items-center justify-center mono font-bold text-xs border border-[var(--c-line-strong)] shadow-md cursor-pointer transition-all ${markerBg} ${
                      isSelected
                        ? 'scale-125 ring-2 ring-[var(--c-ink)] ring-offset-2 ring-offset-[var(--c-bg)] z-30'
                        : 'hover:scale-115'
                    }`}
                    style={{
                      top: `${topPct}%`,
                      left: `${Math.max(1, Math.min(99, leftPct))}%`,
                      width: '24px',
                      height: '24px',
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`#${finding.number}: ${finding.title}`}
                  >
                    {finding.number}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Hover Telemetry Preview Card */}
          {hoveredFinding && (
            <div className="fixed bottom-8 left-8 max-w-sm p-3.5 bg-[var(--c-surface)] border border-[var(--c-line-strong)] mono text-xs text-[var(--c-ink)] shadow-xl z-40 pointer-events-none space-y-1">
              <div className="flex items-center justify-between border-b border-[var(--c-line)] pb-1.5 text-[11px] text-[var(--c-ink-3)]">
                <span>DEFECT #{hoveredFinding.number} · {hoveredFinding.severity.toUpperCase()}</span>
                <span className="capitalize">{hoveredFinding.category}</span>
              </div>
              <p className="display-tight text-[13px] font-semibold text-[var(--c-ink)] leading-snug">
                {hoveredFinding.title}
              </p>
              <div className="text-[11px] text-[var(--c-ink-3)] truncate">
                SEL: {hoveredFinding.selector}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inspector Bottom Telemetry Strip */}
      <div className="px-5 py-2.5 border-t border-[var(--c-line)] bg-[var(--c-bg-alt)] flex items-center justify-between text-xs text-[var(--c-ink-3)]">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-[var(--c-accent)]" />
          <span className="mono text-[11px]">
            SPATIAL INSPECTION · <strong className="text-[var(--c-ink)]">{filteredFindings.length}</strong> ACTIVE DEFECTS
          </span>
        </div>
        <div className="mono text-[11px] text-[var(--c-ink-3)]">
          CALIBRATED TO {origW}×{origH}PX
        </div>
      </div>
    </div>
  );
}
