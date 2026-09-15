# Implementation Plan: Color Palette Explorer

_Generated: 2026-09-15_
_Based on: docs/architecture.md, docs/design-review.md_

---

## Execution Order

Tasks are listed in dependency order. Tasks within the same wave are independent and can be worked in parallel.

### Wave 1 — Pure Utilities (no source dependencies)
- TASK-01: Create `lib/colorUtils.js`
- TASK-02: Create `lib/filter.js`

### Wave 2 — Smoke Tests (depend only on Wave 1)
- TASK-03: Create `ci/test-colorUtils.js` ← blocked by TASK-01
- TASK-04: Create `ci/test-filter.js` ← blocked by TASK-02

### Wave 3 — Configuration & CI
- TASK-05: Create `package.json`
- TASK-06: Create `.github/workflows/ci.yml`

### Wave 4 — Static Assets & Styles
- TASK-07: Create `colors.v1.json`
- TASK-08: Create `styles.css`

### Wave 5 — HTML Shell (depends on Wave 4)
- TASK-09: Create `index.html` ← blocked by TASK-08

### Wave 6 — App Orchestrator (depends on all prior waves)
- TASK-10: Create `app.js` ← blocked by TASK-01, TASK-02, TASK-07, TASK-09

---

## Blocked Tasks

| Task | Blocked By | Reason |
|---|---|---|
| TASK-03 | TASK-01 | Smoke test imports `lib/colorUtils.js` |
| TASK-04 | TASK-02 | Smoke test imports `lib/filter.js` |
| TASK-09 | TASK-08 | HTML links to `styles.css`; both must be consistent |
| TASK-10 | TASK-01, TASK-02, TASK-07, TASK-09 | Orchestrator imports lib modules; depends on HTML structure and data file |

---

## Task Details

---

### TASK-01: Create `lib/colorUtils.js`
- **Type**: [FILE]
- **Output**: `lib/colorUtils.js`
- **Depends on**: none
- **Blocked by**: unblocked
- **Description**: Pure utility module exporting four functions with no DOM dependency. `hexToRgb(hex)` converts a 6-digit hex string to `{r,g,b}`. `rgbToHsl(r,g,b)` returns `{h,s,l}`. `getContrastRatio(hex1, hex2)` computes the WCAG relative luminance contrast ratio between two hex colours. `getSwatchTextColor(hex)` returns `'#000000'` if the colour's relative luminance exceeds 0.179 (GAP-08 threshold), otherwise `'#ffffff'`, ensuring WCAG 4.5:1 text contrast on any swatch.
- **Satisfies**: NFR-01 (performance — pure, no I/O), NFR-03 (WCAG 1.4.3 text contrast), GAP-08, GAP-09

---

### TASK-02: Create `lib/filter.js`
- **Type**: [FILE]
- **Output**: `lib/filter.js`
- **Depends on**: none
- **Blocked by**: unblocked
- **Description**: Pure utility module exporting `filterColors(colors, query, family)`. Performs case-insensitive partial match of `query` against `color.name`. Performs exact match of `family` against `color.family` (value `'All'` bypasses the family filter). Returns a new filtered array — does not mutate the input. No DOM coupling.
- **Satisfies**: FR-02, FR-03, FR-04, NFR-06 (independently testable), GAP-01

---

### TASK-03: Create `ci/test-colorUtils.js`
- **Type**: [FILE]
- **Output**: `ci/test-colorUtils.js`
- **Depends on**: TASK-01
- **Blocked by**: TASK-01
- **Description**: Node.js smoke test (no test framework). Uses `node:assert` to verify: `hexToRgb('#ff0000')` returns `{r:255,g:0,b:0}`; `getContrastRatio('#000000','#ffffff')` returns a value ≥ 21; `getSwatchTextColor('#ffffff')` returns `'#000000'`; `getSwatchTextColor('#000000')` returns `'#ffffff'`. Exits with code 0 on pass, throws on failure.
- **Satisfies**: FR-11 (npm test), GAP-09, AC-07

