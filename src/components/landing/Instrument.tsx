import { useEffect, useState } from "react";
import type { AuditReport, Finding } from "@/lib/specimens/types";
import { CATEGORIES } from "@/lib/specimens/types";
import type { Specimen } from "@/lib/specimens/specimens";
import { ArrowUpRight, Code } from "@/components/Icons";
import { ReportPreview } from "./ReportPreview";
import { SegBar, SeverityTag, shortSelector } from "./ReportBits";

export function InspectionInstrument({
  specimen,
  html,
  report,
  loading,
  mode = "landing",
  maxHeight = 430,
}: {
  specimen: Specimen;
  html: string;
  report: AuditReport | null;
  loading?: boolean;
  mode?: "landing" | "report";
  maxHeight?: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);

  useEffect(() => {
    if (!report) return;
    const preferred =
      report.findings.find((f) => f.region && f.severity === "critical") ??
      report.findings.find((f) => f.region) ??
      report.findings[0];
    setSelectedId(preferred?.id ?? null);
  }, [report]);

  const selected: Finding | null =
    report?.findings.find((finding) => finding.id === selectedId) ??
    report?.findings[0] ??
    null;

  const markerCount = report
    ? report.findings.filter((f) => f.region).length
    : 0;

  return (
    <div className="panel-dark instrument relative">
      {/* machine header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--panel-line)] px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5">
            <i className="block h-1.5 w-1.5 bg-[var(--panel-signal)]" aria-hidden="true" />
            <span className="label-sm text-[var(--panel-ink)]">
              {mode === "landing" ? "Inspection instrument" : "Evidence view"}
            </span>
          </span>
          <span className="hidden h-3 w-px bg-[var(--panel-line)] sm:block" aria-hidden="true" />
          <span className="label-sm hidden text-[var(--panel-ink-3)] sm:inline">
            Specimen {specimen.id === "atelier" ? "01" : specimen.id === "fieldnotes" ? "02" : "03"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="mono hidden text-[11px] text-[var(--panel-ink-2)] md:inline">
            {specimen.domain}
          </span>
          <span className="mono text-[11px] tabular-nums text-[var(--panel-ink-3)]">1280 × {maxHeight}</span>
          <button
            type="button"
            onClick={() => setShowMarkers((value) => !value)}
            aria-pressed={showMarkers}
            className="mono inline-flex items-center gap-1.5 border border-[var(--panel-line)] px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--panel-ink-2)] transition-colors hover:border-[var(--panel-ink-2)] hover:text-[var(--panel-ink)]"
          >
            <Code size={11} />
            Markers {showMarkers ? "on" : "off"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_326px] xl:grid-cols-[minmax(0,1fr)_356px]">
        {/* rendered evidence */}
        <div className="min-w-0 border-b border-[var(--panel-line)] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-line-soft)] px-3 py-2">
            <span className="mono truncate text-[12px] tracking-[0.04em] text-[var(--panel-ink-2)]">
              {specimen.name} — rendered specimen
            </span>
            <span className="mono shrink-0 text-[12px] text-[var(--panel-ink-3)]">
              {loading ? "Measuring…" : `${report?.findings.length ?? 0} findings · ${markerCount} mapped`}
            </span>
          </div>

          <div className="relative">
            <ReportPreview
              report={report}
              html={html}
              selectedId={selectedId}
              onSelect={(finding) => setSelectedId(finding.id)}
              showMarkers={showMarkers}
              maxHeight={maxHeight}
              label={`Rendered preview of ${specimen.domain}`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--panel-line)] px-3 py-2">
            <span className="mono text-[12px] leading-relaxed text-[var(--panel-ink-3)]">
              {report
                ? `${report.stats.elements} elements · ${report.stats.fonts.length} typefaces · ${report.stats.colors} colours`
                : "Parsing markup · rendering page · sampling computed styles"}
            </span>
            <span className="mono hidden shrink-0 text-[11px] tracking-[0.06em] text-[var(--panel-ink-3)] sm:inline">
              scripts disabled
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--panel-line)] px-3 py-2.5">
            <span className="label-sm shrink-0 text-[var(--panel-ink-3)]">Other subjects</span>
            {[
              ["atelier", "Atelier Nord"],
              ["fieldnotes", "Field Notes"],
              ["monogram", "Monogram"],
            ].map(([id, name]) => (
              <a
                key={id}
                href={`#top`}
                aria-current={specimen.id === id ? "true" : undefined}
                className={`mono inline-flex items-center gap-1.5 border px-2 py-1 text-[11px] uppercase tracking-[0.06em] no-underline transition-colors ${
                  specimen.id === id
                    ? "border-[var(--panel-good)] text-[var(--panel-good)]"
                    : "border-[var(--panel-line)] text-[var(--panel-ink-2)] hover:border-[var(--panel-ink-2)] hover:text-[var(--panel-ink)]"
                }`}
              >
                {specimen.id === id && <i className="h-1 w-1 bg-[var(--panel-good)]" aria-hidden="true" />}
                {name}
              </a>
            ))}
          </div>
        </div>

        {/* measured rail */}
        <aside className="flex flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="label-sm text-[var(--panel-ink-3)]">Overall index</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="display text-[58px] leading-[0.8] tabular-nums text-[var(--panel-ink)]">
                  {report ? report.overall : "—"}
                </span>
                <span className="mono pb-1 text-[11px] text-[var(--panel-ink-3)]">/100</span>
              </div>
            </div>
            <span className="mono inline-flex items-center gap-1.5 border border-[var(--panel-line)] px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--panel-ink-2)]">
              <i
                className="block h-1.5 w-1.5"
                style={{
                  background:
                    report && report.overall < 55
                      ? "var(--panel-signal)"
                      : report && report.overall < 75
                        ? "var(--panel-warn)"
                        : "var(--panel-good)",
                }}
                aria-hidden="true"
              />
              {report ? report.grade : "Measuring"}
            </span>
          </div>

          <p className="mt-3 min-h-[36px] text-[12px] leading-[1.5] text-[var(--panel-ink-2)]">
            {report ? report.verdict : "Reading the rendered document. Every number below is derived from an observed finding."}
          </p>

          <div className="mt-3">
            <SegBar value={report?.overall ?? 0} segments={26} />
            <div className="mt-1.5 flex justify-between">
              <span className="mono text-[11px] uppercase tracking-[0.08em] text-[var(--panel-ink-3)]">0 · critical</span>
              <span className="mono text-[11px] uppercase tracking-[0.08em] text-[var(--panel-ink-3)]">100 · sound</span>
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--panel-line)]">
            {CATEGORIES.map((category) => {
              const result = report?.categories.find((c) => c.id === category.id);
              return (
                <div
                  key={category.id}
                  className="grid grid-cols-[16px_1fr_28px] items-center gap-2 border-b border-[var(--panel-line-soft)] py-[7px]"
                >
                  <span className="mono text-[11px] text-[var(--panel-ink-3)]">{category.index}</span>
                  <div>
                    <span className="text-[12px] leading-tight text-[var(--panel-ink-2)]">
                      {category.label}
                    </span>
                    <div className="mt-1 h-[2px] w-full bg-[var(--panel-line)] overflow-hidden">
                      <div
                        className="h-full w-full origin-left transition-transform duration-700 ease-out"
                        style={{
                          transform: `scaleX(${Math.max(0, Math.min(100, result?.score ?? 0)) / 100})`,
                          background:
                            result && result.score < 55
                              ? "var(--panel-signal)"
                              : result && result.score < 75
                                ? "var(--panel-warn)"
                                : "var(--panel-good)",
                        }}
                      />
                    </div>
                  </div>
                  <span className="mono text-right text-[11px] tabular-nums text-[var(--panel-ink-2)]">
                    {result ? result.score : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex-1 border-t border-[var(--panel-line)] pt-3.5">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <SeverityTag severity={selected.severity} />
                  <span className="mono text-[11px] tracking-[0.08em] text-[var(--panel-ink-3)]">
                    {selected.id}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-medium leading-snug tracking-[-0.01em] text-[var(--panel-ink)]">
                  {selected.title}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.5] text-[var(--panel-ink-2)]">
                  {selected.summary}
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--panel-line-soft)] pt-2">
                  <code className="mono truncate text-[11px] text-[var(--panel-ink-3)]">
                    {shortSelector(selected.selector)}
                  </code>
                  <span className="mono shrink-0 text-[11px] text-[var(--panel-ink-3)]">
                    ×{selected.occurrences}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-2" aria-hidden="true">
                <div className="h-2 w-20 bg-[var(--panel-surface-2)]" />
                <div className="h-3 w-full bg-[var(--panel-surface-2)]" />
                <div className="h-3 w-4/5 bg-[var(--panel-surface-2)]" />
                <p className="mono pt-2 text-[11px] uppercase tracking-[0.08em] text-[var(--panel-ink-3)]">
                  Awaiting measurement
                </p>
              </div>
            )}
          </div>

          <a
            href="#findings"
            className="group mono mt-4 flex items-center justify-between gap-2 border border-[var(--panel-line)] px-3 py-2.5 text-[11px] uppercase tracking-[0.08em] text-[var(--panel-ink)] no-underline transition-colors hover:border-[var(--panel-accent)] hover:text-white"
          >
            Read the findings breakdown
            <ArrowUpRight size={12} className="arrow text-[var(--panel-accent)]" />
          </a>
        </aside>
      </div>
    </div>
  );
}
