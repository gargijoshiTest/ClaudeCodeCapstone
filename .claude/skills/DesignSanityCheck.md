---
name: DesignSanityCheck
description: Pre-code rubric for critiquing docs/architecture.md against security, scalability, edge cases, and operational constraints before coding starts.
whenToUse: Run during the designReviewer phase before writing docs/design-review.md. Every dimension must be scored. A failing dimension produces a finding that must be accepted, rejected, or deferred before coding begins.
---

# Design Sanity Check Skill

This skill provides the **structured rubric** the design reviewer uses to stress-test `docs/architecture.md` before any production code is written. It surfaces gaps that are cheap to fix in architecture but expensive to fix in code.

---

## How to Use

Score each dimension as **PASS**, **PARTIAL** (gaps noted), or **FAIL** (blocking issues found). Every non-PASS score must produce at least one finding in `docs/design-review.md`.

---

## Dimension 1: Requirements Coverage

**Question: Does the architecture address every stated requirement?**

Checklist:
- [ ] Every `FR-XX` maps to at least one named component in the architecture
- [ ] Every `NFR-XX` has a corresponding architectural decision (not just acknowledgement)
- [ ] Every `AC-XX` is achievable given the current component design
- [ ] Every `EC-XX` has an explicit handling strategy in the architecture
- [ ] No requirements from `docs/requirements.md` are silently absent from the architecture

Failure pattern:
```
FR-04 states the app must support offline mode, but the architecture has no fallback
dataset strategy and no offline banner component.
Finding: GAP — FR-04 coverage missing.
```

---

## Dimension 2: Security Posture

**Question: Could the architecture be exploited with the current design?**

Checklist:
- [ ] **Injection prevention** — all data-to-DOM paths use safe APIs (`textContent`, not `innerHTML`)
- [ ] **Input sanitisation** — all user-supplied inputs are sanitised before processing
- [ ] **Third-party data trust** — data from external sources (fetch, APIs) is normalised and validated before rendering
- [ ] **Credential exposure** — no secrets, tokens, or keys are embedded in source files
- [ ] **Browser API gating** — privileged APIs (Clipboard, Geolocation, Notifications) are called only on explicit user gesture
- [ ] **Content Security Policy** — CSP header is defined; `script-src` does not allow `unsafe-inline` or `unsafe-eval`
- [ ] **Dependency risk** — all third-party packages are identified; none are loaded from CDN without SRI hash

Score as FAIL if any item is absent. Security gaps are BLOCKER-level findings.

---

## Dimension 3: Scalability & Performance

**Question: Will the architecture meet its NFR performance targets under realistic load?**

Checklist:
- [ ] **Data volume** — the architecture specifies how it handles 10× the expected dataset size
- [ ] **Rendering strategy** — chunked/virtual rendering is specified for any list with >100 items
- [ ] **Debounce/throttle** — all high-frequency event handlers (scroll, input, resize) have a debounce/throttle strategy
- [ ] **Race condition prevention** — concurrent async operations are safely sequenced (generation ID or cancellation token)
- [ ] **Layout thrashing** — DOM reads and writes are not interleaved in render loops
- [ ] **Bundle size** — if a build step is used, no unneeded dependencies are bundled

For each NFR performance target, state whether the architecture can meet it and under what conditions it might fail.

---

## Dimension 4: Edge Case Coverage

**Question: Are all error conditions and boundary cases handled architecturally?**

For each `EC-XX` in requirements, verify:
- [ ] A **named component or code path** handles the error
- [ ] The **user-visible outcome** is specified (error state, fallback UI, retry mechanism)
- [ ] The **failure is bounded** — one component failing does not cascade to others

Minimum edge cases for every networked UI:
| Edge Case | Architecture Must Address |
|---|---|
| Network fetch fails | Fallback data source + error banner component |
| API returns non-2xx | `res.ok` check + error state |
| Empty dataset | Empty-state UI component |
| Filter returns zero results | Empty-state variant distinct from loading state |
| Browser API unavailable | Silent degradation with optional user feedback |
| Malformed/unexpected data | Normalisation layer before render |

---

## Dimension 5: Component Boundaries

**Question: Are components well-bounded, or is the architecture a distributed monolith?**

Checklist:
- [ ] **Single responsibility** — each component in the diagram owns exactly one concern
- [ ] **Interface clarity** — the inputs and outputs of each component are stated
- [ ] **No hidden coupling** — components do not depend on each other's internal state
- [ ] **No god component** — no single component acts as router + data layer + business logic + UI
- [ ] **Testability** — pure logic components (`lib/`) are separable from DOM-coupled components

