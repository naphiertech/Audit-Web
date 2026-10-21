# Open AuditWeb

An open-source-inspired alternative to TypeUI Audit that provides free, un-paywalled UI/UX, typography, visual design, and accessibility auditing with interactive visual pin inspection and actionable `AUDIT.md` exports for AI coding workflows.

---

## Features

- **100% Free & Unlocked**: Every category breakdown (Accessibility, UX, Visual Design, Typography, Colors) is completely unlocked without subscriptions or paid API requirements.
- **Interactive Visual Screenshot Inspection**: Real headless Chromium screenshot with numbered pin badges (`1`, `2`, `3`...) placed over DOM elements with issues using real bounding-box geometry.
- **Bi-directional Focus Sync**: Clicking a numbered pin scrolls to and highlights the finding card; clicking a finding card focuses and highlights its pin marker on the screenshot.
- **Deterministic 5-Category Rule Engine**:
  1. **Accessibility**: Automated WCAG 2.1 AA checking powered by `axe-core`.
  2. **User Experience**: Detects touch targets < 44x44px, placeholder/dead links, non-semantic interactive divs/spans, and form controls missing accessible labels.
  3. **Visual Design**: Horizontal page overflow detection, clipped container overflow, and elements exceeding viewport envelope.
  4. **Typography**: Readability thresholds (< 12px font size), line-height ratios, line length measures (> 85ch), heading hierarchy skips (`<h1>` to `<h3>`), and font family variance.
  5. **Colors**: WCAG AA relative luminance contrast calculations (4.5:1 text, 3:1 large/bold), color-only link differentiation, and extracted palette analysis.
- **Transparent Scoring System**:
  - Baseline: 100 points
  - Deductions based strictly on severity: Critical (-15), High (-8), Medium (-4), Low (-2)
  - Category scores computed individually alongside weighted overall score.
- **AI-Agent Ready Exports**:
  - One-click `AUDIT.md` export optimized for Claude Code, Cursor, Codex, and Grok.
  - Formatted "Copy AI Prompt" with surgical instructions for automated code repair.
  - Raw JSON export.
- **Built-in Local Persistence**:
  - Zero-dependency SQLite storage using Node 24's built-in `node:sqlite`.
  - Saved audit history drawer for inspecting and comparing past runs.
- **Security & SSRF Hardening**:
  - Validates URLs and strictly blocks loopback (`127.0.0.1`), private RFC1918 ranges, link-local addresses, and cloud metadata IPs (`169.254.169.254`).
  - Network-level route verification inside Chromium workers.

---

## Getting Started

### Prerequisites

- Node.js `v20+` (or `v24+` for native `node:sqlite`)
- npm or pnpm

### Installation

```bash
# Clone the repository
cd AuditWeb

# Install dependencies
npm install

# Download Playwright Chromium binary
npx playwright install chromium
```

### Running Locally

```bash
# Start Next.js development server
npm run dev

# Open in browser
http://localhost:3000
```

### Running Automated Audit Tests

```bash
npm test
```

---

## Architecture

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- **Engine**: Playwright Headless Chromium + `axe-core`
- **Database**: Native `node:sqlite` (`data/audits.db`)
- **Aesthetic**: Minimalist dark-first design system (`bryl-minimal` + `naphier-portfolio-design`) with hairline borders, precise monospace metadata, and responsive canvas.
