import {
  CATEGORY_WEIGHTS,
  TOTAL_CHECKS,
  gradeFor,
  verdictFor,
  type AuditReport,
  type AuditStats,
  type CategoryId,
  type CategoryResult,
  type Evidence,
  type Finding,
  type Source,
  type Severity,
} from "./types";

/* ————————————————————————————————————————————————
   Colour + contrast utilities (WCAG 2.x relative luminance)
———————————————————————————————————————————————— */
type RGB = { r: number; g: number; b: number; a: number };

function parseColor(input: string): RGB | null {
  if (!input) return null;
  const match = input.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

function composite(fg: RGB, bg: RGB): RGB {
  const a = Math.max(0, Math.min(1, fg.a));
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function luminance(c: RGB) {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

export function contrastRatio(a: RGB, b: RGB) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function rgbCss(c: RGB) {
  return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
}

function resolveBackground(el: Element, win: Window): RGB | null {
  const layers: RGB[] = [];
  let node: Element | null = el;
  let guard = 0;
  while (node && node.nodeType === 1 && guard < 24) {
    guard += 1;
    const cs = win.getComputedStyle(node);
    if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
    const color = parseColor(cs.backgroundColor);
    if (color && color.a > 0.02) {
      layers.push(color);
      if (color.a >= 0.98) break;
    }
    node = node.parentElement;
  }
  let base: RGB = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i -= 1) base = composite(layers[i], base);
  return base;
}

/* ————————————————————————————————————————————————
   Rendering + measurement
———————————————————————————————————————————————— */
function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function sanitise(html: string, base?: string) {
  let next = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel=["']?preload["']?[^>]*as=["']?script["']?[^>]*>/gi, "");
  const baseTag = base ? `<base href="${base.replace(/"/g, "&quot;")}">` : "";
  if (/<head[\s>]/i.test(next)) {
    next = next.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  } else {
    next = `<!doctype html><html><head>${baseTag}</head><body>${next}</body></html>`;
  }
  return next;
}

interface Measurement {
  doc: Document;
  win: Window;
  bodyHeight: number;
  viewportWidth: number;
}

async function measure(html: string): Promise<Measurement | null> {
  if (typeof document === "undefined") return null;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", "Sandboxed audit render");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.style.cssText =
    "position:fixed;left:-20000px;top:0;width:1280px;height:1000px;border:0;visibility:hidden;";
  const loaded = new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    frame.addEventListener("load", done, { once: true });
    window.setTimeout(done, 4500);
  });
  frame.srcdoc = sanitise(html);
  document.body.appendChild(frame);
  await loaded;

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    return null;
  }

  try {
    await Promise.race([win.document.fonts.ready.catch(() => undefined), sleep(1400)]);
  } catch {
    /* fonts are optional */
  }
  try {
    const images = Array.from(doc.images).slice(0, 12);
    await Promise.race([
      Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      ),
      sleep(1600),
    ]);
  } catch {
    /* images are optional */
  }
  await sleep(120);

  const bodyHeight = Math.max(
    doc.body?.scrollHeight ?? 0,
    doc.documentElement?.scrollHeight ?? 0,
    900,
  );
  return { doc, win, bodyHeight, viewportWidth: 1280 };
}

