# AUDIT/WEB

> **Every interface leaves evidence.**  
> An evidence-based web interface inspection workbench. Measure accessibility, experience, visual hierarchy, typography, colors, and metadata straight from rendered live web pages.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-100%2F100-success)](https://auditweb.dev/)

---

## Overview

A website is not a matter of taste alone — it is a set of measurable decisions. **AUDIT/WEB** inspects rendered web pages inside a headless browser, evaluates DOM geometry and computed styles against authoritative design engineering heuristics, and generates an actionable finding ledger you can export directly into AI coding agents.

- **100% Free & Open Access**: No paywalls, accounts, or tracking.
- **Rendered Browser Measurement**: Audits the live DOM as rendered, not raw unparsed static HTML.
- **Bi-directional Visual Inspector**: Spatial bounding-box pins plotted directly on full-page screenshots with bi-directional card synchronization.
- **Multi-Format AI Spec Exports**: Surgical export formats tailored for Claude Code, Cursor, Codex, and automated repair pipelines.

---

## 6 Inspection Categories

AUDIT/WEB evaluates 36+ deterministic checks across six core disciplines:

| No. | Category | Checks Evaluated |
|---|---|---|
| **01** | **Accessibility (A11Y)** | WCAG 2.1 AA compliance (via `axe-core`), touch targets ≥ 44×44px, interactive ARIA roles, form label associations. |
| **02** | **User Experience (UX)** | Non-semantic clickable `div`/`span` tags, dead placeholder links (`#`), missing focus rings, viewport scaling blocks. |
| **03** | **Visual Design** | Horizontal viewport scrollbars, container overflow clipping, content bleeding past document envelope. |
| **04** | **Typography** | Font size thresholds (< 12px), line lengths exceeding 85 characters, line-height ratios, skipped heading hierarchy (`h1` → `h3`). |
| **05** | **Colour & Contrast** | Relative luminance contrast (4.5:1 text, 3:1 large), color-only state differentiation, palette entropy. |
| **06** | **Search & Metadata** | Canonical URL verification, OpenGraph & Twitter cards, descriptive meta tags, viewport tags, robots directives. |

---

## AI-Agent Ready Exports

Turn interface audits into immediate code fixes with one-click export formats:

- **`AGENTS.md`**: Modular prompt directives and verification criteria for autonomous multi-agent environments.
- **`.cursorrules`**: Context-efficient system rules optimized for Cursor AI IDE sessions.
- **`CLAUDE.md`**: Terse, actionable workspace guide optimized for Claude Code terminal workflows.
- **`AUDIT.md`**: Complete finding ledger with CSS selectors, exact values, and surgical recommendations.
- **Full AI Prompt**: Self-contained markdown prompt ready to paste into any LLM.

---

## Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom Swiss editorial design token system
- **Engine**: [Playwright](https://playwright.dev/) headless Chromium + [`axe-core`](https://github.com/dequelabs/axe-core)
- **Database**: Native `node:sqlite` (Node.js built-in zero-dependency storage)
- **Icons**: Custom SVG geometry + [Lucide Icons](https://lucide.dev/)
- **Typography**: Bricolage Grotesque, Instrument Serif, IBM Plex Mono

---

## Getting Started

### Prerequisites

- **Node.js**: `v20+` (or `v24+` for native `node:sqlite`)
- **Package Manager**: `npm` or `pnpm`

### Installation

```bash
# 1. Clone repository
git clone https://github.com/naphiertech/audit-web.git
cd audit-web

# 2. Install dependencies
npm install

# 3. Install Playwright Chromium browser
npx playwright install chromium
```

### Running Locally

```bash
# Start development server
npm run dev

# Open in browser
http://localhost:3000
```

### Production Build

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

### Running Tests

```bash
# Run end-to-end audit verification test
npm test
```

---

## Project Structure

```
audit-web/
├── public/                 # Static assets (favicons, manifests, OG image)
│   ├── icon.svg            # Adaptive SVG favicon (prefers-color-scheme)
│   ├── favicon.ico         # Standard multi-resolution icon
│   ├── apple-touch-icon.png# iOS touch icon
│   └── og-image.png        # 1200x630 social preview card
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, routes)
│   │   ├── api/            # API endpoints (/api/audit, /api/history)
│   │   ├── audit/[id]/     # Inspection workspace & visual inspector
│   │   ├── robots.ts       # Dynamic robots.txt
│   │   ├── sitemap.ts      # XML sitemap generator
│   │   └── manifest.ts     # PWA Web App Manifest
│   ├── components/         # React components
│   │   ├── audit/          # ScoreBoard, ScreenshotInspector, ExportModal
│   │   ├── landing/        # Hero, Instrument, Method, SiteNav, SiteFooter
│   │   └── ui/             # Reusable UI primitives and icons
│   ├── lib/
│   │   ├── auditor/        # Inspection engine, scoring, and 6 category rules
│   │   ├── specimens/      # Pre-computed specimen benchmarks
│   │   ├── db.ts           # SQLite local persistence layer
│   │   └── security.ts     # SSRF protection and URL validation
│   └── types/              # TypeScript interfaces for audits and findings
├── scripts/                # Test runner and asset generation utilities
├── LICENSE                 # MIT License
└── README.md               # Repository documentation
```

---

## Security & SSRF Protection

AUDIT/WEB includes strict server-side request forgery (SSRF) guardrails:
- Strictly blocks loopback addresses (`127.0.0.1`, `localhost`).
- Blocks private IPv4 RFC1918 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Blocks link-local addresses (`169.254.0.0/16`) and cloud metadata endpoints.
- Verifies network socket destination before Chromium navigation.

---

## Author

Engineered by **Naphier** ([@naphiertech](https://github.com/naphiertech))

---

## License

This project is licensed under the [MIT License](LICENSE).