---

### TASK-04: Create `ci/test-filter.js`
- **Type**: [FILE]
- **Output**: `ci/test-filter.js`
- **Depends on**: TASK-02
- **Blocked by**: TASK-02
- **Description**: Node.js smoke test (no test framework). Uses `node:assert` to verify: `filterColors` with a matching query returns results; with a non-matching query returns `[]`; with a family filter returns only entries of that family; with `family = 'All'` returns all entries. Exits with code 0 on pass.
- **Satisfies**: FR-11 (npm test), AC-07

---

### TASK-05: Create `package.json`
- **Type**: [FILE]
- **Output**: `package.json`
- **Depends on**: none
- **Blocked by**: unblocked
- **Description**: Minimal npm manifest. `serve` script: `npx http-server . -p 3000 -c-1 --header "Content-Security-Policy: default-src 'self'"` (GAP-04 CSP, FR-10). `test` script: `node ci/test-colorUtils.js && node ci/test-filter.js` (FR-11). No runtime dependencies — `http-server` is used via `npx`.
- **Satisfies**: FR-10, FR-11, GAP-04

---

### TASK-06: Create `.github/workflows/ci.yml`
- **Type**: [FILE]
- **Output**: `.github/workflows/ci.yml`
- **Depends on**: none
- **Blocked by**: unblocked
- **Description**: GitHub Actions workflow triggered on `pull_request`. Single job `build-and-test` using `ubuntu-latest`, Node 20 LTS (`actions/setup-node@v4`), runs `npm test`. No install step needed (no dependencies). Pins Node to `20` (GAP-10).
- **Satisfies**: FR-12, AC-08, GAP-10

---

### TASK-07: Create `colors.v1.json`
- **Type**: [FILE]
- **Output**: `colors.v1.json`
- **Depends on**: none
- **Blocked by**: unblocked
- **Description**: Seed dataset of ≥ 20 named colours across ≥ 5 families (Red, Orange, Yellow, Green, Blue, Purple, Neutral). Each entry: `{ "name": string, "hex": string, "family": string }`. All entries must include all three required fields (normalisation test). HEX values use 6-digit uppercase format (e.g. `#FF5733`).
- **Satisfies**: FR-01, FR-03, DEP-01, ASM-02

---

### TASK-08: Create `styles.css`
- **Type**: [FILE]
- **Output**: `styles.css`
- **Depends on**: none
- **Blocked by**: unblocked
- **Description**: Full stylesheet using CSS custom properties. Defines `--warning-bg`, `--warning-text` for offline banner (GAP-08). Layout: flex column app shell. Controls: row with gap, stacks vertically on mobile (media query ≤ 600px). Swatch list: `display:flex; overflow-x:auto; gap:12px; padding:12px`. Each swatch: fixed 100×100px, `border-radius:8px`, displays name and HEX as `<span>` elements with `textContent` — text colour applied inline by `app.js`. Modal: `position:fixed` overlay with `role=dialog` target; inner box centred, focus-trapped. Loading state: centred spinner via CSS animation. Empty state: centred muted message. Offline banner: `position:sticky; top:0; background:var(--warning-bg)`.
- **Satisfies**: NFR-02 (responsive), NFR-03 (modal structure), GAP-02, GAP-03, GAP-04

---

