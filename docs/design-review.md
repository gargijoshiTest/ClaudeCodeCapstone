# Design Review: Color Palette Explorer

_Reviewed: 2026-09-15_
_Reviewer: designReviewer agent (Senior Reviewer perspective)_
_Documents reviewed: docs/architecture.md, docs/requirements.md_

---

## Review Summary

| Dimension | Findings | Accepted | Rejected | Deferred |
|---|---|---|---|---|
| Requirements Traceability | 1 | 1 | 0 | 0 |
| Component Design | 3 | 3 | 0 | 0 |
| Data Flow & State | 2 | 2 | 0 | 0 |
| Security | 2 | 2 | 0 | 0 |
| Performance | 1 | 1 | 0 | 0 |
| Accessibility | 3 | 3 | 0 | 0 |
| Error Handling | 1 | 1 | 0 | 0 |
| Testability & CI | 2 | 2 | 0 | 0 |
| **Total** | **15** | **15** | **0** | **0** |

**Overall verdict:** APPROVED WITH CONDITIONS — all findings accepted; architecture.md updated before coding begins.

---

## Accepted Findings

### GAP-01: NFR-01 Performance partially untraced
- **Severity**: GAP
- **Dimension**: Requirements Traceability
- **Finding**: Debounce handler was listed in the NFR decisions table but absent from the component diagram and component table, leaving NFR-01 (p95 ≤ 100ms) partially untraced.
- **Agreed resolution**: Add `debounce()` utility with constant `DEBOUNCE_MS = 150` to the component table and reference it in the NFR decisions row for Performance.
- **Architecture change required**: YES

---

### GAP-02: Empty-state UI not in diagram
- **Severity**: GAP
- **Dimension**: Component Design
- **Finding**: EC-02 requires an empty-state message when filters yield zero results. No corresponding component or element was present in the diagram or component table.
- **Agreed resolution**: Add an "Empty State" element to `index.html` (hidden by default); `app.js` shows it when the filtered array is empty.
- **Architecture change required**: YES

---

### GAP-03: Loading state undefined
- **Severity**: GAP
- **Dimension**: Component Design
- **Finding**: No loading indicator defined for the interval between page load and first swatch render. Designers could mistake a blank screen for a broken app.
- **Agreed resolution**: Add a loading state (spinner or skeleton) to `index.html`, hidden after the first chunk renders.
- **Architecture change required**: YES

---

### DECISION-NEEDED-01: `app.js` internal structure unspecified
- **Severity**: DECISION-NEEDED
- **Dimension**: Component Design
- **Finding**: `app.js` was responsible for 7+ concerns with no structure specified, risking inconsistent implementation.
- **Agreed resolution**: ES module with named exported functions (`initApp`, `renderChunk`, `openModal`, `applyFilter`, etc.). `app.js` acts as orchestrator — each concern is a named, independently readable export.
- **Architecture change required**: YES

---

### RISK-01: Race condition — user interacts before fetch completes
- **Severity**: RISK
- **Dimension**: Data Flow & State
- **Finding**: Filter controls were active immediately on page load. If a user typed before `colors.v1.json` resolved, `filter.js` would run against an empty array and show zero results.
- **Agreed resolution**: Disable filter controls until dataset is ready. App state machine: `loading → ready | error`. Controls enabled only in `ready` state.
- **Architecture change required**: YES

---

### RISK-02: Stale chunks during rapid re-filter
- **Severity**: RISK
- **Dimension**: Data Flow & State
- **Finding**: Chunked rendering via `requestAnimationFrame` spans multiple frames. Rapid user input could cause old render loops to append stale swatches to a newly-filtered list.
- **Agreed resolution**: Assign each render job a generation ID. Each `requestAnimationFrame` callback checks if its generation matches the current generation; if not, it aborts. Document as a named pattern in architecture.
- **Architecture change required**: YES

---

### GAP-04: No Content Security Policy specified
- **Severity**: GAP
- **Dimension**: Security
- **Finding**: Architecture mentioned DOM sanitisation but not CSP. `http-server` supports `--header` flags enabling CSP at dev serve time.
- **Agreed resolution**: Add `--header "Content-Security-Policy: default-src 'self'"` to the `serve` script in `package.json`. Document in technology choices.
- **Architecture change required**: YES

---

### GAP-05: No JSON schema validation before rendering
- **Severity**: GAP
- **Dimension**: Security / Error Handling
- **Finding**: The architecture handled fetch failure but not malformed entries in a successfully-parsed JSON (missing `hex`, `null` name). `app.js` could render `undefined` or crash silently.
- **Agreed resolution**: Add a normalisation step in `app.js` after fetch: filter out entries missing required fields (`name`, `hex`, `family`); log a `console.warn` per dropped entry.
- **Architecture change required**: YES

---

