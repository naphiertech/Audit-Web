import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export const ArrowUpRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" />
  </svg>
);

export const ArrowDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 3.5v9M4.5 9 8 12.5 11.5 9" />
  </svg>
);

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const ChevronDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4 6.5 4 4 4-4" />
  </svg>
);

export const Sun = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="2.9" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
  </svg>
);

export const Moon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13.2 9.8A5.7 5.7 0 0 1 6.2 2.8a5.7 5.7 0 1 0 7 7Z" />
  </svg>
);

export const Check = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m3 8.4 3.1 3.1L13 4.8" />
  </svg>
);

export const X = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

export const Search = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="7" cy="7" r="4.4" />
    <path d="m10.4 10.4 3 3" />
  </svg>
);

export const Download = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11" />
  </svg>
);

export const Refresh = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 6.5A5.2 5.2 0 0 0 3.6 4.2L2 6M2 2v4h4M3 9.5a5.2 5.2 0 0 0 9.4 2.3L14 10M14 14v-4h-4" />
  </svg>
);

export const Code = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 5-3 3 3 3M11 5l3 3-3 3M9 3.5l-2 9" />
  </svg>
);

export const Target = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="5.5" />
    <circle cx="8" cy="8" r="2" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
  </svg>
);

export const Layers = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m8 2 6 3.2L8 8.4 2 5.2 8 2ZM2 8.2l6 3.2 6-3.2M2 11.2l6 3.2 6-3.2" />
  </svg>
);

export const Mark = ({ className = "" }: { className?: string }) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <rect x="0.75" y="0.75" width="24.5" height="24.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12.7 6.2 5.4 20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="square" />
    <path d="M12.7 6.2 20 20" stroke="var(--c-signal-fill, #e84a17)" strokeWidth="1.9" strokeLinecap="square" />
    <path d="M8.2 15.4h9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="square" />
  </svg>
);

export const Wordmark = ({ compact = false }: { compact?: boolean }) => (
  <span className="inline-flex items-center gap-2.5" aria-hidden="true">
    <Mark className="shrink-0" />
    <span className={`flex items-baseline ${compact ? "gap-[3px]" : "gap-1"}`}>
      <span className="display-tight leading-none tracking-[-0.055em] text-[19px]">AUDIT</span>
      <span className="mono text-[15px] font-normal text-[var(--c-signal-fill)] leading-none">/</span>
      <span className="mono text-[13px] font-medium leading-none tracking-[0.02em]">WEB</span>
    </span>
  </span>
);
