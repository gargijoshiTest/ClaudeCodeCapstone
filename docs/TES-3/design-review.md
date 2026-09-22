# Design Review: Text Color Playground (TES-3)

_Reviewed: 2026-09-18_
_Reviewer: designReviewer agent (Senior Reviewer perspective)_
_Documents reviewed: docs/TES-3/architecture.md, docs/TES-3/requirements.md_
_Also consulted: docs/architecture.md (TES-2), index.html, app.js, styles.css, lib/colorUtils.js, lib/filter.js_

---

## Review Summary

| Dimension | Findings | Accepted | Rejected | Deferred |
|---|---|---|---|---|
| Requirements Traceability | 0 | 0 | 0 | 0 |
| Component Design | 0 | 0 | 0 | 0 |
| Data Flow & State | 2 | 2 | 0 | 0 |
| Security | 1 | 1 | 0 | 0 |
| Performance | 1 | 1 | 0 | 0 |
| Accessibility | 2 | 2 | 0 | 0 |
| Error Handling | 2 | 2 | 0 | 0 |
| Testability & CI | 1 | 1 | 0 | 0 |
| **Total** | **9** | **9** | **0** | **0** |

**Overall verdict:** APPROVED WITH CONDITIONS — all 9 findings are accepted and resolved below; architecture.md has been updated before development begins.

---

## Dimension Notes

### Requirements Traceability — No findings

Every Functional Requirement (FR-01 through FR-16) maps to a named component or function in the architecture. Every NFR (NFR-01 through NFR-06) has a corresponding architectural decision in Section 7. All open questions (OQ-01 through OQ-05) are either resolved as architectural decisions (AD-01 through AD-07) or explicitly deferred out of scope. No requirements are silently dropped.

### Component Design — No findings

Component responsibilities are clearly bounded. `playground.js` as a single orchestrator follows the identical pattern established by TES-2's `app.js` and is appropriate for a zero-dependency prototype of this scale. No missing components were identified.

---

## Accepted Findings (actioned)

### RISK-01: Sequence diagram bypasses playground.js for combobox input event

- **Severity**: RISK
- **Dimension**: Data Flow & State
- **Finding**: The Section 6 sequence diagram step "HTML->>Filter: filterColors(allColors, typedQuery, 'All')" is architecturally incorrect. HTML markup cannot invoke a JavaScript function. The input event handler must be wired by `playground.js`, which then delegates to `lib/filter.js`. This ambiguity could lead a developer to use an inline `onkeyup` attribute directly calling `filterColors`, breaking module encapsulation.
- **Agreed resolution**: Correct the sequence diagram to route the combobox input event through `PG` first (HTML→PG input event → PG calls Filter → Filter returns to PG → PG updates listbox). Also correct flow description step 5 to match.
- **Architecture change required**: YES

---

### RISK-02: Info panel DOM rendering method not specified as textContent-only

- **Severity**: RISK
- **Dimension**: Security
- **Finding**: NFR-03 Security explicitly covers: sample text via `textContent`, selected HEX via `style.color`, and background color via `<input type="color">`. It does not specify how Color Name, HEX, RGB, and HSL values are injected into the info panel `<dl>`. A developer using `innerHTML` for the info panel would create an XSS vector if `colors.v1.json` contains malicious HTML in a color name field.
- **Agreed resolution**: Extend NFR-03 Security to explicitly state that all JSON-derived text in the info panel (Name, HEX, RGB, HSL) is injected via `textContent` (never `innerHTML`), consistent with the rest of the security policy.
- **Architecture change required**: YES

---

### RISK-03: ci/test-playground.js imports lib/playground.js — top-level DOM access would crash Node.js

- **Severity**: RISK
- **Dimension**: Testability & CI
- **Finding**: The component diagram shows `TestPG -->|import| PG`. TES-2's `app.js` carries `document.addEventListener('DOMContentLoaded', initApp)` at module top level; if `playground.js` follows the same pattern, Node.js will throw `ReferenceError: document is not defined` when the test file imports it. TES-2 avoided this by testing only the pure `lib/` modules — TES-3 breaks that invariant by importing the orchestrator.
- **Agreed resolution**: Mandate in Section 4 (NFR-06 Maintainability) that `playground.js` defers all DOM access to function bodies. No `document.*` or `window.*` calls are permitted at module top level. The `DOMContentLoaded` listener registration and all `getElementById` calls are inside `initPlayground()`.
- **Architecture change required**: YES

---

### RISK-04: Fetch fallback path does not specify an HTTP response.ok check

- **Severity**: RISK
- **Dimension**: Error Handling
- **Finding**: The data flow covers "Fetch fails (network / file://)" but not HTTP non-2xx responses. `fetch()` resolves (not rejects) for 404 and 500 responses; without an explicit `if (!res.ok) throw` guard, a 404 would proceed to `res.json()`, which would throw a JSON parse error. Whether that error is caught by the surrounding `try/catch` depends on whether `.json()` is awaited in the same block — a subtle dependency that should not be left to the developer's discretion.
- **Agreed resolution**: Explicitly add a `response.ok` check to the data flow: if `!res.ok`, throw an error to trigger the same fallback path as a network failure. This is consistent with TES-2's `app.js` pattern.
- **Architecture change required**: YES

---

### GAP-01: Module-level state variables in playground.js not defined