function selectorFor(el: Element): string {
  if (el.id && el.ownerDocument.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
    return `#${el.id}`;
  }
  const parts: string[] = [];
  let node: Element | null = el;
  for (let depth = 0; node && depth < 4; depth += 1) {
    let part = node.tagName.toLowerCase();
    const parent: Element | null = node.parentElement;
    if (parent) {
      const tagName = node.tagName;
      const sameTag = Array.from(parent.children).filter((c: Element) => c.tagName === tagName);
      if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    if (part.includes("#")) break;
    node = parent;
  }
  return parts.join(" > ");
}

function snippetFor(el: Element): string {
  const raw = el.outerHTML.replace(/\s+/g, " ").trim();
  return raw.length > 210 ? `${raw.slice(0, 210)}…` : raw;
}

function accessibleName(el: Element): string {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  const labelled = el.getAttribute("aria-label")?.trim() ?? "";
  const alt = el.querySelector("img[alt]")?.getAttribute("alt")?.trim() ?? "";
  const title = el.getAttribute("title")?.trim() ?? "";
  return [text, labelled, alt, title].filter(Boolean).join(" ");
}

interface DraftFinding {
  check: string;
  category: CategoryId;
  severity: Exclude<Severity, "pass">;
  title: string;
  summary: string;
  recommendation: string;
  occurrences: number;
  evidence: Evidence[];
  el?: Element | null;
}

const PENALTY: Record<Exclude<Severity, "pass">, number> = {
  critical: 25,
  serious: 15,
  moderate: 8,
  minor: 3,
};

const PREFIX: Record<CategoryId, string> = {
  accessibility: "A11Y",
  ux: "UX",
  visual: "VIS",
  typography: "TYP",
  contrast: "CON",
  metadata: "META",
};

function penaltyFor(finding: DraftFinding) {
  const scale = 1 + Math.min(0.9, Math.log10(Math.max(1, finding.occurrences)) * 0.65);
  return PENALTY[finding.severity] * scale;
}

export interface AuditInput {
  html: string;
  url: string;
  displayUrl?: string;
  source: Source;
  specimenId?: string;
  notes?: string[];
}

export async function runAudit(input: AuditInput): Promise<AuditReport> {
  const prepared = sanitise(input.html, input.source === "url" ? input.url : undefined);
  const measurement = await measure(prepared);
  const doc =
    measurement?.doc ?? new DOMParser().parseFromString(prepared, "text/html");
  const win = measurement?.win ?? null;
  const notes: string[] = [...(input.notes ?? [])];
  const drafts: DraftFinding[] = [];

  const add = (draft: DraftFinding) => {
    if (draft.occurrences > 0) drafts.push(draft);
  };
  const styleOf = (el: Element) => (win ? win.getComputedStyle(el) : null);
  const visible = (el: Element) => {
    if (!measurement) return true;
    const cs = styleOf(el);
    if (!cs) return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (Number(cs.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };

  const all = Array.from(doc.body?.querySelectorAll("*") ?? []).slice(0, 1800);
  const textElements = all.filter((el) => {
    if (!/^(P|LI|A|BUTTON|SPAN|H1|H2|H3|H4|H5|H6|LABEL|TD|TH|BLOCKQUOTE|FIGCAPTION|EM|STRONG|SMALL|DIV)$/.test(el.tagName))
      return false;
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.nodeValue ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return ownText.length > 0;
  });

  /* ——— Accessibility ————————————————————————— */
  const unlabelledImages = Array.from(doc.images).filter(
    (img) => !img.hasAttribute("alt") && img.getAttribute("role") !== "presentation",
  );
  add({
    check: "Image alternatives",
    category: "accessibility",
    severity: unlabelledImages.length > 2 ? "critical" : "serious",
    title: "Images are missing text alternatives",
    summary: `${unlabelledImages.length} image${unlabelledImages.length === 1 ? "" : "s"} expose no alt attribute, so their content disappears for screen-reader users and when the asset fails to load.`,
    recommendation:
      "Add a concise alt attribute describing the image's purpose, or alt=\"\" when the image is purely decorative.",
    occurrences: unlabelledImages.length,
    evidence: [
      { label: "Affected images", value: String(unlabelledImages.length) },
      { label: "Example", value: unlabelledImages[0] ? snippetFor(unlabelledImages[0]).slice(0, 120) : "—" },
    ],
    el: unlabelledImages[0],
  });

  const controls = Array.from(
    doc.querySelectorAll("a, button, [role='button'], input[type='submit'], input[type='button']"),
  ).filter(visible);
  const namelessControls = controls.filter((el) => accessibleName(el).length === 0);
  add({
    check: "Accessible control names",
    category: "accessibility",
    severity: "serious",
    title: "Interactive controls have no accessible name",
    summary: `${namelessControls.length} interactive element${namelessControls.length === 1 ? " has" : "s have"} no readable name. Sighted users may infer meaning from an icon; assistive technology cannot.`,
    recommendation:
      "Give each control a visible label or an aria-label that describes its action, not its appearance.",
    occurrences: namelessControls.length,
    evidence: [
      { label: "Controls checked", value: String(controls.length) },
      { label: "Unnamed", value: String(namelessControls.length) },
      { label: "Example", value: namelessControls[0] ? snippetFor(namelessControls[0]).slice(0, 120) : "—" },
    ],
    el: namelessControls[0],
  });

  const fields = Array.from(doc.querySelectorAll("input, select, textarea")).filter((el) => {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    return !["hidden", "submit", "button", "reset", "image", "range", "color"].includes(type);
  });
  const unlabelledFields = fields.filter((el) => {
    const id = el.getAttribute("id");
    const hasFor = id ? doc.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const wrapped = el.closest("label");
    return !hasFor && !wrapped && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.getAttribute("title");
  });
  add({
    check: "Programmatic form labels",
    category: "accessibility",
    severity: "critical",
    title: "Form fields are labelled by placeholder only",
    summary: `${unlabelledFields.length} form control${unlabelledFields.length === 1 ? " lacks" : "s lack"} a programmatic label. A placeholder is not a label: it vanishes on input and is inconsistently announced.`,
    recommendation:
      "Attach a persistent <label for> to every field. Keep the placeholder for format guidance only.",
    occurrences: unlabelledFields.length,
    evidence: [
      { label: "Fields checked", value: String(fields.length) },
      { label: "Unlabelled", value: String(unlabelledFields.length) },
      { label: "Example", value: unlabelledFields[0] ? snippetFor(unlabelledFields[0]).slice(0, 120) : "—" },
    ],
    el: unlabelledFields[0],
  });

  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  const headingSkips: string[] = [];
  let previousLevel = 0;
  for (const heading of headings) {
    const level = Number(heading.tagName[1]);
    if (previousLevel && level > previousLevel + 1) {
      headingSkips.push(`${heading.tagName} after H${previousLevel}`);
    }
    previousLevel = level;
  }
  add({
    check: "Heading order",
    category: "accessibility",
    severity: "moderate",
    title: "The heading outline skips levels",
    summary: `${headingSkips.length} jump${headingSkips.length === 1 ? "" : "s"} in the document outline make the page's structure harder to map with a screen reader.`,
    recommendation:
      "Choose heading levels by structure, not by size. Move from H2 to H3 rather than jumping to H4.",
    occurrences: headingSkips.length,
    evidence: [
      { label: "Headings found", value: String(headings.length) },
      { label: "Sequence", value: headings.map((h) => h.tagName).join(" → ") || "None" },
      { label: "Jumps", value: headingSkips.join(", ") || "—" },
    ],
    el: headings.find((h) => headingSkips.some((s) => s.startsWith(h.tagName))) ?? null,
  });

  const htmlEl = doc.documentElement;
  add({
    check: "Page language",
    category: "accessibility",
    severity: "serious",
    title: "The page does not declare its language",
    summary:
      "Without a lang attribute, synthesised speech may use the wrong pronunciation rules, and translation tools have to guess.",
    recommendation: 'Set the language on the root element, for example <html lang="en">.',
    occurrences: htmlEl.hasAttribute("lang") && htmlEl.getAttribute("lang")?.trim() ? 0 : 1,
    evidence: [
      { label: "Root element", value: "<html>" },
      { label: "lang", value: htmlEl.getAttribute("lang") ?? "not set" },
    ],
    el: htmlEl,
  });

  const hasMain = !!doc.querySelector("main, [role='main']");
  const hasNav = !!doc.querySelector("nav, [role='navigation']");
  add({
    check: "Landmarks",
    category: "accessibility",
    severity: "moderate",
    title: "Primary landmarks are missing",
    summary: `The document has ${hasMain ? "a main landmark" : "no main landmark"} and ${hasNav ? "a navigation landmark" : "no navigation landmark"}. Landmarks are how keyboard and screen-reader users jump between regions.`,
    recommendation:
      "Wrap the primary content in <main> and the primary link group in <nav>. One of each is usually enough.",
    occurrences: (hasMain ? 0 : 1) + (hasNav ? 0 : 1),
    evidence: [
      { label: "Main", value: hasMain ? "present" : "missing" },
      { label: "Navigation", value: hasNav ? "present" : "missing" },
    ],
    el: doc.body,
  });

  const ids = new Map<string, number>();
  all.forEach((el) => {
    const id = el.getAttribute("id");
    if (id) ids.set(id, (ids.get(id) ?? 0) + 1);
  });
  const duplicateIds = Array.from(ids.entries()).filter(([, count]) => count > 1);
  add({
    check: "Duplicate identifiers",
    category: "accessibility",
    severity: "serious",
    title: "Duplicate IDs break element references",
    summary: `${duplicateIds.length} identifier${duplicateIds.length === 1 ? " is" : "s are"} used more than once. Labels, anchors and focus management can resolve to the wrong element.`,
    recommendation: "Make every id unique. Prefer classes for styling and data attributes for scripting hooks.",
    occurrences: duplicateIds.length,
    evidence: [
      { label: "IDs in document", value: String(ids.size) },
      { label: "Duplicates", value: duplicateIds.map(([id, n]) => `${id} ×${n}`).join(", ") || "—" },
    ],
    el: duplicateIds[0] ? doc.getElementById(duplicateIds[0][0]) : null,
  });

  const positiveTab = Array.from(doc.querySelectorAll("[tabindex]")).filter(
    (el) => Number(el.getAttribute("tabindex")) > 0,
  );
  add({
    check: "Sequential tab order",
    category: "accessibility",
    severity: "serious",
    title: "Positive tabindex values override the natural order",
    summary: `${positiveTab.length} element${positiveTab.length === 1 ? "" : "s"} set a positive tabindex. This takes the keyboard sequence out of document order and is difficult to maintain.`,
    recommendation:
      "Use tabindex=\"0\" only when needed, and fix the DOM order instead of forcing a different sequence.",
    occurrences: positiveTab.length,
    evidence: [{ label: "Affected elements", value: positiveTab.map((el) => selectorFor(el)).slice(0, 4).join(", ") }],
    el: positiveTab[0],
  });

  /* ——— User Experience ————————————————————————— */
  const viewport = doc.querySelector('meta[name="viewport"]');
  add({
    check: "Document viewport",
    category: "ux",
    severity: "serious",
    title: "No responsive viewport is declared",
    summary:
      "Without a viewport meta tag, mobile browsers assume a desktop canvas and shrink the entire page, making text and controls unusable.",
    recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
    occurrences: viewport ? 0 : 1,
    evidence: [{ label: "Viewport meta", value: viewport?.getAttribute("content") ?? "not found" }],
    el: doc.head,
  });

  const title = doc.title?.trim() ?? "";
  add({
    check: "Page title presence",
    category: "ux",
    severity: "serious",
    title: "The page has no document title",
    summary: "The title is the name of the page in tabs, history and assistive technology. It is currently empty.",
    recommendation: "Write a concise, page-specific title. Put the page name before the site name.",
    occurrences: title ? 0 : 1,
    evidence: [{ label: "Document title", value: title || "empty" }],
    el: doc.head,
  });

  const h1s = Array.from(doc.querySelectorAll("h1"));
  add({
    check: "Heading structure",
    category: "ux",
    severity: "moderate",
    title: h1s.length === 0 ? "The page has no primary heading" : "The page has more than one primary heading",
    summary:
      h1s.length === 0
        ? "The visual headline is not exposed as an H1, so the page opens without announcing what it is about."
        : `${h1s.length} H1 elements compete for the same role. The reading outline becomes ambiguous.`,
    recommendation:
      h1s.length === 0
        ? "Promote the primary page headline to an H1; keep the visual styling with a class."
        : "Keep one H1 that describes the page. Use H2 for the next level of content.",
    occurrences: h1s.length === 1 ? 0 : Math.max(1, h1s.length),
    evidence: [
      { label: "H1 count", value: String(h1s.length) },
      { label: "Page headline", value: h1s[0]?.textContent?.trim().slice(0, 90) || "—" },
    ],
    el: h1s[0] ?? doc.body,
  });

  const genericLabels = /^(read more|more|click here|here|learn more|details|view|open|go|→|↗|>>)$/i;
  const vagueLinks = controls.filter((el) => {
    const label = accessibleName(el);
    return label.length > 0 && genericLabels.test(label) && !el.getAttribute("aria-label");
  });
  add({
    check: "Link purpose",
    category: "ux",
    severity: "moderate",
    title: "Link labels do not explain their destination",
    summary: `${vagueLinks.length} control${vagueLinks.length === 1 ? "" : "s"} use a generic label such as “more” or an arrow. Read out of context, the purpose is lost.`,
    recommendation: "Write the destination into the label, or add a descriptive aria-label when the visible text must stay short.",
    occurrences: vagueLinks.length,
    evidence: [
      { label: "Generic labels", value: vagueLinks.slice(0, 4).map((el) => accessibleName(el)).join(", ") || "—" },
    ],
    el: vagueLinks[0],
  });

  const smallTargets = controls.filter((el) => {
    if (!measurement) return false;
    if (el.tagName === "A" && el.closest("p, li")) return false;
    const rect = el.getBoundingClientRect();
    return rect.width < 32 || rect.height < 32;
  });
  add({
    check: "Touch target size",
    category: "ux",
    severity: "moderate",
    title: "Some controls are smaller than a comfortable target",
    summary: `${smallTargets.length} interactive element${smallTargets.length === 1 ? " is" : "s are"} under 32 CSS pixels in one dimension. On touch screens, precise pointing is not a reasonable expectation.`,
    recommendation: "Give controls at least a 44 × 44 px active area. Padding can expand the target without changing the visual size.",
    occurrences: smallTargets.length,
    evidence: [
      { label: "Measured controls", value: String(controls.length) },
      {
        label: "Smallest",
        value: (() => {
          if (!measurement || !smallTargets.length) return "—";
          const first = smallTargets[0].getBoundingClientRect();
          return `${Math.round(first.width)} × ${Math.round(first.height)} px`;
        })(),
      },
    ],
    el: smallTargets[0],
  });

  const skipLinks = Array.from(doc.querySelectorAll("a[href^='#']")).filter((el) => {
    if (visible(el)) return false;
    const label = accessibleName(el).toLowerCase();
    return label.includes("skip") || label.includes("jump to");
  });
  add({
    check: "Skip-to-content",
    category: "ux",
    severity: "minor",
    title: "There is no skip-to-content affordance",
    summary:
      "Keyboard users must pass through the entire navigation on every visit before reaching the page content.",
    recommendation:
      "Add a visually hidden link as the first focusable element that becomes visible on focus and points to the main region.",
    occurrences: skipLinks.length ? 0 : 1,
    evidence: [{ label: "Skip links", value: skipLinks.length ? "present" : "not found" }],
    el: doc.body,
  });

  const blindNewWindows = Array.from(doc.querySelectorAll("a[target='_blank']")).filter(
    (el) => !/opens|new window|new tab/i.test(`${accessibleName(el)} ${el.getAttribute("aria-label") ?? ""}`),
  );
  add({
    check: "New-window cues",
    category: "ux",
    severity: "minor",
    title: "New windows open without warning",
    summary: `${blindNewWindows.length} link${blindNewWindows.length === 1 ? " opens" : "s open"} in a new tab without announcing it, unexpectedly replacing the user's sense of place.`,
    recommendation: "Add “opens in a new tab” to the accessible name, or reconsider whether a new tab is needed.",
    occurrences: blindNewWindows.length,
    evidence: [{ label: "Links", value: blindNewWindows.map((el) => accessibleName(el).slice(0, 40)).join(", ") || "—" }],
    el: blindNewWindows[0],
  });

  const noAutocomplete = fields.filter((el) => !el.hasAttribute("autocomplete") && (el.getAttribute("type") ?? "text") !== "search");
  add({
    check: "Form guidance",
    category: "ux",
    severity: "minor",
    title: "Form affordances are not advertised",
    summary: `${noAutocomplete.length} field${noAutocomplete.length === 1 ? "" : "s"} omit autocomplete hints, missing an opportunity to reduce input effort and errors.`,
    recommendation: "Add autocomplete values such as email, name or organization where the field collects personal data.",
    occurrences: noAutocomplete.length,
    evidence: [{ label: "Fields without hints", value: String(noAutocomplete.length) }],
    el: noAutocomplete[0],
  });

  /* ——— Visual design ————————————————————————— */
  const viewportWidth = measurement?.viewportWidth ?? 1280;
  const scrollWidth = doc.documentElement.scrollWidth;
  const overflow = Math.max(0, scrollWidth - viewportWidth);
  let wideElement: HTMLElement | null = null;
  if (overflow > 2) {
    let widest = 0;
    for (const el of all.slice(0, 900)) {
      const rect = el.getBoundingClientRect();
      const over = rect.right + (measurement?.win.scrollX ?? 0) - viewportWidth;
      if (over > widest) {
        widest = over;
        wideElement = el as HTMLElement;
      }
    }
  }
  add({
    check: "Horizontal overflow",
    category: "visual",
    severity: "serious",
    title: "The page extends beyond its canvas",
    summary: `The rendered document is ${Math.round(scrollWidth)} px wide in a ${viewportWidth} px viewport. The extra ${Math.round(overflow)} px causes sideways scrolling and clipped composition.`,
    recommendation:
      "Find the widest element and constrain it. Prefer max-width and wrapping over a global overflow:hidden that hides the symptom.",
    occurrences: overflow > 2 ? 1 : 0,
    evidence: [
      { label: "Canvas", value: `${viewportWidth} px` },
      { label: "Rendered width", value: `${scrollWidth} px` },
      { label: "Offender", value: wideElement ? `${selectorFor(wideElement)} (+${Math.round(overflow)} px)` : "—" },
    ],
    el: wideElement,
  });

  const unsizedImages = Array.from(doc.images).filter(
    (img) => !img.hasAttribute("width") && !img.hasAttribute("height"),
  );
  add({
    check: "Image dimensions",
    category: "visual",
    severity: "moderate",
    title: "Images do not reserve their space",
    summary: `${unsizedImages.length} image${unsizedImages.length === 1 ? "" : "s"} declare no intrinsic dimensions, allowing the layout to move when the asset arrives.`,
    recommendation: "Set width and height attributes, then let CSS manage the responsive size. Use aspect-ratio where the asset is not available at build time.",
    occurrences: unsizedImages.length,
    evidence: [{ label: "Images without dimensions", value: `${unsizedImages.length} of ${doc.images.length}` }],
    el: unsizedImages[0],
  });

  const palette = new Set<string>();
  const radii = new Set<string>();
  for (const el of all.slice(0, 700)) {
    const cs = styleOf(el);
    if (!cs) continue;
    const fg = parseColor(cs.color);
    const bg = parseColor(cs.backgroundColor);
    if (fg) palette.add(rgbCss(fg));
    if (bg && bg.a > 0.2) palette.add(rgbCss(bg));
    const radius = cs.borderRadius;
    if (radius && radius !== "0px" && cs.borderTopLeftRadius !== "0px") radii.add(radius);
  }
  add({
    check: "Palette sprawl",
    category: "visual",
    severity: "minor",
    title: "The palette is drifting beyond a system",
    summary: `${palette.size} distinct colour values are painted across the rendered page. Past roughly 22, a palette stops reading as a decision and starts reading as an accumulation.`,
    recommendation: "Consolidate colour into documented tokens. If a value appears once, ask whether it carries meaning.",
    occurrences: palette.size > 22 ? palette.size - 22 : 0,
    evidence: [
      { label: "Distinct colours", value: String(palette.size) },
      { label: "Threshold", value: "22" },
    ],
  });

  const notableRadii = Array.from(radii).filter((r) => !/999|50%|9999/.test(r));
  add({
    check: "Shape consistency",
    category: "visual",
    severity: "minor",
    title: "Corner language is inconsistent",
    summary: `${notableRadii.length} distinct non-pill corner values are in use, weakening the shape grammar of the interface.`,
    recommendation: "Choose a small radius scale — for example 0, 2 and 8 px — and spend it deliberately.",
    occurrences: notableRadii.length > 4 ? notableRadii.length - 4 : 0,
    evidence: [{ label: "Radius values", value: notableRadii.slice(0, 8).join(", ") || "none" }],
  });

  const heavyUnresponsiveImages = Array.from(doc.images).filter((img) => {
    if (!measurement) return false;
    return img.getBoundingClientRect().width > 600 && !img.hasAttribute("srcset");
  });
  add({
    check: "Responsive asset hints",
    category: "visual",
    severity: "minor",
    title: "Large images have no responsive sources",
    summary: `${heavyUnresponsiveImages.length} image${heavyUnresponsiveImages.length === 1 ? " is" : "s are"} displayed above 600 px without a srcset, so every viewport downloads the same asset.`,
    recommendation: "Provide srcset and sizes for large art-directed imagery, with a sensible default src.",
    occurrences: heavyUnresponsiveImages.length,
    evidence: [{ label: "Large images", value: String(heavyUnresponsiveImages.length) }],
    el: heavyUnresponsiveImages[0],
  });

  /* ——— Typography ————————————————————————— */
  const families = new Set<string>();
  const sizes = new Set<number>();
  let smallestText = 99;
  let tightestLineHeight = 99;
  for (const el of textElements) {
    const cs = styleOf(el);
    if (!cs) continue;
    const family = cs.fontFamily.split(",")[0]?.replace(/["']/g, "").trim().toLowerCase();
    if (family) families.add(family);
    const size = Number.parseFloat(cs.fontSize);
    if (!Number.isNaN(size) && size > 0) {
      sizes.add(Math.round(size * 10) / 10);
      if (size < smallestText) smallestText = size;
    }
    if (/^(P|LI|BLOCKQUOTE)$/.test(el.tagName)) {
      const ratio = Number.parseFloat(cs.lineHeight) / size;
      if (Number.isFinite(ratio) && ratio < tightestLineHeight) tightestLineHeight = ratio;
    }
  }
  add({
    check: "Font family count",
    category: "typography",
    severity: "moderate",
    title: "Too many typeface families are in use",
    summary: `${families.size} rendered typeface families are active. A page can carry several weights of a system; four unrelated families rarely earn their keep.`,
    recommendation: "Reduce to a display face and a text face — a mono for technical metadata is a reasonable third.",
    occurrences: families.size > 3 ? families.size - 3 : 0,
    evidence: [
      { label: "Families in use", value: String(families.size) },
      { label: "Resolved families", value: Array.from(families).join(", ") },
    ],
    el: textElements[0],
  });

  add({
    check: "Type size inventory",
    category: "typography",
    severity: "moderate",
    title: "The type scale has lost its discipline",
    summary: `${sizes.size} distinct rendered font sizes are in play. Beyond seven, hierarchy starts to look accidental and becomes difficult to implement consistently.`,
    recommendation: "Define a small fluid type scale. Muted labels should still be measured: 10, 12 and 14 px are not a scale on their own.",
    occurrences: sizes.size > 7 ? sizes.size - 7 : 0,
    evidence: [
      { label: "Distinct sizes", value: String(sizes.size) },
      { label: "Range", value: sizes.size ? `${Math.min(...sizes)} – ${Math.max(...sizes)} px` : "—" },
      { label: "Sizes", value: Array.from(sizes).sort((a, b) => a - b).join(", ") },
    ],
  });

  const tinyTexts: { el: Element; size: number }[] = [];
  for (const el of textElements) {
    if ((el.textContent ?? "").trim().length < 8) continue;
    const cs = styleOf(el);
    if (!cs) continue;
    const size = Number.parseFloat(cs.fontSize);
    if (size > 0 && size < 12) tinyTexts.push({ el, size });
  }
  add({
    check: "Small body text",
    category: "typography",
    severity: "moderate",
    title: "Functional text is smaller than it should be",
    summary: `${tinyTexts.length} text element${tinyTexts.length === 1 ? "" : "s"} render below 12 px. Small caps and tracking can make an editorial label work; critical labels need a dependable reading size.`,
    recommendation: "Keep interactive and supporting copy at 12 px or above. If a label must be smaller, verify it against the contrast and target-size requirements.",
    occurrences: tinyTexts.length,
    evidence: [
      { label: "Below 12 px", value: String(tinyTexts.length) },
      { label: "Smallest", value: `${Math.round(smallestText * 10) / 10} px` },
      { label: "Example", value: tinyTexts[0] ? snippetFor(tinyTexts[0].el).slice(0, 110) : "—" },
    ],
    el: tinyTexts[0]?.el,
  });

  const overlong: { el: Element; chars: number }[] = [];
  for (const el of textElements) {
    if (!/^(P|LI|BLOCKQUOTE)$/.test(el.tagName)) continue;
    const text = (el.textContent ?? "").trim();
    if (text.length < 70) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10) continue;
    const cs = styleOf(el);
    const font = Number.parseFloat(cs?.fontSize ?? "16") || 16;
    const chars = rect.width / (font * 0.5);
    if (chars > 90) overlong.push({ el, chars });
  }
  add({
    check: "Overlong line length",
    category: "typography",
    severity: "moderate",
    title: "Running text asks the eye to travel too far",
    summary: `${overlong.length} paragraph${overlong.length === 1 ? " estimates" : "s estimate"} a line longer than 90 characters. The eye loses its place on the return sweep.`,
    recommendation: "Set a measure around 60–75 characters. Use ch units or a max-width on the text column, not on the whole section.",
    occurrences: overlong.length,
    evidence: [
      { label: "Longest measure", value: overlong.length ? `≈ ${Math.round(Math.max(...overlong.map((m) => m.chars)))} characters` : "within range" },
      { label: "Affected", value: overlong.slice(0, 3).map((m) => selectorFor(m.el)).join(", ") || "—" },
    ],
    el: overlong[0]?.el,
  });

  add({
    check: "Tight line height",
    category: "typography",
    severity: "moderate",
    title: "Running text is set too tightly",
    summary: `The tightest measured line-height in body copy is ${Number.isFinite(tightestLineHeight) ? tightestLineHeight.toFixed(2) : "—"}×. Below 1.3, ascenders and descenders begin to collide across lines.`,
    recommendation: "Set body line-height between 1.45 and 1.65. Large headlines may go tighter, but body copy needs air.",
    occurrences: Number.isFinite(tightestLineHeight) && tightestLineHeight < 1.3 ? 1 : 0,
    evidence: [{ label: "Tightest ratio", value: Number.isFinite(tightestLineHeight) ? `${tightestLineHeight.toFixed(2)}×` : "not measured" }],
  });

  /* ——— Contrast ————————————————————————— */
  interface ContrastSample {
    el: Element;
    ratio: number;
    size: number;
    bold: boolean;
    text: string;
    fg: string;
    bg: string;
    selector: string;
  }
  const samples: ContrastSample[] = [];
  const tested: ContrastSample[] = [];
  if (measurement) {
    const walker = doc.createTreeWalker(doc.body ?? doc.documentElement, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let count = 0;
    while (node && count < 480) {
      const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
      const parent = node.parentElement;
      if (text.length >= 2 && parent && !parent.closest("script,style,noscript,svg,title")) {
        count += 1;
        if (visible(parent)) {
          const cs = styleOf(parent);
          const bg = resolveBackground(parent, win!);
          const raw = parseColor(cs?.color ?? "");
          if (cs && bg && raw) {
            const fg = raw.a < 0.99 ? composite(raw, bg) : raw;
            const ratio = contrastRatio(fg, bg);
            const size = Number.parseFloat(cs.fontSize) || 16;
            const weight = Number.parseInt(cs.fontWeight, 10) || 400;
            const bold = weight >= 700;
            const sample: ContrastSample = {
              el: parent,
              ratio,
              size,
              bold,
              text: text.slice(0, 70),
              fg: rgbCss(fg),
              bg: rgbCss(bg),
              selector: selectorFor(parent),
            };
            tested.push(sample);
            const required = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
            if (ratio < required) samples.push(sample);
          }
        }
      }
      node = walker.nextNode();
    }
  }
  samples.sort((a, b) => a.ratio - b.ratio);
  const bodyFailures = samples.filter((s) => !(s.size >= 24 || (s.bold && s.size >= 18.66)));
  const largeFailures = samples.filter((s) => s.size >= 24 || (s.bold && s.size >= 18.66));
  const worst = samples[0];
  add({
    check: "AA body contrast",
    category: "contrast",
    severity: worst && worst.ratio < 3 ? "critical" : "serious",
    title: "Body text falls below the AA contrast floor",
    summary: `${bodyFailures.length} visible text sample${bodyFailures.length === 1 ? "" : "s"} fail the 4.5:1 requirement for normal text. The worst pair is ${worst ? worst.ratio.toFixed(2) : "—"}:1.`,
    recommendation:
      "Darken the text or lighten its nearest opaque surface until the pair passes 4.5:1. Do not rely on subtlety to communicate secondary information.",
    occurrences: bodyFailures.length,
    evidence: [
      { label: "Tested", value: `${tested.length} text samples` },
      { label: "Failures", value: String(bodyFailures.length) },
      { label: "Worst", value: worst ? `${worst.ratio.toFixed(2)}:1 · ${worst.fg} on ${worst.bg}` : "—" },
      { label: "Sample", value: worst ? `“${worst.text}”` : "—" },
    ],
    el: worst?.el,
  });
  add({
    check: "AA large-text contrast",
    category: "contrast",
    severity: "serious",
    title: "Large text is not meeting 3:1",
    summary: `${largeFailures.length} large text sample${largeFailures.length === 1 ? "" : "s"} fall below the 3:1 threshold, so display typography loses legibility where it should be strongest.`,
    recommendation: "Hold large display text to at least 3:1, and normal text to 4.5:1. Size does not excuse low contrast.",
    occurrences: largeFailures.length,
    evidence: [
      { label: "Large-text failures", value: String(largeFailures.length) },
      { label: "Worst", value: largeFailures[0] ? `${largeFailures[0].ratio.toFixed(2)}:1` : "—" },
    ],
    el: largeFailures[0]?.el,
  });

  const lowUi = Array.from(doc.querySelectorAll("input, button, select, textarea")).filter((el) => {
    if (!measurement || !visible(el)) return false;
    const cs = styleOf(el);
    const bg = resolveBackground(el, win!);
    const border = parseColor(cs?.borderTopColor ?? "");
    if (!cs || !bg || !border || border.a < 0.2) return false;
    return contrastRatio(border, bg) < 3;
  });
  add({
    check: "Low-contrast UI samples",
    category: "contrast",
    severity: "moderate",
    title: "Control boundaries do not meet non-text contrast",
    summary: `${lowUi.length} field or button boundar${lowUi.length === 1 ? "y falls" : "ies fall"} below 3:1 against the surrounding surface. If the boundary is the only cue, the control becomes hard to locate.`,
    recommendation: "Strengthen the control's border, surface or focus indicator to at least 3:1. Keep the visual language quiet without making the affordance disappear.",
    occurrences: lowUi.length,
    evidence: [{ label: "Boundaries below 3:1", value: String(lowUi.length) }],
    el: lowUi[0],
  });

  const cssText = Array.from(doc.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("\n");
  const suppressesOutline = /outline\s*:\s*(none|0)/i.test(cssText);
  const restoresFocus = /:focus(-visible)?\s*\{[^}]*outline\s*:\s*(?!none|0)[^;}]+/i.test(cssText);
  add({
    check: "Visible focus rules",
    category: "contrast",
    severity: "serious",
    title: "Keyboard focus may be invisible",
    summary:
      "The stylesheet removes the default outline and does not define a visible replacement, leaving keyboard users without a reliable position indicator.",
    recommendation:
      "Style :focus-visible with a high-contrast outline or equivalent indicator and test it with the Tab key.",
    occurrences: suppressesOutline && !restoresFocus ? 1 : 0,
    evidence: [
      { label: "Outline suppressed", value: suppressesOutline ? "yes" : "no" },
      { label: "Replacement found", value: restoresFocus ? "yes" : "no" },
    ],
  });

  /* ——— Metadata ————————————————————————— */
  const description = doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";
  add({
    check: "Meta description",
    category: "metadata",
    severity: "moderate",
    title: "The search description is missing or misshapen",
    summary: description
      ? `The description is ${description.length} characters. Search results are clearest between roughly 50 and 160 characters.`
      : "No meta description is present, so the search engine will invent one from whatever it finds on the page.",
    recommendation: "Write a specific description that states what the page offers and who it is for. Keep it between 50 and 160 characters.",
    occurrences: !description ? 1 : description.length < 50 || description.length > 180 ? 1 : 0,
    evidence: [
      { label: "Length", value: `${description.length} characters` },
      { label: "Content", value: description || "not present" },
    ],
    el: doc.head,
  });

  add({
    check: "Title length",
    category: "metadata",
    severity: "minor",
    title: "The document title is an awkward length",
    summary:
      title.length < 20
        ? `At ${title.length} characters, the title says too little to distinguish this page.`
        : `At ${title.length} characters, the title is likely to be truncated in search results.`,
    recommendation: "Aim for 20–65 characters. Lead with the specific page, then the organisation.",
    occurrences: !title || title.length < 20 || title.length > 65 ? 1 : 0,
    evidence: [{ label: "Title", value: title || "empty" }, { label: "Length", value: String(title.length) }],
    el: doc.head,
  });

  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "";
  add({
    check: "Open Graph title",
    category: "metadata",
    severity: "minor",
    title: "Social sharing has no authored title",
    summary: "Without og:title, the network chooses a fallback and the shared card no longer reflects the page's own voice.",
    recommendation: "Add an og:title that reads well outside the page context. Use og:description for the supporting line.",
    occurrences: ogTitle ? 0 : 1,
    evidence: [{ label: "og:title", value: ogTitle || "not present" }],
    el: doc.head,
  });

  const ogImage = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
  add({
    check: "Social image",
    category: "metadata",
    severity: "minor",
    title: "No social image is defined",
    summary: "Shared links will fall back to a plain card or an arbitrary image from the page.",
    recommendation: "Provide a landscape image at least 1200 × 630 px, art-directed for the card rather than cropped from the hero.",
    occurrences: ogImage ? 0 : 1,
    evidence: [{ label: "og:image", value: ogImage?.getAttribute("content") ?? "not present" }],
    el: doc.head,
  });

  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  add({
    check: "Canonical address",
    category: "metadata",
    severity: "minor",
    title: "The canonical address is not declared",
    summary: "Without a canonical link, variants of this page can compete with each other in search results.",
    recommendation: "Add a canonical link with the absolute preferred URL for the content.",
    occurrences: canonical ? 0 : 1,
    evidence: [{ label: "Canonical", value: canonical || "not present" }],
    el: doc.head,
  });

  add({
    check: "Single primary heading",
    category: "metadata",
    severity: "moderate",
    title: "The page does not present one clear topic",
    summary: `There ${h1s.length === 1 ? "is one H1" : `are ${h1s.length} H1 elements`}. Search engines and assistive technology use the primary heading to understand what the page is about.`,
    recommendation: "Keep a single H1 that describes the page's subject, distinct from the site name.",
    occurrences: h1s.length === 1 ? 0 : 1,
    evidence: [{ label: "H1 count", value: String(h1s.length) }, { label: "Heading", value: h1s[0]?.textContent?.trim().slice(0, 80) ?? "—" }],
    el: h1s[0] ?? doc.body,
  });

  /* ——— Report assembly ————————————————————————— */
  const findings: Finding[] = drafts.map((draft) => {
    let region: Finding["region"];
    let selector: string | undefined;
    let snippet: string | undefined;
    if (draft.el && measurement) {
      try {
        const rect = draft.el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const pageWidth = Math.max(viewportWidth, 1);
          const pageHeight = Math.max(measurement.bodyHeight, 1);
          const left = rect.left + (measurement.win.scrollX || 0);
          const top = rect.top + (measurement.win.scrollY || 0);
          region = {
            x: Math.max(0, Math.min(100, (left / pageWidth) * 100)),
            y: Math.max(0, Math.min(100, (top / pageHeight) * 100)),
            w: Math.max(0.5, Math.min(100, (rect.width / pageWidth) * 100)),
            h: Math.max(0.5, Math.min(100, (rect.height / pageHeight) * 100)),
          };
        }
        selector = selectorFor(draft.el);
        snippet = snippetFor(draft.el);
      } catch {
        /* element detached */
      }
    }
    return {
      id: "",
      check: draft.check,
      category: draft.category,
      severity: draft.severity,
      title: draft.title,
      summary: draft.summary,
      recommendation: draft.recommendation,
      occurrences: draft.occurrences,
      evidence: draft.evidence.filter((e) => e.value && e.value !== "—"),
      selector,
      snippet,
      region,
    };
  });

  const sorted = findings.sort(
    (a, b) =>
      ["critical", "serious", "moderate", "minor"].indexOf(a.severity) -
        ["critical", "serious", "moderate", "minor"].indexOf(b.severity) ||
      a.category.localeCompare(b.category),
  );

  const counters: Record<string, number> = {};
  for (const finding of sorted) {
    const prefix = PREFIX[finding.category];
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    finding.id = `${prefix}-${String(counters[prefix]).padStart(2, "0")}`;
  }

  const categories: CategoryResult[] = (Object.keys(CATEGORY_WEIGHTS) as CategoryId[]).map((id) => {
    const own = sorted.filter((f) => f.category === id);
    const score = Math.round(
      Math.max(0, 100 - own.reduce((sum, f) => sum + penaltyFor(f as unknown as DraftFinding), 0)),
    );
    return {
      id,
      score,
      findings: own.length,
      tested: `${own.reduce((sum, f) => sum + f.occurrences, 0)} signals · ${own.length} issues`,
    };
  });

  const weighted =
    categories.reduce((sum, c) => sum + c.score * CATEGORY_WEIGHTS[c.id], 0) /
    Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
  const criticalCount = sorted.filter((f) => f.severity === "critical").length;
  const overall = Math.round(Math.max(0, weighted - Math.min(10, criticalCount * 3.5)));

  const stats: AuditStats = {
    elements: all.length,
    textNodes: tested.length,
    fonts: Array.from(families),
    fontSizes: Array.from(sizes).sort((a, b) => a - b),
    colors: palette.size,
    images: doc.images.length,
    links: controls.filter((el) => el.tagName === "A").length,
    controls: controls.length,
    height: measurement?.bodyHeight ?? 0,
    viewportWidth,
  };

  notes.push(
    measurement
      ? "Measured from the rendered document in a 1280 px sandbox with scripts disabled."
      : "Layout measurement was unavailable; this report reflects markup-level checks only.",
    "Contrast is sampled from visible text nodes against the nearest opaque painted surface.",
    "Scores are a weighted index of individual findings. They support a manual audit; they do not replace one.",
  );

  const displayUrl =
    input.displayUrl?.trim() ||
    input.url.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
    "Pasted document";

  return {
    id: `AW-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    url: input.url,
    displayUrl,
    pageTitle: title || "Untitled document",
    inspectedAt: new Date().toISOString(),
    source: input.source,
    specimenId: input.specimenId,
    overall,
    grade: gradeFor(overall),
    verdict: verdictFor(overall),
    categories,
    findings: sorted,
    passes: Math.max(0, TOTAL_CHECKS - sorted.length),
    stats,
    notes,
    html: prepared,
  };
}

/* ————————————————————————————————————————————————
   Fetching a live URL (browser-side and honest)
———————————————————————————————————————————————— */
export function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Enter a website address to inspect.");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("That does not look like a valid web address.");
  }
  if (!url.hostname.includes(".")) {
    throw new Error("Enter a full domain, for example studio.example.com.");
  }
  return url.toString();
}

async function attempt(url: string, timeout = 11000): Promise<string> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/html,application/xhtml+xml" },
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!text || text.length < 40) throw new Error("Empty document");
    return text.slice(0, 900_000);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchPageHtml(rawUrl: string): Promise<{ html: string; url: string; notes: string[] }> {
  const url = normaliseUrl(rawUrl);
  const notes: string[] = [];
  try {
    const html = await attempt(url);
    notes.push("Fetched directly from the source. Inline and external scripts were disabled before rendering.");
    return { html, url, notes };
  } catch {
    notes.push(
      "The site could not be fetched directly from the browser — most likely a cross-origin policy. The audit was completed through a public read-only proxy, which can omit protected resources.",
    );
  }
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];
  for (const proxy of proxies) {
    try {
      const html = await attempt(proxy, 13000);
      if (/<html|<!doctype|<body/i.test(html)) {
        return { html, url, notes };
      }
    } catch {
      /* try the next route */
    }
  }
  throw new Error(
    "The page could not be retrieved from this browser. A site may block cross-origin requests. Paste its HTML in the Markup tab to inspect the same evidence locally.",
  );
}
