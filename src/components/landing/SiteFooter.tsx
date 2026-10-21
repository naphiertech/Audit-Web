import Link from "next/link";
import { ArrowUpRight, Mark } from "@/components/Icons";
import { ThemeToggle } from "./ThemeToggle";
import { TOTAL_CHECKS } from "@/lib/specimens/types";

export function SiteFooter() {
  const scrollToEntry = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("top");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      const input = document.querySelector<HTMLInputElement>("input[name='website']");
      if (input) setTimeout(() => input.focus(), 400);
    }
  };

  return (
    <footer className="border-t border-[var(--c-line)]">
      <div className="wrap grid gap-10 pb-12 pt-10 md:grid-cols-12 md:gap-6 md:pb-14 md:pt-14">
        <div className="md:col-span-5">
          <Link href="/" className="inline-flex items-center gap-3 no-underline" aria-label="AUDIT/WEB home">
            <Mark />
            <span className="flex items-baseline gap-1">
              <span className="display-tight text-[26px] leading-none">AUDIT</span>
              <span className="mono text-[22px] leading-none text-[var(--c-signal-fill)]">/</span>
              <span className="mono text-[18px] font-medium leading-none">WEB</span>
            </span>
          </Link>
          <p className="mt-5 max-w-[34ch] text-[14px] leading-relaxed text-[var(--c-ink-2)]">
            An evidence-based inspector for the modern web. Rendered measurement, a
            readable ledger, and a report you can act on.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <ThemeToggle />
            <span className="label-sm text-[var(--c-ink-3)]">Theme is remembered</span>
          </div>
        </div>

        <nav aria-label="Footer" className="md:col-span-3 md:col-start-7">
          <p className="label mb-4 text-[var(--c-ink-3)]">Index</p>
          <ul className="space-y-2.5 text-[14px]">
            <li><a href="#index" className="link no-underline hover:underline">Inspection categories</a></li>
            <li><a href="#instrument" className="link no-underline hover:underline">The instrument</a></li>
            <li><a href="#method" className="link no-underline hover:underline">Method &amp; process</a></li>
            <li><a href="#findings" className="link no-underline hover:underline">A finding, dissected</a></li>
            <li><a href="#access" className="link no-underline hover:underline">Free &amp; open access</a></li>
          </ul>
        </nav>

        <div className="md:col-span-3">
          <p className="label mb-4 text-[var(--c-ink-3)]">The workbench</p>
          <ul className="space-y-2.5 text-[14px]">
            <li>
              <a href="#instrument" className="link no-underline hover:underline">
                Inspect the specimen
              </a>
            </li>
            <li>
              <a href="#top" onClick={scrollToEntry} className="link no-underline hover:underline">
                Start with your URL <ArrowUpRight size={12} className="ml-0.5" />
              </a>
            </li>
            <li>
              <a href="#method" className="link no-underline hover:underline">
                Read the method
              </a>
            </li>
            <li>
              <a
                href="https://github.com/naphiertech"
                target="_blank"
                rel="noopener noreferrer"
                className="link inline-flex items-center gap-1 no-underline hover:underline"
              >
                GitHub @naphiertech <ArrowUpRight size={12} />
              </a>
            </li>
          </ul>
          <p className="mono mt-7 text-[11px] leading-relaxed text-[var(--c-ink-3)]">
            {TOTAL_CHECKS} checks · 6 categories
            <br />
            Reports stay in your browser.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--c-line-soft)]">
        <div className="wrap flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <p className="label-sm flex flex-wrap items-center gap-y-1 text-[var(--c-ink-3)]">
            <span>© {new Date().getFullYear()} AUDIT/WEB · Evidence over opinion</span>
            <span className="mx-2 hidden text-[var(--c-line-strong)] sm:inline" aria-hidden="true">/</span>
            <span>
              Engineered by <span className="font-medium text-[var(--c-ink)]">Naphier</span>
            </span>
            <span className="mx-1.5 text-[var(--c-line-strong)]" aria-hidden="true">·</span>
            <a
              href="https://github.com/naphiertech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--c-ink-2)] transition-colors hover:text-[var(--c-signal)] hover:underline"
              aria-label="Naphier GitHub profile @naphiertech"
            >
              @naphiertech <ArrowUpRight size={11} />
            </a>
          </p>
          <p className="mono text-[11px] leading-relaxed text-[var(--c-ink-3)]">
            No accounts. No tracking. No subscription.
          </p>
        </div>
      </div>
    </footer>
  );
}
