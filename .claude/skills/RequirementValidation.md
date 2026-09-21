---
name: RequirementValidation
description: Validation rubric for docs/requirements.md. Run this checklist before handing off to solutionArchitect to guarantee requirements are unambiguous, complete, and testable.
whenToUse: Run at the end of the requirementEngineer phase (before committing docs/requirements.md) and at the start of the solutionArchitect phase (before reading requirements). If any gate fails, return to requirementEngineer for clarification.
---

# Requirement Validation Skill

This skill provides the **exit gate** between the requirements phase and the architecture phase. Every item must pass before the solutionArchitect agent proceeds. A failed gate means the requirements engineer must resolve the gap — the architect must never invent or assume missing requirements.

---

## Gate 1: Document Structure

All sections must be present in `docs/requirements.md`:

- [ ] **User Story** — verbatim text of the original story
- [ ] **Functional Requirements** — at least one `FR-XX` item
- [ ] **Non-Functional Requirements** — at least one `NFR-XX` item with a named category
- [ ] **Acceptance Criteria** — at least one `AC-XX` item in Given/When/Then format
- [ ] **Edge Cases & Error Handling** — at least one `EC-XX` item
- [ ] **Dependencies & Assumptions** — present (may be empty with explicit "None")
- [ ] **Open Questions** — present (may be empty with explicit "None open")

If any section is absent: **FAIL** — do not proceed.

---

## Gate 2: Functional Requirements Quality

For each `FR-XX`, verify:

- [ ] **Testable** — the requirement can be verified by a test or inspection (not "the system should be good")
- [ ] **Unambiguous** — only one interpretation is possible (not "the system should handle errors appropriately")
- [ ] **Atomic** — covers exactly one behaviour (not a compound requirement with implicit AND)
- [ ] **Traceable** — at least one `AC-XX` exists that covers this FR
- [ ] **Uses modal verbs correctly** — `shall` for mandatory, `should` for desired, `may` for optional

Failure pattern to flag:
```
❌ "FR-03: The system should handle all edge cases properly."
✅ "FR-03: The system shall display an empty-state message when the filter returns zero results."
```

---

## Gate 3: Acceptance Criteria Quality

For each `AC-XX`, verify:

- [ ] **Given/When/Then format** — each criterion follows the BDD pattern
- [ ] **Measurable outcome** — the "Then" clause is observable and binary (pass/fail)
- [ ] **References a specific FR** — implicit or explicit trace back to at least one FR
- [ ] **No overlap** — two ACs do not test the exact same behaviour

Failure pattern to flag:
```
❌ "AC-02: The filter should work correctly."
✅ "AC-02: Given the swatch list is loaded, when the user types 'red' in the search field, then only swatches whose name contains 'red' (case-insensitive) are displayed."
```

---

## Gate 4: Non-Functional Requirements Completeness

Check that at least these NFR categories are addressed (or explicitly marked N/A):

| Category | Required if... | Check |
|---|---|---|
| **Performance** | Any interactive UI element | [ ] Present |
| **Security** | Any user input or external data | [ ] Present |
| **Accessibility** | Any UI rendered to a browser | [ ] Present |
| **Reliability** | Any network fetch or external dependency | [ ] Present |
| **Maintainability** | Project will be iterated on | [ ] Present |

Each NFR must state a **measurable target** where possible:
```
❌ "NFR-01: Performance — the app should be fast."
✅ "NFR-01: Performance — filter response time must be ≤ 100ms p95 for up to 1,000 color entries."
```

---

## Gate 5: Edge Cases & Error Handling

Each `EC-XX` must:

- [ ] Name a **specific failure mode** (not generic "errors")
- [ ] State **expected system behaviour** on that failure
- [ ] Correspond to at least one `FR-XX` or `AC-XX`

Minimum edge cases for an interactive data-driven UI:
- [ ] EC: Data fetch fails (network error or non-2xx response)
- [ ] EC: Data source returns empty array
- [ ] EC: Filter returns zero results
- [ ] EC: Browser API unavailable (e.g. Clipboard API blocked)

---

## Gate 6: Persona Clarity

- [ ] At least one **named user persona** is defined (not just "the user")
- [ ] Each persona has a **role** and **primary goal**
- [ ] The persona appears in at least one FR or AC

Example:
```
Persona: Designer — a UI/UX designer searching for accessible color values.
Primary goal: Find colors with sufficient contrast ratios for WCAG compliance.
```

---

## Gate 7: Open Questions Assessment

- [ ] Every `OQ-XX` has an **owner** named (or "TBD" with a note explaining who should decide)
- [ ] Every `OQ-XX` has a **blocking** flag — does proceeding to architecture require this to be answered first?
- [ ] Any OQ marked "Blocking: Yes" must be resolved before the architecture phase starts

---

## Validation Report Format

When running this skill, emit a validation report before proceeding:

```
## Requirement Validation Report

| Gate | Status | Failures |
|---|---|---|
| 1 — Document Structure | ✅ PASS / ❌ FAIL | <list missing sections> |
| 2 — FR Quality | ✅ PASS / ❌ FAIL | <list failing FRs> |
| 3 — AC Quality | ✅ PASS / ❌ FAIL | <list failing ACs> |
| 4 — NFR Completeness | ✅ PASS / ❌ FAIL | <missing categories> |
| 5 — Edge Cases | ✅ PASS / ❌ FAIL | <missing EC types> |
| 6 — Persona Clarity | ✅ PASS / ❌ FAIL | <what is missing> |
| 7 — Open Questions | ✅ PASS / ❌ FAIL | <unresolved blockers> |

**Overall: PASS — Requirements ready for architecture** / **FAIL — N gates failed**
```

If any gate fails: **do not proceed to architecture**. Return the failing items to the requirementEngineer with specific questions to resolve.

---

## Guardrails

- **Never assume a missing requirement is implicitly covered.** Absence = gap.
- **Never weaken a requirement to make it pass the gate.** The goal is clarity, not compliance theatre.
- **The architect must re-run Gate 1 at the start of their phase.** The requirements may have changed since the engineer committed them.
- **A PASS on this checklist does not mean the requirements are correct** — it means they are unambiguous enough to architecture against. Domain correctness is the product owner's responsibility.
