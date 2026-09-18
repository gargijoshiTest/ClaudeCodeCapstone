# Implementation Plan: Text Color Playground (TES-3)

_Generated: 2026-09-18_
_Based on: docs/TES-3/architecture.md, docs/TES-3/design-review.md_

---

## Execution Order

Tasks are listed in dependency order. Unblocked tasks at the same level can be worked in parallel.

### Wave 1 — Playground Styles (no source dependencies)

TASK-01: Create playground.css

### Wave 2 — New Orchestrator Module (depends on existing lib/)

TASK-02: Create lib/playground.js

### Wave 3 — Smoke Tests (depend on TASK-02)

TASK-03: Create ci/test-playground.js

### Wave 4 — HTML Shell (depends on TASK-01, TASK-02)

TASK-04: Create text-color-playground.html

### Wave 5 — Package Configuration (depends on TASK-03)

TASK-05: Update package.json test script

---

## Blocked Tasks

| Task | Blocked By | Reason |
|---|---|---|
| TASK-02 | TASK-01 | playground.js references CSS class names defined in playground.css (cross-ref only, not a hard import, but logically ordered) |
| TASK-03 | TASK-02 | smoke test imports lib/playground.js |
| TASK-04 | TASK-01, TASK-02 | HTML shell links playground.css and loads lib/playground.js |
| TASK-05 | TASK-03 | test script extension requires ci/test-playground.js to exist |

---

## Task Details

```
TASK-01: Create playground.css
  Type:         [FILE]
  Output:       playground.css
  Depends on:   none (references CSS custom properties from styles.css at runtime via <link>)
  Blocked by:   unblocked
  Description:  New CSS file containing all TES-3 playground-specific classes. Reuses :root design
                tokens (--bg, --surface, --border, --radius, --shadow, --text, --text-muted) declared
                in styles.css without duplicating them. Provides: two-column responsive grid layout
                (.playground-layout), combobox widget styles (.combobox-wrapper, .combobox-listbox,
                .combobox-option), preview area (.preview-area), info panel (.info-panel), contrast
                badge states (.contrast-badge, .contrast-pass, .contrast-fail), sample text controls,
                and background picker. All CSS transitions for TES-3 classes are scoped inside
                @media (prefers-reduced-motion: no-preference) per GAP-05 / DD. Breakpoint at
                max-width: 600px collapses to single-column, consistent with TES-2.
  Acceptance:   NFR-01 (reduced-motion), NFR-02 (responsiveness), AD-05, GAP-05
```

```
TASK-02: Create lib/playground.js
  Type:         [FILE]
  Output:       lib/playground.js
  Depends on:   lib/colorUtils.js (existing), lib/filter.js (existing)
  Blocked by:   unblocked
  Description:  New ES module (ES2020) orchestrator for the Text Color Playground. Implements:
                - Module-level state (DD-08): allColors[], selectedColor, currentBgHex='#FFFFFF'
                - FALLBACK_COLORS embedded array (EC-01)
                - normalise() — drops entries missing name/hex/family
                - debounce() — 150ms trailing-edge, re-exported for testability
                - buildRgbString(hex) — pure function, exported for CI tests
                - buildHslString(hex) — pure function, exported for CI tests
                - evalWcagAA(ratio) — returns ratio >= 4.5, exported for CI tests
                - populateCombobox(colors, query) — builds listbox <li> elements, capped at 50
                - applyColor(color) — sets style.color on preview, calls updateInfoPanel/updateContrast
                - updateInfoPanel(color) — sets Name/HEX/RGB/HSL via textContent (NFR-03 / RISK-02)
                - updateContrast(bgHex) — calls getContrastRatio, updates badge and WCAG AA status
                - copyHex() — navigator.clipboard.writeText with .catch(()=>{}) (GAP-04 / EC-02)
                - handleComboboxKeydown() — ArrowUp/Down/Enter/Escape keyboard nav (NFR-01)
                - initPlayground() — async, fetch+fallback+normalise, wires all event listeners
                DOM-deferral constraint (DD-10 / RISK-03): zero document.* or window.* calls at
                module top level. The DOMContentLoaded registration is guarded by
                `if (typeof document !== 'undefined')` so Node.js CI imports succeed without crash.
                fetch response.ok check before .json() (RISK-04).
  Acceptance:   FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12,
                FR-13, FR-14, NFR-01, NFR-03, NFR-04, AC-02 through AC-09,
                DD-08, DD-09, DD-10, RISK-02, RISK-03, RISK-04, GAP-01, GAP-04
```

