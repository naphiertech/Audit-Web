import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { ArrowUpRight, Mark, X } from "@/components/Icons";

const NAV_LINKS = [
  { href: "#index", label: "Index", number: "01" },
  { href: "#instrument", label: "Instrument", number: "02" },
  { href: "#method", label: "Method", number: "03" },
  { href: "#findings", label: "Findings", number: "04" },
  { href: "#access", label: "Access", number: "05" },
];

function WordmarkLink({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="group flex shrink-0 items-center gap-2.5 no-underline"
      aria-label="AUDIT/WEB — home"
    >
      <Mark className="transition-transform duration-300 group-hover:rotate-90" />
      <span className="flex items-baseline gap-[3px]">
        <span className="display-tight text-[20px] leading-none tracking-[-0.055em]">AUDIT</span>
        <span className="mono text-[15px] leading-none text-[var(--c-signal-fill)]">/</span>
        <span className="mono text-[13px] font-medium leading-none">WEB</span>
      </span>
    </Link>
  );
}

export function SiteNav({
  variant = "landing",
  onNewAudit,
}: {
  variant?: "landing" | "audit";
  onNewAudit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      ticking.current = false;
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const scrollToEntry = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById("top");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      const input = document.querySelector<HTMLInputElement>("input[name='website']");
      if (input) setTimeout(() => input.focus(), 400);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--c-line)] bg-[var(--c-bg)]">
      <div className="wrap flex h-[60px] items-center justify-between gap-5">
        <WordmarkLink onClick={() => setOpen(false)} />

        {variant === "landing" ? (
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-6 xl:gap-7">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group relative inline-flex items-center gap-1.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-[var(--c-ink-2)] no-underline transition-colors hover:text-[var(--c-ink)]"
                  >
                    <span className="mono text-[11px] text-[var(--c-ink-3)] transition-colors group-hover:text-[var(--c-signal)]">
                      {link.number}
                    </span>
                    {link.label}
                    <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[var(--c-ink)] transition-transform duration-200 group-hover:scale-x-100" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/" className="label text-[var(--c-ink-3)] no-underline hover:text-[var(--c-ink)]">
              ← The index
            </Link>
            <span className="h-3 w-px bg-[var(--c-line)]" aria-hidden="true" />
            <span className="label text-[var(--c-ink-2)]">Inspector</span>
            <span className="inline-flex items-center gap-1.5">
              <i className="block h-1.5 w-1.5 bg-[var(--c-good)]" aria-hidden="true" />
              <span className="label-sm text-[var(--c-ink-3)]">Local session</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {variant === "landing" ? (
            <a
              href="#top"
              onClick={scrollToEntry}
              className="btn btn-primary btn-sm hidden px-3.5 sm:inline-flex"
            >
              Inspect a site
              <ArrowUpRight size={13} className="arrow" />
            </a>
          ) : (
            <button type="button" onClick={onNewAudit} className="btn btn-primary btn-sm px-3.5">
              New audit
              <ArrowUpRight size={13} className="arrow" />
            </button>
          )}
          {variant === "landing" && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close navigation" : "Open navigation"}
              className="inline-flex h-9 w-9 items-center justify-center border border-[var(--c-line)] lg:hidden"
            >
              {open ? (
                <X size={16} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
                  <path d="M2 4.5h12M2 8h12M2 11.5h8" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="relative h-px w-full bg-[var(--c-line-soft)] overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-y-0 left-0 w-full origin-left bg-[var(--c-signal-fill)] transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {variant === "landing" && open && (
        <div
          id="mobile-menu"
          className="border-t border-[var(--c-line)] bg-[var(--c-bg)] lg:hidden"
        >
          <nav aria-label="Mobile primary" className="wrap py-3">
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.href} className="border-b border-[var(--c-line-soft)]">
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-3.5 text-[17px] tracking-[-0.02em] no-underline"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="mono text-[11px] text-[var(--c-ink-3)]">{link.number}</span>
                      {link.label}
                    </span>
                    <ArrowUpRight size={15} className="text-[var(--c-ink-3)]" />
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="#top"
              onClick={scrollToEntry}
              className="btn btn-primary mt-4 w-full"
            >
              Inspect a site
              <ArrowUpRight size={14} />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
