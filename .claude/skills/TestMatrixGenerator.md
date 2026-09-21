---
name: TestMatrixGenerator
description: Generates a comprehensive QA test plan from docs/requirements.md covering positive, negative, boundary, and regression test cases. Run before writing Playwright tests.
whenToUse: Run at the start of the qaEngineer phase, before writing any test files. The matrix determines which test cases to write — every cell must have a test or be explicitly marked out-of-scope.
---

# Test Matrix Generator Skill

This skill transforms `docs/requirements.md` into a **structured test matrix** that the QA engineer uses to ensure comprehensive coverage. Generate the matrix first; then write exactly the test files needed to cover every cell.

---

## How to Generate the Matrix

For each requirement type, generate test cases following the rules below. The output is a matrix table that the QA engineer uses as their test-writing checklist.

---

## Step 1: Extract Test Seeds

Read `docs/requirements.md` and extract:

| Source | Extract |
|---|---|
| `FR-XX` | Each functional behaviour to verify |
| `AC-XX` | Each Given/When/Then scenario (direct test case) |
| `EC-XX` | Each error or edge case (negative/boundary test) |
| `NFR-XX` | Each measurable non-functional target |
| `DD-XX` from design-review | Each design decision with a verifiable outcome |

---

## Step 2: Generate Test Types per Requirement

For every `FR-XX` and `AC-XX`, generate **four test variants**:

| Test Type | Description | Example |
|---|---|---|
| **Positive (Happy Path)** | Normal inputs, expected successful outcome | User types "red", swatches with "red" appear |
| **Negative** | Invalid or unexpected input | User types special chars `<script>`, no crash |
| **Boundary** | Values at the edge of valid ranges | Empty string, maximum length input, zero results |
| **Regression** | Previously broken behaviours to guard | Filter + family dropdown combined (interaction) |

For every `EC-XX`, generate **two test variants**:

| Test Type | Description |
|---|---|
| **Error simulation** | Reproduce the exact failure condition |
| **Recovery** | Verify the system returns to a usable state after the error |

For every `NFR-XX` with a measurable target, generate:

| Test Type | Description |
|---|---|
| **Performance assertion** | Measure against the stated target with Playwright timing |
| **Degradation** | Verify graceful degradation when target cannot be met |

---

## Step 3: Assign Test Layers

Each test case must be assigned to exactly one layer:

| Layer | When to use |
|---|---|
| **Unit (Node `ci/`)** | Pure function, no DOM, no network |
| **E2E (Playwright)** | Browser interaction, DOM assertions, network simulation |
| **Manual** | Not automatable — documented with manual test instructions |

---

## Step 4: Output the Test Matrix

Emit this matrix before writing any test files:

```
## Test Matrix

| ID | Requirement | Test Type | Description | Layer | Selector/API | Status |
|---|---|---|---|---|---|---|
| T-01 | AC-01 | Positive | Swatches render on load with name and HEX | E2E | `.swatch`, `.swatch-name`, `.swatch-hex` | ☐ Not written |
| T-02 | AC-01 | Boundary | Loading spinner hidden after data loads | E2E | `#loading-state` | ☐ Not written |
| T-03 | AC-02 | Positive | Search 'red' filters to matching swatches | E2E | `#search`, `.swatch` | ☐ Not written |
| T-04 | AC-02 | Boundary | Empty search returns all swatches | E2E | `#search`, `.swatch` count | ☐ Not written |
| T-05 | AC-02 | Negative | Search with no matches shows empty state | E2E | `#empty-state` | ☐ Not written |
| T-06 | AC-02 | Negative | Search is case-insensitive | E2E | `#search`, `.swatch` count | ☐ Not written |
| ... | ... | ... | ... | ... | ... | ... |
```

After tests are written, update Status column to: ✅ Passing / ❌ Failing / ⏭ Skipped.

---

## Step 5: Coverage Gaps Report

After generating the matrix, identify any gaps:

```
## Coverage Gaps

| Requirement | Missing Test Type | Reason | Action |
|---|---|---|---|
| NFR-01 (Performance) | Performance assertion | Playwright timing API needed | Add to E2E |
| EC-04 (Clipboard fail) | Recovery test | Clipboard permission API complex | Manual test |
```

Any gap that is not explicitly "Manual" or "Out of scope" is a coverage defect.

---

## Minimum Required Test Cases

For a standard interactive data-driven SPA, the matrix must include at minimum:

### Functional (E2E)
- [ ] App loads and renders initial data
- [ ] Loading state visible then hidden
- [ ] Search filters results in real time (positive)
- [ ] Search returns empty state on no match (negative)
- [ ] Search is case-insensitive (boundary)
- [ ] Clearing search restores full list (boundary)
- [ ] Dropdown filter filters by category (positive)
- [ ] Dropdown "All" restores full list (boundary)
- [ ] Combined search + dropdown filter (regression)
- [ ] Click on item opens detail view (positive)
- [ ] Detail view shows all specified fields (positive)
- [ ] Keyboard Enter opens detail view (accessibility)
- [ ] Close button dismisses detail view
- [ ] Escape key dismisses detail view
- [ ] Focus returns to trigger after dismiss

### Error Handling (E2E)
- [ ] Fetch failure: fallback data renders (EC simulation)
- [ ] Fetch failure: error banner shown (EC simulation)
- [ ] Fetch failure: UI is still usable (EC recovery)
- [ ] Malformed data entry: no crash (boundary/negative)

### Accessibility (E2E)
- [ ] Arrow key navigation through list
- [ ] ARIA role assertions (listbox/option/dialog)
- [ ] `aria-live` updates on filter change
- [ ] Focus trap inside modal (DD assertion)

### Unit Tests (Node `ci/`)
- [ ] Pure filter function — all test seeds from `lib/filter.js` rules in DefensiveCoding
- [ ] Color utilities — all test seeds from `lib/colorUtils.js` rules in DefensiveCoding

### Performance (E2E — measure, don't gate)
- [ ] Time from search input to DOM update ≤ NFR target (measure only; log result in QA report)

---

## Regression Test Policy

After each bug fix or code review fix is applied, add a regression test that:
1. Reproduces the exact original defect condition
2. Asserts the correct post-fix behaviour
3. Is labelled `R-NN` (matching the code review finding ID)

```javascript
// Regression test for R-01: innerHTML used for color name
test('R-01: color name rendered without XSS risk (textContent only)', async ({ page }) => {
  // Inject a color name with script tags via intercepted fetch
  await page.route('**/colors.v1.json', route => {
    route.fulfill({ json: [{ name: '<script>alert(1)</script>', hex: '#ff0000', family: 'Red' }] });
  });
  await page.goto('/');
  await page.waitForSelector('.swatch');
  // The text should be literal, not parsed as HTML
  const name = await page.locator('.swatch-name').first().textContent();
  expect(name).toBe('<script>alert(1)</script>'); // textContent shows literal string
});
```

---

## Guardrails

- **Every AC-XX must have at least one test.** An AC with no test is a QA gap, not a passed requirement.
- **Never count a Playwright test as covering an AC unless it actually asserts the AC outcome.** A test that navigates to the page but doesn't assert the specific behaviour does not count.
- **Performance tests are measured, not gated** — record the timing in the QA report; do not fail the test suite on a timing miss unless the NFR explicitly requires it.
- **Manual tests must be documented** in the QA report with step-by-step instructions, expected results, and an explicit "PASS / FAIL" field.
- **Regression tests are permanent** — never delete a regression test unless the feature it covers is removed.