### GAP-06: Chunk size and debounce delay not specified
- **Severity**: GAP
- **Dimension**: Performance
- **Finding**: Architecture stated chunked rendering and debounce without concrete values, leaving the p95 ≤ 100ms target unverifiable at design time.
- **Agreed resolution**: Specify: chunk size = **50 items per `requestAnimationFrame`**; debounce = **150ms, trailing edge**.
- **Architecture change required**: YES

---

### RISK-03: Keyboard navigation pattern undefined — WCAG SC 2.1.1 at risk
- **Severity**: RISK
- **Dimension**: Accessibility
- **Finding**: `OAQ-02` deferred keyboard nav, but WCAG 2.1 AA SC 2.1.1 is a hard requirement. Without a spec, compliance cannot be verified before coding.
- **Agreed resolution**: Swatch container uses `role="listbox"` with roving `tabindex` pattern (arrow-key navigation). Enter opens modal. Escape closes modal. Document as DD-01.
- **Architecture change required**: YES

---

### GAP-07: `aria-live` region content and trigger not specified
- **Severity**: GAP
- **Dimension**: Accessibility
- **Finding**: Architecture named an `aria-live` region but did not specify announcement text or trigger timing, risking over- or under-announcement.
- **Agreed resolution**: Announcement text: `"Showing {n} of {total} colors"`. Triggered once per debounce resolution, not on every keystroke.
- **Architecture change required**: YES

---

### GAP-08: Swatch text contrast against swatch background unaddressed
- **Severity**: GAP
- **Dimension**: Accessibility
- **Finding**: Color name and HEX text rendered on top of the swatch's own color. Very light or very dark swatches would fail WCAG 2.1 AA 4.5:1 text contrast.
- **Agreed resolution**: `app.js` computes relative luminance of each swatch color; applies `color: #000000` if luminance > 0.179, otherwise `color: #ffffff`. Document in component responsibilities.
- **Architecture change required**: YES

---

### RISK-04: Malformed `colors.v1.json` entries not handled
- **Severity**: RISK
- **Dimension**: Error Handling
- **Finding**: Fetch failure was handled (EC-01) but not a valid JSON file containing malformed entries. Mid-render crash or `undefined` in DOM was possible.
- **Agreed resolution**: Addressed by GAP-05 normalisation step.
- **Architecture change required**: YES (same change as GAP-05)

---

### GAP-09: Color math is untestable as currently placed
- **Severity**: GAP
- **Dimension**: Testability & CI
- **Finding**: HEX→RGB→HSL and contrast ratio are pure functions embedded in `app.js`. They cannot be unit-tested independently.
- **Agreed resolution**: Extract to `lib/colorUtils.js`. Add `ci/test-colorUtils.js` smoke test. CI runs both test files.
- **Architecture change required**: YES

---

### GAP-10: Node.js version not pinned in CI
- **Severity**: GAP
- **Dimension**: Testability & CI
- **Finding**: No Node.js version specified for the GitHub Actions CI workflow. Floating to latest risks non-reproducible failures.
- **Agreed resolution**: Pin to **Node.js 20 LTS** in the CI workflow spec.
- **Architecture change required**: YES

---

## Agreed Design Decisions

- **DD-01**: Swatch list keyboard navigation uses `role="listbox"` with roving `tabindex` (arrow keys navigate, Enter opens details, Escape closes modal). Rationale: standard accessible listbox pattern satisfying WCAG 2.1 AA SC 2.1.1.
- **DD-02**: `app.js` structured as ES module with named exports (`initApp`, `renderChunk`, `openModal`, `applyFilter`). Rationale: each concern is independently readable and the orchestrator pattern prevents the file becoming a monolithic script.
- **DD-03**: Chunked rendering uses a generation ID to cancel stale render loops on re-filter. Rationale: prevents stale swatch append during rapid input without requiring full DOM clear on every keystroke.
- **DD-04**: App state machine: `loading → ready | error`. Filter controls disabled until state is `ready`. Rationale: eliminates race condition between fetch and user interaction.

---

## Architecture Changes Required

- [x] Add `lib/colorUtils.js` to component diagram and table
- [x] Add `ci/test-colorUtils.js` to component diagram and table
- [x] Add Empty State element to component table
- [x] Add Loading State element to component table
- [x] Add `debounce()` utility with `DEBOUNCE_MS = 150` to component table
- [x] Specify `app.js` structure as ES module with named exports
- [x] Update data flow (sequence diagram) with: loading state guard, JSON normalisation step, generation ID for chunked render
- [x] Add CSP header to `serve` script in technology choices table
- [x] Update NFR decisions table: chunk size = 50 items, debounce = 150ms, keyboard nav pattern, aria-live spec, swatch text contrast logic
- [x] Pin Node.js 20 LTS in CI spec
- [x] Resolve OAQ-02 (keyboard nav now decided as DD-01)
