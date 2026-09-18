# Code Review: Text Color Playground (TES-3)

_Reviewed: 2026-09-18_
_Reviewer: CodeReviewer agent (Peer Reviewer perspective)_
_Files reviewed: `text-color-playground.html`, `lib/playground.js`, `ci/test-playground.js`, `playground.css`, `package.json`, `.github/workflows/ci.yml`_

---

## Review Summary

| Dimension | Findings | Fixed | Skipped |
|---|---|---|---|
| Correctness | 1 | 1 | 0 |
| Security | 0 | 0 | 0 |
| Error Handling | 1 | 1 | 0 |
| Test Coverage | 3 | 2 | 1 |
| Code Clarity | 1 | 0 | 1 |
| DRY Principle | 2 | 1 | 1 |
| Dependency Safety | 1 | 1 | 0 |
| **Total** | **9** | **6** | **3** |

**PR verdict:** APPROVED WITH CONDITIONS

_No BLOCKERs. No MAJORs. All MINORs resolved. Three NITs skipped with documented reasons below._

---

## Findings

### R-01 — `updateInfoPanel` has four repetitive null-checked assignments
- **Severity**: MINOR
- **Dimension**: DRY Principle
- **Location**: `lib/playground.js:216`
- **Finding**: Four near-identical `if (el) el.textContent = value` lines for name/hex/rgb/hsl with no shared abstraction.
- **Resolution**: Fixed — extracted `setField(id, value)` private helper; `updateInfoPanel` now uses it for all four fields, reducing repetition to one call per field.

---

### R-02 — `buildRgbString` not tested with lowercase hex input
- **Severity**: MINOR
- **Dimension**: Test Coverage
- **Location**: `ci/test-playground.js:19`
- **Finding**: All `buildRgbString` tests used uppercase hex (`#DC143C`, `#FFFFFF`, `#000000`). If the underlying `hexToRgb` utility is case-sensitive, lowercase input would fail silently with no CI signal.
- **Resolution**: Fixed — added `equal(buildRgbString('#dc143c'), 'rgb(220, 20, 60)', 'lowercase hex works')` after the uppercase tests.

---

### R-03 — `playground.css` created as separate file, deviating from AD-05
- **Severity**: MINOR
- **Dimension**: Correctness (architecture conformance)
- **Location**: `text-color-playground.html:10`, `playground.css`
- **Finding**: Architecture AD-05 and the file inventory specified "styles.css extended — additive only" with "single stylesheet reference per page". The implementation adds a second `<link>` tag pointing to a new `playground.css`. Functionally correct (CSS custom properties from `styles.css` cascade normally), but inconsistent with the decision record.
- **Resolution**: Fixed — updated `docs/TES-3/architecture.md`: file inventory now lists `playground.css` as NEW; AD-05 updated to document the rationale (TES-3 implementation constraint forbids modifying TES-2 files; separate file achieves the same token-reuse outcome without touching `styles.css`); Section 5 Styling row updated accordingly.

---

### R-04 — `@playwright/test` not pinned to exact version
- **Severity**: MINOR
- **Dimension**: Dependency Safety
- **Location**: `package.json:7`
- **Finding**: `"@playwright/test": "^1.63.0"` — the caret prefix allows minor and patch updates on `npm install`, introducing a supply-chain risk where a future Playwright release could silently change E2E test behaviour.
- **Resolution**: Fixed — changed to `"@playwright/test": "1.63.0"` (no prefix).

---

### R-05 — `updateInfoPanel` guard checks `hex` but not `name`
- **Severity**: NIT
- **Dimension**: Error Handling
- **Location**: `lib/playground.js:217`
- **Finding**: Guard was `if (!color || typeof color.hex !== 'string') return`. A color object with a valid `hex` but `undefined` name would pass the guard and write the string `"undefined"` into the Name field. This cannot occur with normalised data (normalise enforces `typeof name === 'string'`) but the guard was asymmetric.
- **Resolution**: Fixed — guard extended to `if (!color || typeof color.hex !== 'string' || typeof color.name !== 'string') return` (applied as part of R-01 edit).

---

### R-06 — Crimson contrast assertion was trivially true
- **Severity**: NIT
- **Dimension**: Test Coverage
- **Location**: `ci/test-playground.js:77`
- **Finding**: `ok(crimsonOnWhite > 0, ...)` passes for any non-negative contrast value and does not detect a regression in the contrast calculation formula.
- **Resolution**: Fixed — changed to `ok(crimsonOnWhite >= 4.5 && crimsonOnWhite <= 7, ...)`. Crimson (#DC143C) on white is expected to be ~5.1:1 (WCAG AA pass); this range catches formula regressions while tolerating floating-point variance.

---

### R-07 — `normalise()` has no direct test coverage
- **Severity**: NIT
- **Dimension**: Test Coverage
- **Location**: `lib/playground.js:83`
- **Finding**: `normalise()` is not exported and is only exercised at runtime via `initPlayground()`. Edge cases (null entry, non-array input, missing-field entries) are handled in code but never asserted in CI.
- **Resolution**: Skipped — see Skipped Findings table. Exporting an internal normalise solely for testing would change the module's public API. The function is exercised end-to-end when playground smoke tests import the module, and the inline `console.warn` provides runtime observability. Recommend revisiting if a third page reuses the data-loading pattern (per OAQ-01).

---

### R-08 — `calledFromBg` boolean parameter not self-documenting at call sites
- **Severity**: NIT
- **Dimension**: Code Clarity
- **Location**: `lib/playground.js:234`
- **Finding**: At call sites, `updateContrast(currentBgHex)` and `updateContrast(e.target.value, true)` do not reveal that the second argument changes the aria-live announcement phrasing. A string discriminant (`'color'` / `'bg'`) or a named object parameter would be clearer.
- **Resolution**: Skipped — see Skipped Findings table. The function has a JSDoc block comment immediately above it documenting the flag's two cases, and both call sites also carry inline comments. The cognitive overhead is low for a two-branch announcement string.

---

## Skipped Findings

| Finding | Reason |
|---|---|
| R-07 `normalise()` untested | Exporting an internal function solely for testing changes the module's public API. The function is covered by integration through `initPlayground`. Recommend exporting if a shared `lib/dataLoader.js` is extracted (OAQ-01). |
| R-08 `calledFromBg` flag | Low cognitive overhead; both the function definition and call sites carry explanatory comments. Would require a minor API change (parameter rename or object param). |
| R-09 Repeated DOM queries across functions | Caching element references after `initPlayground` would improve code DRY but the refactor scope (adding module-level state, restructuring all helper functions) exceeds the finding's impact. All DOM queries are in interactive-frequency handlers where per-call `getElementById` has negligible performance cost. |

---

## PR Readiness Checklist

- [x] All BLOCKERs resolved
- [x] All MAJORs resolved or explicitly accepted _(no MAJORs found)_
- [x] `npm test` passes
- [x] No secrets in tracked files
- [x] `docs/TES-3/code-review.md` committed
