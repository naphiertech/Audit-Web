'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteEntryForm } from "@/components/landing/SiteEntryForm";
import { InspectionInstrument } from "@/components/landing/Instrument";
import { SeverityTag, shortSelector } from "@/components/landing/ReportBits";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code,
  Download,
  Layers,
  Refresh,
  Search,
  Target,
} from "@/components/Icons";
import { CATEGORIES, TOTAL_CHECKS, type AuditReport, type Finding } from "@/lib/specimens/types";
import { getSpecimen } from "@/lib/specimens/specimens";
import { auditSpecimen } from "@/lib/specimens/specimenAudit";

/* ————————————————————————————————————————————————
   Reveal on scroll — content is always in the DOM
———————————————————————————————————————————————— */
function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

function useSpecimenReport(id = "atelier") {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    auditSpecimen(id)
      .then((next) => {
        if (mounted.current) setReport(next);
      })
      .catch(() => {
        if (mounted.current) setError(true);
      });
    return () => {
      mounted.current = false;
    };
  }, [id]);
  return { report, error };
}

/* ————————————————————————————————————————————————
   Masthead + hero
———————————————————————————————————————————————— */
function TopStrip() {
  return (
    <div className="bg-[var(--c-accent)] text-[var(--c-on-accent)]">
      <div className="wrap flex h-[30px] items-center justify-between gap-4">
        <p className="label-sm truncate">Independent interface inspection</p>
        <p className="label-sm hidden opacity-80 md:block">Rendered evidence / six categories</p>
        <p className="label-sm flex shrink-0 items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 bg-[var(--c-selection)]" aria-hidden="true" />
          Free &amp; open access
        </p>
      </div>
    </div>
  );
}

