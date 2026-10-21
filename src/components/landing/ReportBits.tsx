import { useEffect, useRef, useState } from "react";
import type { Finding, Severity } from "@/lib/specimens/types";

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export function SegBar({
  value,
  segments = 24,
  tone = "default",
  className = "",
}: {
  value: number;
  segments?: number;
  tone?: "default" | "accent" | "good";
  className?: string;
}) {
  const on = Math.round((Math.max(0, Math.min(100, value)) / 100) * segments);
  return (
    <div
      className={`segbar ${tone === "accent" ? "accent" : tone === "good" ? "good" : ""} ${className}`}
      role="img"
      aria-label={`${Math.round(value)} out of 100`}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <i key={i} className={i < on ? "on" : ""} />
      ))}
    </div>
  );
}

export function SeverityTag({ severity }: { severity: Severity }) {
  return <span className={`sev sev-${severity}`}>{severity}</span>;
}

export function markersFor(findings: Finding[]) {
  const used: { x: number; y: number }[] = [];
  return findings
    .filter((finding) => {
      if (!finding.region) return false;
      const { x, y, w, h } = finding.region;
      if (w > 92 && h > 8) return false;
      if (h > 30) return false;
      if (x < 0.5 || y < 0.1) return false;
      return true;
    })
    .filter((finding) => {
      const region = finding.region!;
      const collision = used.some(
        (point) => Math.abs(point.x - region.x) < 5 && Math.abs(point.y - region.y) < 2.5,
      );
      if (collision) return false;
      used.push({ x: region.x, y: region.y });
      return true;
    })
    .slice(0, 9);
}

export function formatStamp(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function shortSelector(selector?: string) {
  if (!selector) return "rendered document";
  return selector.length > 46 ? `${selector.slice(0, 44)}…` : selector;
}