```
TASK-03: Create ci/test-playground.js
  Type:         [FILE]
  Output:       ci/test-playground.js
  Depends on:   TASK-02 (lib/playground.js), lib/colorUtils.js (existing)
  Blocked by:   TASK-02
  Description:  Node.js smoke test file (no external test framework, consistent with TES-2 pattern).
                Uses node:assert/strict. Imports buildRgbString, buildHslString, evalWcagAA from
                lib/playground.js (pure functions with no DOM dependency). Imports getContrastRatio
                from lib/colorUtils.js. Tests:
                  1. buildRgbString('#DC143C') returns 'rgb(220, 20, 60)' (correct hex-to-RGB)
                  2. buildHslString('#DC143C') contains 'hsl(' prefix and valid format
                  3. evalWcagAA(4.5) === true  (boundary pass)
                  4. evalWcagAA(4.49) === false (boundary fail)
                  5. evalWcagAA(1) === false  (EC-04: same text/bg color)
                  6. getContrastRatio('#DC143C', '#FFFFFF') >= 4.0 (real contrast for Crimson)
                  7. evalWcagAA(getContrastRatio('#000000', '#FFFFFF')) === true (black-on-white)
                  8. evalWcagAA(getContrastRatio('#FFFFFF', '#FFFFFF')) === false (EC-04 same color)
  Acceptance:   FR-15, AC-10, RISK-03
```

```
TASK-04: Create text-color-playground.html
  Type:         [FILE]
  Output:       text-color-playground.html
  Depends on:   TASK-01 (playground.css), TASK-02 (lib/playground.js)
  Blocked by:   TASK-01, TASK-02
  Description:  Standalone HTML5 page shell. Links styles.css (design tokens + base classes) and
                playground.css (playground-specific layout). Loads lib/playground.js as
                `<script type="module">`. Does NOT modify index.html or app.js.
                Contains:
                  - #pg-offline-banner — hidden by default, shown on fallback (FR-13, AC-09)
                  - <header> with page title and nav link back to index.html
                  - ARIA combobox: <input id="pg-combobox-input" role="combobox" aria-expanded="false"
                    aria-autocomplete="list" aria-controls="pg-listbox" aria-label="Select a color">
                    wrapping <ul id="pg-listbox" role="listbox" hidden> (FR-03, NFR-01, GAP-02, AD-04)
                  - <textarea id="pg-sample-text"> with default pangram (ASM-02, FR-09, AC-06, AD-03)
                  - #pg-preview-area — preview container whose backgroundColor tracks the BG picker
                  - #pg-preview-text — inner div whose style.color tracks selected color (FR-04, FR-05)
                  - <dl class="info-panel"> — Name/HEX/RGB/HSL via dd elements with IDs
                    pg-info-name, pg-info-hex, pg-info-rgb, pg-info-hsl (FR-06, AC-04)
                  - Contrast section: #pg-contrast-ratio + #pg-contrast-badge + #pg-wcag-result
                    (FR-07, FR-08, AC-05)
                  - <input type="color" id="pg-bg-color" value="#FFFFFF"> — background picker
                    (FR-10, AC-07, AD-01)
                  - <button id="pg-btn-copy" class="btn btn-primary btn-copy-feedback">Copy HEX
                    (FR-11, FR-12, AC-08, EC-02)
                  - <div id="pg-aria-live" aria-live="polite" aria-atomic="true" class="sr-only">
                    (NFR-01, FR-12)
  Acceptance:   FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11,
                FR-12, FR-13, FR-14, NFR-01, NFR-02, NFR-03, AC-01 through AC-09,
                AD-01, AD-02, AD-03, AD-04, GAP-02
```

```
TASK-05: Update package.json test script
  Type:         [EDIT]
  Output:       package.json
  Depends on:   TASK-03 (ci/test-playground.js must exist)
  Blocked by:   TASK-03
  Description:  Extend the "test" script from:
                  "node ci/test-colorUtils.js && node ci/test-filter.js"
                to:
                  "node ci/test-colorUtils.js && node ci/test-filter.js && node ci/test-playground.js"
                No other changes to package.json.
  Acceptance:   FR-15, FR-16, AC-10, AC-11
```

---

## Completion Checklist

| Task | Satisfies |
|---|---|
| TASK-01 | NFR-01 (reduced-motion), NFR-02 (responsive layout), AD-05, GAP-05 |
| TASK-02 | FR-02..FR-14, NFR-01, NFR-03, NFR-04, AC-02..AC-09, DD-08, DD-09, DD-10, RISK-02..RISK-04, GAP-01, GAP-03, GAP-04 |
| TASK-03 | FR-15, AC-10, RISK-03 |
| TASK-04 | FR-01..FR-14, NFR-01..NFR-03, AC-01..AC-09, AD-01..AD-04, GAP-02 |
| TASK-05 | FR-15, FR-16, AC-10, AC-11 |

---

## Status

- [ ] TASK-01: Create playground.css
- [ ] TASK-02: Create lib/playground.js
- [ ] TASK-03: Create ci/test-playground.js
- [ ] TASK-04: Create text-color-playground.html
- [ ] TASK-05: Update package.json test script
