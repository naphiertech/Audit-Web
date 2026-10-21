import type { AuditReport, Finding } from "@/lib/specimens/types";
import { markersFor, useElementWidth } from "./ReportBits";

export function ReportPreview({
  report,
  html,
  selectedId,
  onSelect,
  showMarkers,
  maxHeight = 440,
  label,
}: {
  report: AuditReport | null;
  html: string;
  selectedId: string | null;
  onSelect: (finding: Finding) => void;
  showMarkers: boolean;
  maxHeight?: number;
  label?: string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const pageWidth = 1280;
  const pageHeight = Math.max(900, report?.stats.height || 1300);
  const scale = width > 0 ? width / pageWidth : 0.4;
  const markers = report ? markersFor(report.findings) : [];
  const accessibleLabel = label || "Specimen preview";

  return (
    <div
      ref={ref}
      className="preview-scroll relative"
      style={{ maxHeight }}
      aria-label={accessibleLabel}
      tabIndex={0}
      role="region"
    >
      <div className="relative w-full" style={{ height: Math.round(pageHeight * scale) }}>
        <iframe
          className="preview-frame"
          title={accessibleLabel}
          srcDoc={html}
          sandbox=""
          referrerPolicy="no-referrer"
          tabIndex={-1}
          style={{
            width: pageWidth,
            height: pageHeight,
            transform: `scale(${scale})`,
          }}
        />
        {showMarkers &&
          markers.map((finding, index) => {
            const region = finding.region!;
            return (
              <button
                key={finding.id}
                type="button"
                className="marker-pin"
                style={{
                  left: `clamp(15px, ${region.x}%, calc(100% - 15px))`,
                  top: `clamp(15px, ${region.y}%, calc(100% - 15px))`,
                }}
                onClick={() => onSelect(finding)}
                aria-pressed={selectedId === finding.id}
                aria-label={`Marker ${index + 1}: ${finding.id} — ${finding.title}`}
              >
                {index + 1}
              </button>
            );
          })}
      </div>
    </div>
  );
}