### TASK-09: Create `index.html`
- **Type**: [FILE]
- **Output**: `index.html`
- **Depends on**: TASK-08
- **Blocked by**: TASK-08
- **Description**: App shell with all static markup. Includes: `<link>` to `styles.css`; `<script type="module" src="app.js">`; `<div id="offline-banner" role="alert" hidden>`; `<div id="loading-state" aria-label="Loading colors">` with spinner; `<section class="controls">` containing `<input id="search" type="search" aria-label="Search colors">` and `<select id="family-filter" aria-label="Filter by color family">`; `<div id="swatch-list" role="listbox" aria-label="Color swatches">`; `<div id="empty-state" hidden>No colors match your filter.</div>`; `<div id="aria-announcer" aria-live="polite" aria-atomic="true" class="sr-only">`; `<dialog id="color-modal" aria-modal="true" aria-labelledby="modal-title">` with fields for name, HEX, RGB, HSL, contrast-white, contrast-black, copy button, and close button.
- **Satisfies**: FR-01, FR-02, FR-03, FR-06, FR-07, NFR-03 (ARIA structure), GAP-02, GAP-03, RISK-03 (DD-01 keyboard structure), GAP-07

---

### TASK-10: Create `app.js`
- **Type**: [FILE]
- **Output**: `app.js`
- **Depends on**: TASK-01, TASK-02, TASK-07, TASK-09
- **Blocked by**: TASK-01, TASK-02, TASK-07, TASK-09
- **Description**: ES module orchestrator. Imports `filterColors` from `./lib/filter.js` and `{ hexToRgb, rgbToHsl, getContrastRatio, getSwatchTextColor }` from `./lib/colorUtils.js`. Constants: `CHUNK_SIZE = 50`, `DEBOUNCE_MS = 150`, `FALLBACK_COLORS` (embedded array of ≥ 5 entries). State variables: `let allColors = []`, `let currentGeneration = 0`. Named exports/functions:
  - `debounce(fn, ms)` — trailing-edge debounce
  - `setAppState(state)` — toggles loading/ready/error DOM state (DD-04); disables/enables controls
  - `normalise(raw)` — filters entries missing `name`, `hex`, or `family`; warns per dropped entry
  - `renderChunk(filtered, generation, offset)` — writes 50 swatches per rAF frame; aborts if generation stale (DD-03); applies `getSwatchTextColor` inline style per swatch; sets roving `tabindex` (DD-01)
  - `applyFilter()` — reads search + family, calls `filterColors`, increments `currentGeneration`, calls `renderChunk`, updates `aria-live`, shows/hides empty state
  - `openModal(color)` — populates modal fields using `textContent`; computes RGB, HSL, contrast ratios; traps focus; stores trigger element
  - `closeModal()` — closes modal, returns focus to trigger (DD-01)
  - `initApp()` — fetches `colors.v1.json`; on success normalises and renders; on failure loads fallback and shows banner; transitions state machine (DD-04); wires debounced search, family change, modal close, Escape key, swatch keyboard nav
  - `document.addEventListener('DOMContentLoaded', initApp)`
- **Satisfies**: All FR-01–FR-09, NFR-01 (perf), NFR-03 (a11y), NFR-05 (security), DD-01, DD-02, DD-03, DD-04, RISK-01, RISK-02, GAP-05, GAP-07, GAP-08

---

## Completion Checklist

| Task | File | Satisfies | Status |
|---|---|---|---|
| TASK-01 | `lib/colorUtils.js` | NFR-01, NFR-03, GAP-08, GAP-09 | [ ] |
| TASK-02 | `lib/filter.js` | FR-02, FR-03, FR-04, NFR-06 | [ ] |
| TASK-03 | `ci/test-colorUtils.js` | FR-11, AC-07 | [ ] |
| TASK-04 | `ci/test-filter.js` | FR-11, AC-07 | [ ] |
| TASK-05 | `package.json` | FR-10, FR-11, GAP-04 | [ ] |
| TASK-06 | `.github/workflows/ci.yml` | FR-12, AC-08, GAP-10 | [ ] |
| TASK-07 | `colors.v1.json` | FR-01, FR-03, DEP-01 | [ ] |
| TASK-08 | `styles.css` | NFR-02, NFR-03, GAP-02, GAP-03 | [ ] |
| TASK-09 | `index.html` | FR-01–03, FR-06, FR-07, NFR-03 | [ ] |
| TASK-10 | `app.js` | FR-01–09, NFR-01, NFR-03, NFR-05 | [ ] |