- **Severity**: GAP
- **Dimension**: Data Flow & State
- **Finding**: Section 4 describes function names but never specifies what state lives at module scope in `playground.js`. Without this, two developers could independently choose different state shapes (e.g., a `currentState` object vs. individual variables), making the module difficult to reason about and test.
- **Agreed resolution**: Enumerate module-level state variables in Section 4 Key Components: `allColors` (array, normalised color dataset), `selectedColor` (object | null, the currently selected color entry), `currentBgHex` (string, default `'#FFFFFF'`).
- **Architecture change required**: YES

---

### GAP-02: ARIA combobox specification omits aria-controls attribute

- **Severity**: GAP
- **Dimension**: Accessibility
- **Finding**: The ARIA 1.1 combobox authoring pattern requires the `<input>` element to carry `aria-controls="<listbox-id>"` pointing to the element with `role="listbox"`. Without this attribute, screen readers such as NVDA and JAWS do not reliably announce the popup listbox as being controlled by the input. The NFR-01 attribute list (`role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-activedescendant`) omits this required relationship attribute.
- **Agreed resolution**: Add `aria-controls="<listbox-id>"` to the ARIA combobox attribute specification in NFR-01.
- **Architecture change required**: YES

---

### GAP-03: No debounce specified for combobox search; justification unsupported

- **Severity**: GAP
- **Dimension**: Performance
- **Finding**: NFR-04 asserts "no debounce needed" and "combobox list renders at most the full dataset size (~hundreds of items) — well within instantaneous threshold." This contradicts TES-2's own conclusion that ~hundreds of DOM items require chunked rendering with `requestAnimationFrame`. Rendering all matching `role="option"` nodes on every keypress without debounce risks perceptible jank on mid-range devices when the query is short (e.g., a single character matches 400+ colors).
- **Agreed resolution**: Specify a 150ms trailing-edge debounce for the combobox input handler (same as TES-2 search input), and cap the visible listbox to a maximum of 50 rendered options at a time (showing best matches). Update NFR-04 accordingly.
- **Architecture change required**: YES

---

### GAP-04: EC-02 clipboard failure handling covers only "API unavailable"; promise rejection unaddressed

- **Severity**: GAP
- **Dimension**: Error Handling
- **Finding**: The data flow EC-02 branch is labelled "Clipboard API unavailable". However, `navigator.clipboard.writeText()` returns a `Promise` that can also reject when the API exists but browser clipboard permissions are denied (e.g., an HTTPS page where the user dismissed the permission prompt). Without an explicit `.catch(() => {})`, this rejection is an unhandled promise rejection, which surfaces as a console error and in some environments triggers the global `unhandledrejection` event.
- **Agreed resolution**: Specify that `copyHex` in `playground.js` attaches `.catch(() => {})` to the `writeText()` call, silently swallowing both API absence (via an `if` guard) and permission-denied rejections. No user feedback is given on failure, consistent with TES-2's pattern.
- **Architecture change required**: YES

---

### GAP-05: Reduced-motion support not addressed for TES-3 CSS additions

- **Severity**: GAP
- **Dimension**: Accessibility
- **Finding**: `styles.css` already includes `@media (prefers-reduced-motion: reduce)` for the TES-2 loading spinner. TES-3 introduces new CSS classes that will include transitions: at minimum, a visual feedback transition on the "Copied!" button state change and potentially a transition on the contrast badge (pass/fail indicator). These transitions must respect `prefers-reduced-motion`, consistent with the existing pattern.
- **Agreed resolution**: All CSS transitions added to `styles.css` for TES-3 playground classes must be scoped inside `@media (prefers-reduced-motion: no-preference)` blocks. Document this requirement in NFR-01 (Accessibility).
- **Architecture change required**: YES

---

## Rejected Findings

None.

---

## Deferred Items

None.

---

## Agreed Design Decisions

- **DD-08**: `playground.js` state shape — `allColors: []`, `selectedColor: null | ColorObject`, `currentBgHex: '#FFFFFF'` as module-level variables — rationale: consistent with TES-2's pattern (`allColors`, `currentGeneration` at module scope) and makes state readable to future maintainers.
- **DD-09**: Combobox input debounced at 150ms trailing edge, listbox capped at 50 rendered options — rationale: prevents per-keystroke full-dataset DOM repopulation; consistent with TES-2 debounce constant; 50-option visible cap follows TES-2 chunk size as a UX and performance precedent.
- **DD-10**: All DOM access in `playground.js` is deferred to function bodies (no top-level DOM calls) — rationale: allows Node.js to import the module for CI smoke tests without a DOM environment.

---

## Architecture Changes Required

- [x] RISK-01: Correct Section 6 sequence diagram — route combobox input event through PG before Filter; update flow description step 5
- [x] RISK-02: Extend NFR-03 Security — add info panel `textContent` specification
- [x] RISK-03: Add DOM-deferral constraint to Section 4 (playground.js entry) and NFR-06
- [x] RISK-04: Add `response.ok` check to Section 6 data flow (sequence diagram alt condition and flow description step 2)
- [x] GAP-01: Add module-level state variable specification to Section 4 (playground.js entry)
- [x] GAP-02: Add `aria-controls` to NFR-01 ARIA combobox attribute list
- [x] GAP-03: Replace "no debounce needed" with 150ms debounce + 50-option cap in NFR-04
- [x] GAP-04: Specify `.catch(() => {})` for clipboard in Section 6 EC-02 branch and Section 4
- [x] GAP-05: Add reduced-motion requirement for TES-3 CSS transitions in NFR-01
