---
name: DefensiveCoding
description: Engineering standards for error handling, logging, security, test coverage, and code quality. Read before writing any production code and use as the codeReviewer checklist.
whenToUse: Read at the start of the developer phase (before writing any file) and at the start of the codeReviewer phase (as the primary review checklist). Any violation of a MANDATORY rule is a BLOCKER finding.
---

# Defensive Coding Standards

This skill defines the **binding engineering standards** for this project. Every line of code written by the developer agent must comply. Every violation found by the code reviewer is a BLOCKER or MAJOR finding depending on severity tier below.

---

## 1. Error Handling Policy

### Rule EH-01: All async operations must have explicit error handling

```javascript
// ❌ WRONG — unhandled rejection
const data = await fetch('/api').then(r => r.json());

// ✅ CORRECT — explicit catch with user-visible outcome
try {
  const res = await fetch('/api');
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  // ... use data
} catch (err) {
  showErrorState(err.message);
  console.error('[fetchData]', err);
}
```

### Rule EH-02: Never use empty catch blocks

```javascript
// ❌ WRONG — silently swallows errors
try { riskyOperation(); } catch (e) {}

// ✅ CORRECT — at minimum, log the error
try {
  riskyOperation();
} catch (err) {
  console.error('[riskyOperation] failed:', err);
}
```

### Rule EH-03: Check HTTP response status before parsing

```javascript
// ❌ WRONG — assumes 200 OK
const data = await fetch(url).then(r => r.json());

// ✅ CORRECT
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
```

### Rule EH-04: Validate external data before use

All data from `fetch()`, `localStorage`, URL parameters, or user input must be normalised:

```javascript
function normaliseColor(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    name: typeof raw.name === 'string' ? raw.name : 'Unknown',
    hex: /^#[0-9A-Fa-f]{6}$/.test(raw.hex) ? raw.hex : '#000000',
    family: typeof raw.family === 'string' ? raw.family : 'Unknown',
  };
}
```

### Rule EH-05: UI must always have a visible error state

Every component that fetches data must handle three states:
- Loading state (spinner / `aria-busy`)
- Ready state (content rendered)
- Error state (error banner or empty state)

Never leave the UI in loading state permanently on error.

---

## 2. Security Practices

### Rule SEC-01: Never use `innerHTML` with non-literal values — BLOCKER

```javascript
// ❌ BLOCKER — XSS vector
element.innerHTML = `<span>${userInput}</span>`;
element.innerHTML = `<span>${colorData.name}</span>`;

// ✅ CORRECT
const span = document.createElement('span');
span.textContent = colorData.name;
element.appendChild(span);
```

### Rule SEC-02: Never use `eval()`, `new Function()`, `document.write()` — BLOCKER

No exceptions. If a use case seems to require these, raise a DECISION-NEEDED finding.

### Rule SEC-03: Clipboard API only on user gesture

```javascript
// ❌ WRONG — called outside a user event handler
document.addEventListener('DOMContentLoaded', () => {
  navigator.clipboard.writeText(value); // fails in most browsers
});

// ✅ CORRECT
button.addEventListener('click', () => {
  navigator.clipboard.writeText(hex).catch(() => { /* silent fallback */ });
});
```

### Rule SEC-04: No hard-coded credentials — BLOCKER

- No passwords, API tokens, or secrets in any source file
- Use environment variables for any sensitive configuration
- Check `.gitignore` excludes `.env` before staging

### Rule SEC-05: Content Security Policy in serve script

The npm `serve` script must include a CSP header:
```
"serve": "npx http-server . -p 3000 -c-1 --header \"Content-Security-Policy: default-src 'self'\""
```

---

## 3. Logging Format

All `console` calls must follow this convention:

```javascript
// Format: console.<level>('[<module>] <message>', data?)
console.log('[filter] applying query:', { q, family, total: colors.length });
console.warn('[colorUtils] hex missing # prefix, normalising:', raw);
console.error('[fetchColors] fetch failed:', err);
```

Rules:
- **Always include a module tag** in brackets: `[app]`, `[filter]`, `[colorUtils]`
- **`console.error`** for caught exceptions and unexpected failures
- **`console.warn`** for recoverable anomalies (malformed data, deprecated usage)
- **`console.log`** for significant state transitions (app init, filter applied, modal opened)
- **Never use `console.log` in library code** (`lib/`) — return values only; let callers decide what to log

---

## 4. Test Coverage Minimums

