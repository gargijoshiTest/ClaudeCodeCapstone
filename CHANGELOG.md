# Changelog

All notable changes to this project will be documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