function Hero({ report }: { report: AuditReport | null }) {
  return (
    <section id="top" className="relative">
      <div className="wrap">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--c-line)] py-2.5">
          <p className="label text-[var(--c-ink-3)]">A study in evidence — No. 01</p>
          <p className="mono hidden text-[12px] tracking-[0.04em] text-[var(--c-ink-3)] sm:block">
            Accessibility / Experience / Visual / Type / Colour / Metadata
          </p>
          <p className="label-sm flex items-center gap-1.5 text-[var(--c-ink-2)]">
            <span className="h-1.5 w-1.5 bg-[var(--c-good)]" aria-hidden="true" />
            Instrument ready
          </p>
        </div>

        <div className="grid gap-0 pt-8 lg:grid-cols-12 lg:pt-10">
          <div className="col-span-12 lg:col-span-9 lg:pr-6 xl:pr-10">
            <h1 className="sr-only">Every interface leaves evidence.</h1>
            <p className="label intro mb-5 text-[var(--c-ink-3)]" style={{ "--d": "40ms" } as React.CSSProperties}>
              Evidence over opinion
            </p>
            <div
              className="display text-[clamp(2.85rem,7.2vw,6.4rem)] leading-[0.98]"
              aria-hidden="true"
            >
              <span className="intro block" style={{ "--d": "90ms" } as React.CSSProperties}>
                Every interface
              </span>
              <span
                className="intro flex items-end gap-x-4 sm:gap-x-6"
                style={{ "--d": "160ms" } as React.CSSProperties}
              >
                <span className="shrink-0">leaves</span>
                <span className="mb-[0.7em] hidden h-px flex-1 bg-[var(--c-line)] sm:block" aria-hidden="true" />
                <span className="hidden w-[220px] shrink-0 border-t border-[var(--c-ink)] pb-[0.3em] pt-2 lg:block xl:w-[250px]">
                  <span className="label-sm block text-[var(--c-signal)]">The premise</span>
                  <span className="mt-1 block text-[12px] leading-[1.45] tracking-[-0.01em] text-[var(--c-ink-2)]">
                    A website is not a matter of taste alone. It is a set of measurable decisions.
                  </span>
                </span>
              </span>
              <span
                className="intro flex items-end gap-x-4 sm:gap-x-6"
                style={{ "--d": "230ms" } as React.CSSProperties}
              >
                <span className="serif shrink-0 font-normal text-[var(--c-accent)]">evidence.</span>
                <span className="mb-[0.7em] hidden h-px flex-1 bg-[var(--c-line)] sm:block" aria-hidden="true" />
                <span className="hidden w-[220px] shrink-0 flex-col gap-1.5 pb-[0.5em] lg:flex xl:w-[250px]">
                  <span className="mono flex items-center gap-1.5 text-[11px] leading-none tracking-[0.08em] text-[var(--c-ink-3)]">
                    <span className="h-1.5 w-1.5 shrink-0 bg-[var(--c-signal-fill)]" aria-hidden="true" />
                    Live specimen
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="display text-[27px] leading-none tabular-nums">
                      {report ? report.overall : "——"}
                      <span className="mono ml-1 text-[11px] font-normal tracking-normal text-[var(--c-ink-3)]">
                        /100
                      </span>
                    </span>
                    <span className="mono text-[11px] leading-tight tracking-[0.06em] text-[var(--c-ink-3)]">
                      Atelier Nord
                      <br />
                      {report ? "measured" : "measuring"}
                    </span>
                  </span>
                  <span className="flex w-full gap-[2px]" aria-hidden="true">
                    {Array.from({ length: 24 }).map((_, index) => (
                      <i
                        key={index}
                        className="h-[3px] flex-1"
                        style={{
                          background:
                            report && index < Math.round((report.overall / 100) * 24)
                              ? index < 6
                                ? "var(--c-signal-fill)"
                                : "var(--c-ink)"
                              : "var(--c-line)",
                        }}
                      />
                    ))}
                  </span>
                </span>
              </span>
            </div>
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--c-line-soft)] pt-2 lg:hidden"
            >
              <p className="mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-ink-3)]">
                ↘ observe, measure, correct
              </p>
              <p className="mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-ink-3)]">
                Live specimen / {report ? `${report.overall}/100` : "measuring"}
              </p>
            </div>
            <div
              className="intro mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 lg:hidden"
              style={{ "--d": "290ms" } as React.CSSProperties}
            >
              <p className="label-sm text-[var(--c-signal)]">The premise</p>
              <p className="max-w-[46ch] text-[12px] leading-snug text-[var(--c-ink-2)]">
                A website is not a matter of taste alone. It is a set of measurable decisions.
              </p>
            </div>
          </div>

          <aside className="col-span-12 mt-8 border-t border-[var(--c-line)] pt-5 lg:col-span-3 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-1 xl:pl-8">
            <div className="intro" style={{ "--d": "300ms" } as React.CSSProperties}>
              <p className="label mb-4 text-[var(--c-ink-3)]">The brief</p>
              <p className="text-[19px] font-medium leading-[1.28] tracking-[-0.025em] text-balance">
                Inspect the details that shape a better website.
              </p>
              <p className="body-copy mt-3 text-[13.5px] leading-[1.55]">
                Measure accessibility, experience, visual design, typography, colour and
                metadata — straight from the rendered page.
              </p>
            </div>
            <dl className="intro mt-6 border-t border-[var(--c-line)]" style={{ "--d": "360ms" } as React.CSSProperties}>
              {CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className="flex items-baseline justify-between gap-2 border-b border-[var(--c-line-soft)] py-[6px]"
                >
                  <dt className="flex items-baseline gap-2 text-[12px] tracking-[-0.01em]">
                    <span className="mono text-[11px] text-[var(--c-ink-3)]">{category.index}</span>
                    {category.label}
                  </dt>
                  <dd className="mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-ink-3)]">
                    {category.checks.length} checks
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mono mt-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.08em] text-[var(--c-ink-3)]">
              <span>No account required</span>
              <span className="text-right text-[var(--c-ink-2)]">
                {report ? `${report.findings.length} findings, measured` : "measuring specimen"}
              </span>
            </p>
          </aside>
        </div>

        <div className="mt-8 border-y border-[var(--c-line)] py-5 lg:mt-10">
          <div className="grid gap-5 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8 xl:col-span-7">
              <SiteEntryForm
                label="Enter a website to inspect"
                cta="Inspect site"
                note="Runs in this browser. Pages that block cross-origin access can be inspected with headless Chromium."
              />
            </div>
            <div className="flex flex-col justify-between gap-4 lg:col-span-4 lg:border-l lg:border-[var(--c-line)] lg:pl-6 xl:col-span-5 xl:pl-8">
              <a
                href="#instrument"
                className="group inline-flex items-center justify-between gap-4 border-b border-[var(--c-ink)] pb-2 text-[15px] font-medium no-underline transition-colors hover:text-[var(--c-accent)]"
              >
                <span>See the inspection instrument</span>
                <ArrowDown size={16} className="arrow shrink-0 group-hover:translate-y-0.5" />
              </a>
              <p className="mono max-w-[62ch] text-[12px] leading-[1.6] text-[var(--c-ink-3)]">
                Six categories. {TOTAL_CHECKS} implemented checks. One ledger of evidence —
                not a score pulled from the air.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-[var(--c-line)] md:grid-cols-4">
          {[
            ["06", "inspection categories"],
            [String(TOTAL_CHECKS), "checks in this build"],
            ["1280", "px rendered measurement"],
            ["00", "accounts required"],
          ].map(([value, label], index) => (
            <div
              key={label}
              className={`flex items-baseline gap-3 py-4 md:py-5 ${
                index > 0 ? "md:border-l md:border-[var(--c-line)] md:pl-5" : ""
              } ${index % 2 === 1 ? "border-l border-[var(--c-line)] pl-4 md:pl-5" : ""}`}
            >
              <span className="display text-[27px] leading-none tabular-nums">{value}</span>
              <span className="mono max-w-[12ch] text-[11px] uppercase leading-[1.45] tracking-[0.08em] text-[var(--c-ink-3)]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————————————————————————————
   The instrument
———————————————————————————————————————————————— */
function InstrumentSection({ report }: { report: AuditReport | null }) {
  const specimen = getSpecimen("atelier");
  return (
    <section id="instrument" className="py-14 md:py-20">
      <div className="wrap">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--c-line-strong)] pt-3">
          <p className="label">Fig. 01 — Specimen under inspection</p>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden label-sm text-[var(--c-ink-3)] sm:inline">Severity</span>
            <SeverityTag severity="critical" />
            <SeverityTag severity="serious" />
            <SeverityTag severity="moderate" />
          </div>
        </div>

        <div className="mt-5 grid items-end gap-5 pb-6 md:grid-cols-12">
          <h2 className="reveal display col-span-12 max-w-[15ch] text-[clamp(2rem,4.2vw,3.8rem)] md:col-span-7">
            The page is <span className="serif font-normal">the evidence.</span>
          </h2>
          <p className="reveal body-copy col-span-12 max-w-[52ch] text-[14px] md:col-span-5 md:justify-self-end">
            Not a screenshot, not an illustration. This is a real specimen, rendered in a
            sandbox, measured with computed styles. Select any marker to read what was
            found at that point on the page.
          </p>
        </div>

        <div className="reveal">
          <InspectionInstrument
            specimen={specimen}
            html={specimen.html}
            report={report}
            loading={!report}
            maxHeight={470}
          />
        </div>

        <div className="mt-3 grid gap-3 border-t border-[var(--c-line)] pt-3 text-[var(--c-ink-3)] md:grid-cols-12">
          <p className="label-sm md:col-span-4">
            {report ? `01–${Math.min(9, report.findings.filter((f) => f.region).length)} / numbered evidence` : "Marker positions are being measured"}
          </p>
          <p className="mono text-[12px] leading-relaxed md:col-span-5 md:text-center">
            {report
              ? `${report.findings.length} findings generated live · ${report.stats.textNodes} contrast samples · ${report.stats.elements} elements`
              : "Rendering, sampling contrast and assembling the ledger."}
          </p>
          <a
            href="#findings"
            className="link label-sm justify-self-start no-underline hover:underline md:col-span-3 md:justify-self-end"
          >
            Inspect the findings <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————————————————————————————
   Capability index
———————————————————————————————————————————————— */
function CategoryIndex() {
  const [expanded, setExpanded] = useState<string>("accessibility");

  return (
    <section id="index" className="border-t border-[var(--c-line)] bg-[var(--c-bg-alt)] py-14 md:py-20">
      <div className="wrap">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <p className="label mb-4 text-[var(--c-ink-3)]">01 / The inspection index</p>
            <h2 className="reveal display text-[clamp(2.3rem,4.4vw,4rem)]">
              Six ways of looking.
              <br />
              <span className="serif font-normal text-[var(--c-accent)]">One ledger.</span>
            </h2>
            <p className="reveal body-copy mt-5 max-w-[38ch] text-[14px]">
              Every category is assembled from checks that run against the rendered
              document. The list below is the working build — not a roadmap wearing a
              feature's clothes.
            </p>
            <div className="reveal mt-7 border-t border-[var(--c-line)] pt-4">
              <p className="mono flex items-center gap-2 text-[11px] uppercase tracking-[0.08em]">
                <span className="inline-flex h-3 w-3 items-center justify-center bg-[var(--c-ink)] text-[var(--c-bg)]">
                  <Check size={8} />
                </span>
                Implemented &amp; scoring
              </p>
              <p className="mono mt-2 max-w-[50ch] text-[12px] leading-relaxed text-[var(--c-ink-3)]">
                Some checks only appear when the condition exists. A category with nothing
                to report is a clean result, not an unmeasured one.
              </p>
            </div>
            <a
              href="#method"
              className="group mt-7 inline-flex items-center gap-2 text-[13px] font-medium no-underline"
            >
              Read the method
              <ArrowRight size={14} className="arrow" />
            </a>
          </div>

          <div className="lg:col-span-8">
            <div className="border-t border-[var(--c-line-strong)]">
              {CATEGORIES.map((category) => {
                const isOpen = expanded === category.id;
                return (
                  <div key={category.id} className="border-b border-[var(--c-line)]">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? "" : category.id)}
                      aria-expanded={isOpen}
                      aria-controls={`category-${category.id}`}
                      className="group grid w-full grid-cols-[30px_1fr_auto] items-start gap-3 py-4 text-left transition-colors hover:bg-[var(--c-surface)]/60 sm:grid-cols-[44px_1fr_auto] sm:gap-4 sm:py-5"
                    >
                      <span className="mono pt-1.5 text-[11px] text-[var(--c-ink-3)] transition-colors group-hover:text-[var(--c-signal)]">
                        {category.index}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="text-[clamp(1.35rem,2.4vw,1.8rem)] font-medium leading-tight tracking-[-0.025em]">
                            {category.label}
                          </span>
                          <span className="label-sm text-[var(--c-ink-3)]">{category.note}</span>
                        </span>
                        <span className="mt-1 block max-w-[58ch] text-[12.5px] leading-[1.55] text-[var(--c-ink-2)] sm:hidden">
                          {category.description}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 pt-1 sm:gap-5">
                        <span className="mono hidden text-[11px] text-[var(--c-ink-3)] sm:inline">
                          {String(category.checks.length).padStart(2, "0")}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        id={`category-${category.id}`}
                        className="grid gap-5 pb-6 pl-[42px] pr-1 sm:grid-cols-[1.2fr_1fr] sm:pl-[60px]"
                      >
                        <div>
                          <p className="mb-3 hidden max-w-[54ch] text-[13px] leading-[1.6] text-[var(--c-ink-2)] sm:block">
                            {category.description}
                          </p>
                          <ul className="grid gap-x-5 gap-y-0 sm:grid-cols-2">
                            {category.checks.map((check) => (
                              <li
                                key={check}
                                className="flex items-center gap-2 border-t border-[var(--c-line-soft)] py-2 text-[12px]"
                              >
                                <Check size={11} className="shrink-0 text-[var(--c-good)]" />
                                {check}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="border-t border-[var(--c-line-soft)] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                          <p className="label-sm text-[var(--c-ink-3)]">Measured from</p>
                          <p className="mt-2 text-[12px] leading-[1.6] text-[var(--c-ink-2)]">
                            {category.id === "contrast"
                              ? "Each visible text node, against its nearest opaque painted surface."
                              : category.id === "typography"
                                ? "Computed font families, sizes, line heights and the rendered measure."
                                : category.id === "visual"
                                  ? "Document geometry, rendered image boxes, painted colours and shape values."
                                  : category.id === "accessibility"
                                    ? "The rendered DOM, accessible names, relationships and focus order."
                                    : category.id === "ux"
                                      ? "Interactive geometry, page structure and the cues users depend on."
                                      : "Document head, social declarations and the primary heading."}
                          </p>
                          <p className="mono mt-3 inline-flex items-center gap-1.5 border border-[var(--c-line)] px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--c-ink-2)]">
                            <span className="h-1.5 w-1.5 bg-[var(--c-good)]" aria-hidden="true" />
                            In the current build
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex flex-col gap-2 border-t border-[var(--c-line)] pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2.5">
                <Layers size={15} className="mt-0.5 shrink-0 text-[var(--c-ink-3)]" />
                <div>
                  <p className="label text-[var(--c-ink-2)]">On the bench — not yet automated</p>
                  <p className="mt-1 max-w-[62ch] text-[12px] leading-[1.55] text-[var(--c-ink-2)]">
                    Keyboard-traversal simulation, cross-browser render comparison and motion
                    budgets. These are excluded from every score until they are real.
                  </p>
                </div>
              </div>
              <span className="label-sm shrink-0 text-[var(--c-ink-3)]">Planned / not scoring</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————————————————————————————
   Method
———————————————————————————————————————————————— */
const METHOD = [
  {
    title: "Enter an address",
    kicker: "The request",
    description:
      "Bring a live URL, a pasted document or one of the built-in specimens. No account, no queue, no form asking for a company size.",
    evidence: ["URL · markup · specimen", "Browser-side session", "Scripts disabled before render"],
    output: "A local session with the page.",
  },
  {
    title: "Render the page",
    kicker: "The capture",
    description:
      "The document is rendered at 1280 px in a sandbox. Fonts and images are given a bounded chance to settle, because a layout that has not arrived cannot be inspected.",
    evidence: ["1280 px canvas", "Script-free sandbox", "Computed styles, not source guesses"],
    output: "A stable, inspectable specimen.",
  },
  {
    title: "Measure the evidence",
    kicker: "The inspection",
    description: `Six categories, ${TOTAL_CHECKS} implemented checks. We read the DOM, sample colour pairs, count the real type system and measure the geometry of every visible control.`,
    evidence: ["Accessible names", "Contrast ratios", "Type + layout metrics"],
    output: "Elements, colours and text samples examined.",
  },
  {
    title: "Read the findings",
    kicker: "The ledger",
    description:
      "Each issue carries a severity, the affected selector, a code excerpt, the supporting evidence and a specific correction. Select a marker in the page to locate it.",
    evidence: ["Severity + occurrence", "Selector + excerpt", "Recommended correction"],
    output: "A findings ledger you can act on.",
  },
  {
    title: "Export & correct",
    kicker: "The hand-off",
    description:
      "Download a self-contained HTML report or the raw data, take the selector to the codebase, fix the cause, then run the inspection again.",
    evidence: ["HTML report", "JSON data", "No report stored on a server"],
    output: "Evidence that travels with the work.",
  },
];

function Method() {
  const [active, setActive] = useState(0);
  const step = METHOD[active];

  return (
    <section id="method" className="bg-[var(--c-accent)] text-[#fbf9f0]">
      <div className="wrap py-14 md:py-20">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/25 pb-3">
          <p className="label text-white/90">02 / Method &amp; process</p>
          <p className="label-sm text-white/90">Five movements · one inspection</p>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <h2 className="reveal display text-[clamp(2.3rem,4.6vw,4.3rem)] text-[#fbf9f0]">
              From address to argument,
              <br />
              <span className="serif font-normal text-[#d8f06a]">in five movements.</span>
            </h2>
            <p className="mt-5 max-w-[36ch] text-[14px] leading-[1.6] text-white/90">
              The instrument does not have an opinion about your website. It observes,
              records and gives you somewhere precise to begin.
            </p>

            <div className="mt-7 border-t border-white/25">
              {METHOD.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-pressed={active === index}
                  aria-controls="method-detail"
                  className={`group flex w-full items-center gap-4 border-b border-white/20 py-3 text-left transition-colors ${
                    active === index ? "text-[#fbf9f0]" : "text-blue-100 hover:text-white"
                  }`}
                >
                  <span
                    className={`mono flex h-7 w-7 shrink-0 items-center justify-center border text-[11px] transition-colors ${
                      active === index
                        ? "border-[#d8f06a] bg-[#d8f06a] text-[#16170f]"
                        : "border-white/30"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[17px] font-medium tracking-[-0.02em]">{item.title}</span>
                  <ArrowRight
                    size={14}
                    className={`shrink-0 transition-opacity ${active === index ? "opacity-100" : "opacity-0"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative h-full border border-white/30 bg-[#1f2fd4]/0 p-5 md:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-white/25 pb-4">
                <div>
                  <p className="label text-white/90">{step.kicker}</p>
                  <p className="mt-1 text-[13px] text-white/90">Step {String(active + 1).padStart(2, "0")} of 05</p>
                </div>
                <span className="display text-[clamp(3.3rem,6vw,5.2rem)] leading-[0.75] tabular-nums text-[#d8f06a]">
                  {String(active + 1).padStart(2, "0")}
                </span>
              </div>

              <div id="method-detail" aria-live="polite">
                <h3 className="mt-6 max-w-[18ch] text-[clamp(1.8rem,3vw,2.7rem)] font-medium leading-[1.02] tracking-[-0.025em]">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-[52ch] text-[14px] leading-[1.65] text-white/90">
                  {step.description}
                </p>
                <ul className="mt-6 grid gap-0 border-t border-white/25">
                  {step.evidence.map((item) => (
                    <li
                      key={item}
                      className="mono flex items-center justify-between gap-3 border-b border-white/20 py-2.5 text-[11px] uppercase tracking-[0.08em] text-white/90"
                    >
                      {item}
                      <Check size={12} className="text-[#d8f06a]" />
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="mono text-[11px] uppercase tracking-[0.08em] text-white/85">What you keep</p>
                  <p className="text-[13px] font-medium text-[#fbf9f0]">{step.output}</p>
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/25 pt-4">
                <button
                  type="button"
                  onClick={() => setActive((value) => Math.max(0, value - 1))}
                  disabled={active === 0}
                  className="btn btn-sm border-white/40 text-white hover:border-white hover:bg-white hover:text-[var(--c-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() => setActive((value) => Math.min(METHOD.length - 1, value + 1))}
                  disabled={active === METHOD.length - 1}
                  className="btn btn-sm border-[#d8f06a] bg-[#d8f06a] text-[#16170f] hover:border-white hover:bg-white hover:text-[#16170f] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next movement →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————————————————————————————
   A finding, dissected
———————————————————————————————————————————————— */
function FindingAnatomy({ report }: { report: AuditReport | null }) {
  const candidates = useMemo(() => {
    if (!report) return [] as Finding[];
    const preferredOrder = ["contrast", "accessibility", "typography", "visual", "ux", "metadata"];
    const picked: Finding[] = [];
    for (const category of preferredOrder) {
      const match = report.findings.find((finding) => finding.category === category);
      if (match) picked.push(match);
    }
    return picked.slice(0, 3);
  }, [report]);

  const [active, setActive] = useState(0);
  const selected = candidates[active] ?? candidates[0] ?? null;

  return (
    <section id="findings" className="relative border-t border-[var(--c-line)] py-14 md:py-20">
      <div className="wrap">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--c-line)] pb-3">
          <p className="label text-[var(--c-ink-3)]">03 / Anatomy of a finding</p>
          <p className="label-sm text-[var(--c-ink-3)]">A concern is not a finding. Evidence is.</p>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5 lg:pr-6">
            <h2 className="reveal display text-[clamp(2.3rem,4.5vw,4.2rem)]">
              The argument
              <br />
              <span className="serif font-normal text-[var(--c-signal)]">in the detail.</span>
            </h2>
            <p className="reveal body-copy mt-5 max-w-[36ch] text-[14px]">
              “The page feels off” is a starting point, not a deliverable. A finding names
              the issue, its severity, the element, the measured evidence and the
              correction. Every claim is traceable to the rendered page.
            </p>

            <div className="mt-7 border-t border-[var(--c-line)]">
              {[
                ["Issue", "What is wrong, stated plainly."],
                ["Severity", "How much it affects the experience."],
                ["Location", "The selector where it occurs."],
                ["Evidence", "The values and samples behind it."],
                ["Correction", "A specific, implementable fix."],
              ].map(([term, description], index) => (
                <div key={term} className="grid grid-cols-[22px_1fr] gap-3 border-b border-[var(--c-line)] py-2.5">
                  <span className="mono pt-0.5 text-[11px] text-[var(--c-ink-3)]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-[13px] font-medium">{term}</p>
                    <p className="text-[12.5px] leading-snug text-[var(--c-ink-2)]">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {candidates.length > 0 && (
              <div className="mt-5" role="tablist" aria-label="Example findings">
                <p className="label-sm mb-2 text-[var(--c-ink-3)]">Read another specimen finding</p>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((finding, index) => (
                    <button
                      key={finding.id}
                      type="button"
                      role="tab"
                      aria-selected={active === index}
                      aria-controls="finding-panel"
                      onClick={() => setActive(index)}
                      className={`chip transition-colors ${
                        active === index
                          ? "border-[var(--c-ink)] bg-[var(--c-ink)] text-[var(--c-bg)]"
                          : "hover:border-[var(--c-ink)]"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")} / {finding.id} {finding.category}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            <div
              id="finding-panel"
              role="tabpanel"
              className="reveal border border-[var(--c-line-strong)] bg-[var(--c-surface)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--c-line)] px-4 py-2.5">
                <span className="mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-ink-2)]">
                  Evidence extract / {selected?.category ?? "specimen"}
                </span>
                <span className="mono text-[12px] text-[var(--c-ink-3)]">
                  {selected ? `${selected.id} · ${selected.check}` : "Reading the ledger"}
                </span>
              </div>

              {selected ? (
                <>
                  <div className="px-4 pb-5 pt-5 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <SeverityTag severity={selected.severity} />
                      <span className="mono text-[11px] text-[var(--c-ink-3)]">
                        {selected.occurrences} occurrence{selected.occurrences === 1 ? "" : "s"}
                      </span>
                    </div>
                    <h3 className="mt-3 max-w-[26ch] text-[clamp(1.5rem,2.6vw,2.1rem)] font-medium leading-[1.08] tracking-[-0.025em]">
                      {selected.title}
                    </h3>
                    <p className="mt-3 max-w-[62ch] text-[13px] leading-[1.6] text-[var(--c-ink-2)]">
                      {selected.summary}
                    </p>

                    <div className="mt-5 grid gap-0 border border-[var(--c-line)] sm:grid-cols-2">
                      <div className="border-b border-[var(--c-line)] p-3 sm:border-b-0 sm:border-r">
                        <p className="label-sm text-[var(--c-ink-3)]">Affected element</p>
                        <code className="mono mt-1.5 block break-all text-[11px] leading-relaxed text-[var(--c-ink)]">
                          {shortSelector(selected.selector)}
                        </code>
                      </div>
                      <div className="p-3">
                        <p className="label-sm text-[var(--c-ink-3)]">Evidence</p>
                        <dl className="mt-1.5 space-y-1">
                          {selected.evidence.slice(0, 2).map((item) => (
                            <div key={item.label} className="flex gap-2 text-[11px]">
                              <dt className="mono shrink-0 text-[var(--c-ink-3)]">{item.label}:</dt>
                              <dd className="mono truncate text-[var(--c-ink-2)]">{item.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>

                    {selected.snippet && (
                      <blockquote className="panel-dark mt-4 border-t border-[var(--panel-line)] bg-[var(--panel-bg)] p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="label-sm text-[var(--panel-ink-3)]">Source excerpt</span>
                          <Code size={12} className="text-[var(--panel-ink-3)]" />
                        </div>
                        <code className="mono block max-h-[88px] overflow-hidden break-all text-[11px] leading-[1.7] text-[var(--panel-ink-2)]">
                          {selected.snippet}
                        </code>
                      </blockquote>
                    )}

                    <div className="mt-4 border-l-2 border-[var(--c-good)] pl-3.5">
                      <p className="label-sm text-[var(--c-ink-3)]">Recommended correction</p>
                      <p className="mt-1 max-w-[62ch] text-[12.5px] leading-[1.6] text-[var(--c-ink)]">
                        {selected.recommendation}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--c-line)] px-4 py-3 sm:px-6">
                    <p className="mono text-[12px] leading-relaxed text-[var(--c-ink-3)]">
                      Generated by the engine from this specimen's markup and computed styles.
                    </p>
                    <a
                      href="#instrument"
                      className="link mono text-[11px] uppercase tracking-[0.08em] no-underline hover:underline"
                    >
                      Inspect this specimen <ArrowUpRight size={11} />
                    </a>
                  </div>
                </>
              ) : (
                <div className="space-y-3 p-5 sm:p-6" aria-busy="true">
                  <div className="h-2 w-24 bg-[var(--c-line)]" />
                  <div className="h-7 w-4/5 bg-[var(--c-line-soft)]" />
                  <div className="h-7 w-3/5 bg-[var(--c-line-soft)]" />
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="h-24 border border-[var(--c-line)]" />
                    <div className="h-24 border border-[var(--c-line)]" />
                  </div>
                  <p className="mono pt-2 text-[12px] text-[var(--c-ink-3)]">
                    Measuring the specimen to build the evidence extract…
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Target, title: "Evidence", copy: "Measured values, not impressions." },
                { icon: Search, title: "Location", copy: "A selector you can navigate to." },
                { icon: Refresh, title: "Re-check", copy: "Re-run after the correction." },
              ].map((item) => (
                <div key={item.title} className="border-t border-[var(--c-line)] pt-2.5">
                  <div className="flex items-center gap-2">
                    <item.icon size={13} className="text-[var(--c-ink-3)]" />
                    <p className="label-sm text-[var(--c-ink-2)]">{item.title}</p>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-[var(--c-ink-3)]">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————————————————————————————
   Access
———————————————————————————————————————————————— */
function AccessSection() {
  const included = [
    "The complete audit across all six categories",
    `All ${TOTAL_CHECKS} implemented checks`,
    "The full findings ledger with evidence",
    "Element inspection and source excerpts",
    "A self-contained HTML report",
    "Raw JSON for your own tooling",
  ];

  return (
    <section
      id="access"
      className="bg-[#d8f06a] text-[#16170f]"
    >
      <div className="wrap py-14 md:py-20">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#16170f]/25 pb-3">
          <p className="label">04 / Free &amp; open access</p>
          <p className="label-sm flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-[#16170f]" aria-hidden="true" />
            No subscription. No upgrade path.
          </p>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <h2 className="reveal display text-[clamp(2.6rem,5.6vw,5.4rem)] text-[#16170f]">
              The whole ledger.
              <br />
              <span className="serif font-normal">Not a preview.</span>
            </h2>
            <p className="reveal mt-5 max-w-[42ch] text-[15px] leading-[1.6] text-[#16170f]/80">
              Core auditing, issue inspection, scoring and report export are available
              without payment. The product is the evidence — withholding it behind a plan
              would make the instrument less honest.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#top"
                className="btn border-[#16170f] bg-[#16170f] text-[#f5f2e7] hover:border-[#2438e8] hover:bg-[#2438e8] hover:text-[#f5f2e7]"
              >
                Open the inspector
                <ArrowUpRight size={13} />
              </a>
              <a href="#method" className="link mono text-[12px] uppercase tracking-[0.08em]">
                Read the method
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="border border-[#16170f] bg-[#e4f58f]">
              <div className="flex items-center justify-between gap-3 border-b border-[#16170f] px-4 py-2.5">
                <span className="label-sm">Included, without an account</span>
                <span className="mono text-[12px]">£ / 00</span>
              </div>
              <ul>
                {included.map((item) => (
                  <li
                    key={item}
                    className="flex items-center justify-between gap-3 border-b border-[#16170f]/20 px-4 py-2.5 text-[12.5px] last:border-b-0"
                  >
                    <span className="flex items-center gap-2.5">
                      <Check size={12} />
                      {item}
                    </span>
                    <span className="mono shrink-0 text-[11px] uppercase tracking-[0.08em] opacity-80">
                      Included
                    </span>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 border-t border-[#16170f]">
                <div className="border-r border-[#16170f] px-4 py-3">
                  <p className="mono text-[11px] uppercase tracking-[0.08em] opacity-80">Account required</p>
                  <p className="mt-1 text-[16px] font-medium">None</p>
                </div>
                <div className="px-4 py-3">
                  <p className="mono text-[11px] uppercase tracking-[0.08em] opacity-80">Usage limits</p>
                  <p className="mt-1 text-[16px] font-medium">None in the app</p>
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-[56ch] text-[12.5px] leading-[1.55] text-[#16170f]/75">
              “Free” means no charge for the auditor: it runs in your browser, and reports
              are downloaded rather than hosted by us. It does not imply a promise about
              every hosting or third-party service involved in reaching a page. Where a
              site prevents browser access, pasted markup gives you the same local engine.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 border-t border-[#16170f]/25 pt-4 sm:grid-cols-3">
          {[
            [Download, "Export what you find", "One self-contained HTML report, or the JSON."],
            [Layers, "Built from real checks", `Every one of the ${TOTAL_CHECKS} is in this build.`],
            [Code, "No black box", "Selectors, code excerpts and measured values are shown."],
          ].map(([Icon, title, copy]) => {
            const Component = Icon as typeof Download;
            return (
              <div key={title as string} className="flex items-start gap-2.5">
                <Component size={15} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12.5px] font-medium">{title as string}</p>
                  <p className="text-[12px] leading-snug opacity-75">{copy as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————————————————————————————
   Closing action
———————————————————————————————————————————————— */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[var(--c-ink)] text-[var(--c-bg)]">
      <div className="wrap py-16 md:py-24">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/25 pb-3">
          <p className="label opacity-80">05 / Begin an inspection</p>
          <p className="mono text-[12px] tracking-[0.04em] opacity-80">
            No account required · No queue · Immediate access
          </p>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8">
            <h2 className="reveal display text-[clamp(2.7rem,7.4vw,7rem)]">
              Put your site
              <br />
              under <span className="serif font-normal text-[var(--c-accent)]">inspection.</span>
            </h2>
            <p className="mt-5 max-w-[44ch] text-[13.5px] leading-[1.6] opacity-70">
              Bring an address and get a ledger of specifics: what failed, where it lives,
              what was measured and what to change. The rest is craft.
            </p>
          </div>

          <div className="relative hidden min-h-[220px] lg:col-span-4 lg:block">
            <svg
              viewBox="0 0 280 280"
              className="ml-auto h-full max-h-[280px] w-full max-w-[280px]"
              fill="none"
              aria-hidden="true"
            >
              <rect x="0.5" y="0.5" width="279" height="279" stroke="currentColor" strokeOpacity="0.25" />
              <rect x="70.5" y="70.5" width="139" height="139" stroke="currentColor" strokeOpacity="0.4" />
              <circle cx="140" cy="140" r="70" stroke="currentColor" strokeOpacity="0.6" />
              <path d="M140 44v192M44 140h192" stroke="currentColor" strokeOpacity="0.3" />
              <path d="M140 140 210 70" stroke="var(--c-accent-2)" strokeWidth="1.5" />
              <circle cx="140" cy="140" r="5" fill="var(--c-signal-fill)" />
              <path d="M196 56h28v28M56 196v28h28" stroke="var(--c-selection)" strokeWidth="1.5" />
              <text x="10" y="20" fill="currentColor" fillOpacity="0.55" fontSize="11" fontFamily="monospace" letterSpacing="0.5">
                SUBJECT / REF. 001
              </text>
              <text x="10" y="268" fill="currentColor" fillOpacity="0.55" fontSize="11" fontFamily="monospace" letterSpacing="0.5">
                FINDINGS / 06 DOMAINS
              </text>
              <text x="196" y="228" fill="currentColor" fillOpacity="0.55" fontSize="11" fontFamily="monospace" letterSpacing="0.5">
                59.91 N
              </text>
            </svg>
          </div>
        </div>

        <div className="mt-10 grid gap-6 border-t border-current/25 pt-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SiteEntryForm
              tone="ink"
              label="Your website address"
              cta="Inspect site"
              note="The inspection begins with headless Chromium. Results are preserved in your local workspace."
            />
          </div>
          <div className="flex flex-col justify-between gap-4 lg:col-span-4 lg:col-start-9">
            <div>
              <a
                href="#instrument"
                className="group flex items-center justify-between gap-3 border-b border-current/30 py-2.5 text-[13px] no-underline"
              >
                Inspect the built-in specimen
                <ArrowUpRight size={14} className="arrow shrink-0" />
              </a>
              <a
                href="#method"
                className="group flex items-center justify-between gap-3 border-b border-current/30 py-2.5 text-[13px] no-underline"
              >
                Read how measurement works
                <ArrowRight size={14} className="arrow shrink-0" />
              </a>
            </div>
            <p className="mono text-[12px] leading-[1.7] tracking-[0.04em] opacity-80">
              Accessibility · Experience · Visual
              <br />
              Type · Colour · Metadata
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————————————————————————————
   Main Page Entry Point
———————————————————————————————————————————————— */
export default function LandingPage() {
  const { report } = useSpecimenReport("atelier");
  useReveal();

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-ink)]">
      <a href="#top" className="hide-until-focus">Skip to the inspection</a>
      <TopStrip />
      <SiteNav variant="landing" />
      <main id="main">
        <Hero report={report} />
        <InstrumentSection report={report} />
        <CategoryIndex />
        <Method />
        <FindingAnatomy report={report} />
        <AccessSection />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
