---
name: ArchitectureGuidelines
description: Core stack rules, architectural patterns, and engineering standards for this project. Read before proposing or reviewing architecture, writing code, or raising a PR.
whenToUse: Read at the start of solutionArchitect, designReviewer, developer, and codeReviewer phases. Every technology choice and code pattern must be justifiable against these guidelines.
---

# Architecture Guidelines

This skill defines the **binding technical standards** for this project. Every agent that touches architecture, code, or review must enforce these rules. Deviations require explicit user sign-off and must be documented as a DD-XX in `docs/design-review.md`.

---

## 1. Architectural Style

| Concern | Standard |
|---|---|
| Frontend | **Vanilla HTML/CSS/ES Modules** (no build step required unless agreed) |
| Module system | **ES Modules** (`import`/`export`) — no CommonJS `require()` in browser code |
| State management | **Single source of truth** in `app.js` — no implicit global mutable state |
| Component pattern | **Single Responsibility** — each file owns exactly one concern |
| Data flow | **Unidirectional** — data flows down, events flow up; never both in the same function |

> **If the project adopts a framework** (e.g. React, Next.js App Router), that decision must be documented as a DD-XX in `docs/design-review.md` before any framework-specific code is written.

---

## 2. File & Module Conventions

```
project/
├── lib/           # Pure utility functions — no DOM access, no side effects
│   ├── colorUtils.js
│   └── filter.js
├── ci/            # Node-based unit tests — no browser globals
│   ├── test-colorUtils.js
│   └── test-filter.js
├── tests/
│   └── e2e/       # Playwright browser tests only
├── .github/
│   └── workflows/
│       └── ci.yml
├── styles.css     # All styles — no inline style attributes in HTML
├── index.html     # App shell — no logic, only markup + <script type="module">
├── app.js         # App orchestrator — wires lib/ modules to the DOM
└── colors.v1.json # Data file — never embedded inline in JS
```

Rules:
- `lib/` files must be **pure functions with no side effects** — importable in Node without a DOM.
- `app.js` must not contain business logic — delegate to `lib/`.
- Test files in `ci/` must run with `node` only — no test runner required.

---

## 3. Code Style

| Rule | Standard |
|---|---|
| Language | **JavaScript ES2022+** or TypeScript strict mode if agreed |
| Semicolons | Required |
| Quotes | Single quotes for JS strings |
| Indentation | 2 spaces |
| Max line length | 100 characters |
| `const` vs `let` | Prefer `const`; use `let` only when reassignment is required |
| Arrow functions | Preferred for callbacks; named functions for exported symbols |
| `async/await` | Preferred over raw Promises |

---

## 4. Security Standards (Mandatory)

These are non-negotiable. Any violation is a **BLOCKER** in code review.

| Rule | Enforcement |
|---|---|
| No `innerHTML` with data-derived values | Use `textContent`, `setAttribute`, or DOM API only |
| No `eval()`, `new Function()`, `document.write()` | Zero tolerance |
| No hard-coded credentials or API keys | Check before every commit |
| Clipboard API only on user gesture | Inside click handler only — never on load |
| Content Security Policy header | Must be set in the `serve` npm script |
| JSON data normalised before render | Always validate type and structure before DOM write |

---

## 5. Error Handling Policy

```
Every async operation must have explicit error handling.
No unhandled promise rejections.
No silent catch blocks (catch blocks must log or surface the error).
```

Pattern for fetch:
```javascript
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // ... use data
} catch (err) {
  // Surface to UI — never swallow
  showErrorState(err.message);
}
```

---

## 6. Performance Standards

| NFR | Standard |
|---|---|
| Filter response time | ≤ 100ms p95 for datasets up to 1,000 entries |
| Debounce delay | 150ms trailing-edge on search input |
| Chunk size | 50 swatches per `requestAnimationFrame` chunk |
| Generation ID | Increment before each re-render; abort stale renders |
| DOM queries | Cache `getElementById` results — never query in a loop |

---

## 7. Accessibility Standards (WCAG 2.1 AA)

| Element | Requirement |
|---|---|
| Swatch list | `role="listbox"` |
| Each swatch | `role="option"`, `aria-label="<name> <hex>"` |
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Modal focus trap | Focus must cycle inside modal while open |
| Focus return | On modal close, focus returns to the trigger swatch |
| Keyboard nav | Arrow keys navigate swatches; Enter opens modal; Escape closes |
| `aria-live` | Update after every filter — text: `"Showing N of T colors"` |
| Loading state | `aria-busy="true"` on container while loading |
| Reduced motion | Honour `prefers-reduced-motion` for any transitions |

---

## 8. Testing Standards

| Layer | Minimum |
|---|---|
| Pure util functions (`lib/`) | 100% branch coverage in `ci/` unit tests |
| App orchestrator (`app.js`) | No unit tests — covered by E2E |
| E2E (Playwright) | All AC-XX and EC-XX covered |
| CI | Tests run on every PR via GitHub Actions |

Test runner for `ci/`: plain `node` — no test framework required.
E2E: `@playwright/test` with Chromium only (add browsers only if NFRs require).

---

## 9. CI/CD Standards

```yaml
# Required jobs in .github/workflows/ci.yml
- unit-tests: node ci/test-*.js
- e2e-tests: npx playwright test
```

- Actions must be pinned to a specific tag (e.g. `actions/checkout@v4`) — never `@latest`.
- Node version: **20 LTS**.
- `npm install` is required only if `devDependencies` are present; pure-utility projects should need none for unit tests.

---

## 10. Deviation Process

If a technology or pattern not listed here is required, the proposing agent must:
1. State the proposal as a `DECISION-NEEDED` finding in `docs/design-review.md`.
2. Get explicit user acceptance before writing any code that depends on it.
3. Record the agreed decision as DD-XX with rationale.
4. Update this skill file if the deviation becomes the new standard.
