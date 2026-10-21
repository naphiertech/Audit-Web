'use client';

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "@/components/Icons";

export function SiteEntryForm({
  tone = "default",
  label = "Inspect a website",
  cta = "Run inspection",
  note,
  className = "",
}: {
  tone?: "default" | "ink";
  label?: string;
  cta?: string;
  note?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusStep, setStatusStep] = useState("");
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const noteId = `${fieldId}-note`;
  const onInk = tone === "ink";

  function cleanUrl(input: string): string {
    let raw = input.trim();
    if (!raw) throw new Error("Enter a website address to inspect.");
    if (!/^https?:\/\//i.test(raw)) {
      raw = `https://${raw}`;
    }
    const parsed = new URL(raw);
    if (!parsed.hostname.includes(".")) {
      throw new Error("Enter a valid website address with a domain (e.g. your-website.com).");
    }
    return parsed.toString();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isLoading) return;

    let targetUrl: string;
    try {
      targetUrl = cleanUrl(value);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enter a valid website address.");
      return;
    }

    setIsLoading(true);
    setStatusStep("Launching headless Chromium engine...");

    const timer1 = setTimeout(() => setStatusStep("Resolving DNS & enforcing security sandbox..."), 1600);
    const timer2 = setTimeout(() => setStatusStep("Executing WCAG 2.1 AA & UX inspection rules..."), 4800);
    const timer3 = setTimeout(() => setStatusStep("Analyzing DOM geometry, contrast & typography..."), 8500);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          device: "desktop",
          forceRerun: true,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to complete audit inspection.");
      }

      setStatusStep("Assembling findings ledger...");
      router.push(`/audit/${data.result.id}`);
    } catch (err: unknown) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      const msg = err instanceof Error ? err.message : "Audit inspection failed. Please try again.";
      setError(msg);
      setIsLoading(false);
      setStatusStep("");
    }
  }

  return (
    <form onSubmit={submit} className={className} noValidate>
      <label
        htmlFor={fieldId}
        className={`label mb-2.5 block ${onInk ? "text-[var(--c-bg)]" : "text-[var(--c-ink-2)]"}`}
      >
        {label}
      </label>
      <div
        className={`flex flex-col gap-0 border sm:flex-row sm:items-center ${
          onInk
            ? "border-[var(--c-bg)] bg-transparent"
            : "border-[var(--c-line-strong)] bg-[var(--c-surface)] focus-within:border-[var(--c-accent)] focus-within:shadow-[0_0_0_1px_var(--c-accent)]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`mono hidden select-none items-center gap-1 border-r px-3.5 py-4 text-[12px] sm:flex ${
            onInk
              ? "border-[var(--c-bg)] text-[var(--c-bg)]"
              : "border-[var(--c-line)] text-[var(--c-ink-3)]"
          }`}
        >
          <span className={onInk ? "text-[var(--c-good)]" : "text-[var(--c-good)]"}>●</span>
          https://
        </span>
        <input
          id={fieldId}
          name="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          required
          disabled={isLoading}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError("");
          }}
          placeholder="your-website.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${error ? `${errorId} ` : ""}${note ? noteId : ""}`.trim() || undefined}
          className={`mono min-w-0 flex-1 bg-transparent px-3.5 py-4 text-[14px] outline-none placeholder:text-[var(--c-ink-3)] disabled:opacity-50 ${
            onInk
              ? "text-[var(--c-bg)] placeholder:text-[color:var(--c-bg)]/55"
              : "text-[var(--c-ink)]"
          }`}
        />
        <button
          type="submit"
          disabled={isLoading}
          className={`mono group m-1.5 inline-flex min-h-[44px] items-center justify-center gap-2 px-4 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors disabled:opacity-50 ${
            onInk
              ? "bg-[var(--c-bg)] text-[var(--c-ink)] hover:bg-[var(--c-good)] hover:text-[var(--c-ink)]"
              : "bg-[var(--c-accent)] text-[var(--c-on-accent)] hover:bg-[var(--c-accent-2)]"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-ping bg-current" />
              Auditing…
            </span>
          ) : (
            <>
              {cta}
              <ArrowUpRight size={13} className="arrow" />
            </>
          )}
        </button>
      </div>

      {isLoading && statusStep && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse bg-[var(--c-signal)]" />
          <p className="mono text-[11px] tracking-[0.04em] text-[var(--c-ink-2)]">
            {statusStep}
          </p>
        </div>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mono mt-2 text-[11px] text-[var(--c-signal)]"
        >
          {error}
        </p>
      )}

      {note && !error && !isLoading && (
        <p
          id={noteId}
          className={`mono mt-2 max-w-[65ch] text-[12px] leading-relaxed ${
            onInk ? "text-[color:var(--c-bg)]/75" : "text-[var(--c-ink-3)]"
          }`}
        >
          {note}
        </p>
      )}
    </form>
  );
}