Red flags to flag as findings:
- `app.js` doing filtering, data fetching, DOM manipulation, and state management simultaneously
- A "utils" file that contains unrelated concerns
- CSS that encodes layout logic that should be in JS state

---

## Dimension 6: Accessibility Architecture

**Question: Is accessibility designed in, or bolted on?**

Checklist:
- [ ] **ARIA roles** — specified for all interactive and landmark elements
- [ ] **Keyboard navigation** — navigation pattern specified (Tab? Arrow keys? Both?)
- [ ] **Focus management** — focus trap in modals is architecturally specified
- [ ] **Focus restoration** — focus return to trigger element after modal close is specified
- [ ] **Screen reader announcements** — `aria-live` regions are identified with update triggers defined
- [ ] **Loading state** — `aria-busy` or equivalent is specified
- [ ] **Reduced motion** — `prefers-reduced-motion` handling is mentioned

Score as PARTIAL if keyboard nav and ARIA are present but focus management is unspecified.
Score as FAIL if no accessibility considerations appear in the architecture.

---

## Dimension 7: Operational Readiness

**Question: Can this system be deployed, monitored, and maintained?**

Checklist:
- [ ] **CI/CD** — build and test pipeline is specified (GitHub Actions, etc.)
- [ ] **Hosting** — deployment target is named with configuration requirements
- [ ] **Monitoring** — error tracking strategy is mentioned (or explicitly out of scope with justification)
- [ ] **Logging** — client-side error logging strategy is named (or explicitly out of scope)
- [ ] **Versioning** — data file versioning strategy is mentioned (`colors.v1.json` → `colors.v2.json` migration path)
- [ ] **Rollback** — if deployment fails, how is the previous version restored?

Missing CI/CD specification is a GAP. Missing monitoring is a DECISION-NEEDED (out-of-scope or deferred).

---

## Dimension 8: Cloud & Budget Constraints

**Question: Are there cost or infrastructure constraints that the architecture must respect?**

Checklist:
- [ ] **Hosting cost** — chosen hosting tier matches project budget (free tier, paid, etc.)
- [ ] **Data transfer** — large static assets (images, data files) use CDN or are size-bounded
- [ ] **External API costs** — any paid API (maps, auth, AI) has a usage limit or cost cap defined
- [ ] **Build minutes** — CI pipeline does not run unnecessarily expensive jobs (e.g. full E2E on every push)
- [ ] **Storage** — any data persistence has a size estimate

If the project is a simple static SPA with no external dependencies, score this dimension PASS with note "No cloud cost concerns — static hosting only."

---

## Sanity Check Summary Format

After scoring all dimensions, produce:

```
## Design Sanity Check Summary

| Dimension | Score | Findings |
|---|---|---|
| 1 — Requirements Coverage | ✅ PASS / ⚠️ PARTIAL / ❌ FAIL | N findings |
| 2 — Security Posture | ✅ PASS / ⚠️ PARTIAL / ❌ FAIL | N findings |
| 3 — Scalability & Performance | ✅ PASS / ⚠️ PARTIAL / ❌ FAIL | N findings |
| 4 — Edge Case Coverage | ✅ PASS / ⚠️ PARTIAL / ❌ FAIL | N findings |
| 5 — Component Boundaries | ✅ PASS / ⚠️ PARTIAL / ❌ FAIL | N findings |
| 6 — Accessibility Architecture | ✅ PASS / ⚠️ PARTIAL / ❌ FAIL | N findings |
| 7 — Operational Readiness | ✅ PASS / ⚠️ PARTIAL / ❌ FAIL | N findings |
| 8 — Cloud & Budget | ✅ PASS / ⚠️ PARTIAL / ❌ FAIL | N findings |

**Overall verdict:** APPROVED / APPROVED WITH CONDITIONS / REQUIRES REWORK
**Coding may start:** YES (all FAIL dimensions resolved) / NO (N FAIL dimensions pending)
```

---

## Guardrails

- **FAIL on Dimension 2 (Security) is always a blocker** — coding cannot start until all security findings are accepted and architecture updated.
- **A PARTIAL score requires at least one finding** — never mark PARTIAL with no explanation.
- **Do not invent findings.** Score only what is observable in the documents.
- **APPROVED WITH CONDITIONS** means coding can start but specific conditions must be tracked as DD-XX items that the developer must implement.
- **REQUIRES REWORK** means the architect must revise `docs/architecture.md` before coding starts.
