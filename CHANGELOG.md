# Changelog

All notable changes to this project will be documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — 2026-09-21

### Added
- `text-color-playground.html` — Text Color Playground page: ARIA combobox, sample text textarea, preview div, color info panel, contrast badge, background color picker, Copy HEX button (TES-3, TASK-04)
- `lib/playground.js` — Text Color Playground ES module orchestrator: applyColor, updateInfoPanel, updateContrast, evalWcagAA, copyHex, populateCombobox, debounce, offline fallback (TES-3, TASK-02)
- `playground.css` — Playground-specific styles: responsive two-column grid, combobox widget, contrast badge; all transitions scoped in `@media (prefers-reduced-motion: no-preference)` (TASK-01, GAP-05)
- `ci/test-playground.js` — 19 unit assertions: buildRgbString, buildHslString, evalWcagAA, getContrastRatio, debounce (TES-3, TASK-03)
- `tests/e2e/playground.spec.js` — 39 Playwright E2E tests covering AC-01..11, NFR-01, NFR-02, EC-03, EC-04 (TES-3)
- `docs/TES-3/requirements.md` — FR-01..16, NFR-01..06, AC-01..11, EC-01..04, OQ-01..05 from JIRA TES-3
- `docs/TES-3/architecture.md` — Zero-dependency SPA extension design; Mermaid diagrams; AD-01..10 decisions
- `docs/TES-3/design-review.md` — 9 findings accepted (RISK-01..04, GAP-01..05); DD-08..10 agreed
- `docs/TES-3/impl-plan.md` — 5-task Wave 1–5 plan; all tasks complete
- `docs/TES-3/code-review.md` — Verdict APPROVED WITH CONDITIONS; 6 fixes applied; 3 NITs skipped (R-07, R-08, R-09)
- `docs/TES-3/qa-report.md` — QA verdict PASS; 64 total tests pass; all 11 ACs covered

### Changed
- `package.json` — Extended `test` script to include `node ci/test-playground.js`; pinned `@playwright/test` to exact version `1.63.0` (R-04)

### Fixed
- `lib/playground.js` — Extracted `setField(id, value)` helper in `updateInfoPanel` to eliminate four repetitive null-checked assignments (R-01)
- `lib/playground.js` — Extended `updateInfoPanel` guard to check `typeof color.name` in addition to `color.hex` (R-05)
- `ci/test-playground.js` — Added lowercase hex test for `buildRgbString('#dc143c')` (R-02)
- `ci/test-playground.js` — Tightened Crimson contrast assertion from `> 0` to `>= 4.5 && <= 7` to detect formula regressions (R-06)

### Testing
- Added `tests/e2e/playground.spec.js` — 39 Playwright E2E tests covering all TES-3 acceptance criteria
- Added `ci/test-playground.js` — 19 unit assertions for pure playground functions
- Total: 61 Playwright tests pass (39 TES-3 + 22 TES-2 regression); all 3 unit test files pass

---

## [Unreleased] — 2026-09-15

### Added
- `lib/colorUtils.js` — WCAG relative luminance, HEX→RGB→HSL conversion, contrast ratio, swatch text colour selection
- `lib/filter.js` — case-insensitive partial-match color filter engine
- `ci/test-colorUtils.js` — Node unit tests for colorUtils (8 assertions)
- `ci/test-filter.js` — Node unit tests for filterColors (7 assertions)
- `tests/e2e/app.spec.js` — 22 Playwright E2E tests covering all acceptance criteria
- `playwright.config.js` — Playwright config targeting Chromium with auto-started http-server
- `colors.v1.json` — 24-color seed dataset across 7 families (Red, Orange, Yellow, Green, Blue, Purple, Neutral)
- `index.html` — SPA shell with ARIA listbox, live region, loading state, empty state, and details dialog
- `styles.css` — Responsive flex layout, loading spinner, modal overlay, offline banner, WCAG focus styles
- `app.js` — ES module orchestrator: chunked rendering (50/rAF), 150ms debounce, roving tabindex, state machine, fallback data
- `package.json` — `serve` (CSP-enabled http-server) and `test` scripts; `@playwright/test` dev dependency
- `package-lock.json` — Reproducible dependency lockfile
- `.gitignore` — Excludes `node_modules/`, `test-results/`, `playwright-report/`, `.claude/settings.json`
- `.claude/agents/` — 7 reusable SDLC agents: requirementEngineer, solutionArchitect, designReviewer, Developer, CodeReviewer, qaEngineer, PRCreator
- `docs/requirements.md` — FR-01–12, NFR-01–06, AC-01–08, EC-01–04 from JIRA TES-2
- `docs/architecture.md` — Zero-dependency SPA architecture with Mermaid diagrams and NFR decisions
- `docs/design-review.md` — 15 design-review findings (all accepted), DD-01–DD-04 agreed decisions
- `docs/impl-plan.md` — 10-task dependency-ordered implementation plan across 6 waves
- `docs/qa-report.md` — QA report: 22/22 E2E tests pass, all ACs covered, QA verdict APPROVED WITH CONDITIONS

### Changed
- `.github/workflows/ci.yml` — Added `e2e-tests` job running Playwright on every PR; uploads report artifact on failure

### Fixed
- `app.js` — `normalise()` now guards against non-array JSON responses (`Array.isArray` check) preventing a `TypeError` crash when `colors.v1.json` returns a non-array value (Code Review R-02)
- `app.js` — Swatch `keydown` handler now calls `e.preventDefault()` on Enter, preventing the browser from continuing the key sequence to the newly-focused close button and immediately closing the modal (QA defect QA-01)
- `styles.css` — Added `#loading-state[hidden] { display: none }` so the `hidden` HTML attribute correctly overrides the element's `display: flex` declaration; loading spinner no longer persists after data loads