| Code layer | Minimum coverage | Coverage type |
|---|---|---|
| `lib/colorUtils.js` | 100% branch | Node unit tests in `ci/` |
| `lib/filter.js` | 100% branch | Node unit tests in `ci/` |
| `app.js` | AC-XX coverage | Playwright E2E only |
| `index.html` | AC-XX coverage | Playwright E2E only |

### Required test cases for `lib/filter.js`

- Empty query (all items returned)
- Non-matching query (zero items returned)
- Partial name match (case-insensitive)
- Family filter = "All" (no family filter applied)
- Family filter = specific value (only matching family returned)
- Entry with missing `name` field (should not throw)
- Entry with missing `family` field (should not throw)

### Required test cases for `lib/colorUtils.js`

- `hexToRgb` with `#` prefix, lowercase
- `hexToRgb` with `#` prefix, uppercase
- `hexToRgb` without `#` prefix (normalised or rejected — document which)
- `getContrastRatio` where both colors are identical
- `getSwatchTextColor` returns black for very light colors
- `getSwatchTextColor` returns white for very dark colors
- `getSwatchTextColor` for mid-range luminance (not just extremes)

---

## 5. Code Clarity Standards

### Rule CC-01: Explain magic numbers with a named constant

```javascript
// ❌ WRONG — reader cannot deduce what 0.179 means
return luminance > 0.179 ? '#000000' : '#ffffff';

// ✅ CORRECT
const WCAG_LUMINANCE_THRESHOLD = 0.179;
return luminance > WCAG_LUMINANCE_THRESHOLD ? '#000000' : '#ffffff';
```

Named constants for this project:
```javascript
const CHUNK_SIZE = 50;                    // swatches per rAF chunk
const DEBOUNCE_DELAY_MS = 150;            // search input debounce
const WCAG_LUMINANCE_THRESHOLD = 0.179;   // WCAG 2.1 sRGB boundary
const WCAG_LINEARISE_THRESHOLD = 0.03928; // sRGB linearisation cutoff
const WCAG_GAMMA = 2.4;                   // sRGB gamma exponent
```

### Rule CC-02: Functions must be ≤ 40 lines

If a function exceeds 40 lines, split it into named sub-functions with clear responsibilities.

### Rule CC-03: No abbreviations in identifiers unless universally known

- ❌ `q`, `res`, `el`, `cb` (ambiguous)
- ✅ `query`, `response`, `element`, `callback`
- Exception: `i` in for loops, `e` in catch clauses, `err` for error variables

---

## 6. DRY (Don't Repeat Yourself)

### Rule DRY-01: Cache repeated DOM queries

```javascript
// ❌ WRONG — queries DOM on every call
function update() {
  document.getElementById('count').textContent = n;
  document.getElementById('count').setAttribute('aria-label', `${n} results`);
}

// ✅ CORRECT — cache at init time
const countEl = document.getElementById('count');
function update() {
  countEl.textContent = n;
  countEl.setAttribute('aria-label', `${n} results`);
}
```

### Rule DRY-02: Shared logic must live in `lib/`, not duplicated across files

If the same computation appears in two places, extract it.

### Rule DRY-03: Filter must be invoked from a single code path

Both search input and family dropdown must call the same `applyFilter()` function. Never duplicate filter logic.

---

## 7. Dependency Safety

### Rule DEP-01: Pin all dependency versions

```json
// ❌ WRONG
"devDependencies": { "@playwright/test": "^1.0.0" }

// ✅ CORRECT
"devDependencies": { "@playwright/test": "1.52.0" }
```

### Rule DEP-02: Pin GitHub Actions to specific SHAs or tags

```yaml
# ❌ WRONG
- uses: actions/checkout@latest

# ✅ CORRECT
- uses: actions/checkout@v4
```

### Rule DEP-03: Unit tests must use only Node built-ins

`ci/test-*.js` files must import only from `lib/` and Node built-ins. No test framework installation required for basic unit tests.

---

## Severity Mapping for Code Review

| Rule violated | Severity |
|---|---|
| SEC-01, SEC-02, SEC-04 | BLOCKER |
| EH-01, EH-03 | BLOCKER |
| EH-02, EH-04, EH-05 | MAJOR |
| SEC-03, SEC-05 | MAJOR |
| CC-01, CC-02 | MINOR |
| CC-03, DRY-01, DRY-02, DRY-03 | MINOR |
| DEP-01, DEP-02, DEP-03 | MINOR |
| LOG format | NIT |
