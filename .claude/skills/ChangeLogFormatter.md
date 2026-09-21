---
name: ChangeLogFormatter
description: Parses git diffs and SDLC docs into clean, semantic PR descriptions and CHANGELOG entries. Run during the prCreator phase to produce accurate, traceable PR content.
whenToUse: Run during the prCreator phase before writing the PR description or CHANGELOG entry. Never fabricate content — every statement must trace to a git fact or a doc section.
---

# Changelog Formatter Skill

This skill provides the **rules and templates** for converting raw git history and SDLC documents into accurate, human-readable PR descriptions and CHANGELOG entries. The goal is PRs that reviewers can trust — every claim is verifiable.

---

## Part 1: Parsing Git History

### Step 1: Classify commits by type

Run:
```bash
git log main...HEAD --oneline --no-merges
```

Classify each commit by its conventional commit prefix:

| Prefix | Category | CHANGELOG Section |
|---|---|---|
| `feat:` | New feature | ### Added |
| `fix:` | Bug fix | ### Fixed |
| `docs:` | Documentation only | ### Documentation |
| `test:` | Tests added/updated | ### Testing |
| `refactor:` | Code change with no behaviour change | ### Changed |
| `style:` | Formatting only | (omit from CHANGELOG) |
| `chore:` | Config, deps, CI | ### Infrastructure |
| `perf:` | Performance improvement | ### Changed |
| `ci:` | CI pipeline change | ### Infrastructure |

If a commit has no prefix, classify it by reading its body. If unclassifiable, list it under ### Changed with a note.

### Step 2: Extract requirement references

Scan commit messages for:
- `FR-XX`, `AC-XX`, `EC-XX` — requirement traceability
- `R-NN` — code review finding references
- `TASK-NN` — implementation plan task references
- `DD-XX` — design decision references
- `TES-N`, `PROJ-N` — JIRA ticket references

These references must appear in the PR description under **Requirement Coverage**.

### Step 3: Identify file changes

Run:
```bash
git diff main...HEAD --name-status
```

Group files by change type:

| Change Type | git status prefix |
|---|---|
| Added | `A` |
| Modified | `M` |
| Deleted | `D` |
| Renamed | `R` |

For each changed file, derive the reason from:
1. The commit message that introduced it
2. The corresponding task in `docs/impl-plan.md`
3. The corresponding fix in `docs/code-review.md` or `docs/qa-report.md`

Never make up a reason. If the reason is not traceable, use "Implementation detail — see `docs/impl-plan.md`."

---

## Part 2: PR Description Template

Use this exact structure. Populate every section from git facts and SDLC docs. Mark any section as "N/A" rather than fabricating content.

```markdown
## Summary

<2–3 sentences covering:>
<1. What story/feature was built — name the JIRA ticket and User Story title from docs/requirements.md>
<2. What approach was taken — name the architecture style from docs/architecture.md>
<3. What quality gates passed — name the QA verdict from docs/qa-report.md>

Example:
"Implements TES-3 — Text Color Playground, a single-page colour palette browser with real-time
search and contrast analysis. Built as a vanilla-JS ES Module SPA with no build step (static
hosting). All 22 Playwright E2E tests pass; QA verdict: PASS."

---

## Changes Made

| File | Change | Reason |
|---|---|---|
| <path> | Added / Modified / Deleted | <1-line reason from impl-plan or commit message> |

Rules:
- One row per file
- Reason must be ≤ 100 characters
- Never list `node_modules/`, `.DS_Store`, `*.lock` unless they are the subject of the PR

---

## Requirement Coverage

| Requirement | Status | Evidence |
|---|---|---|
| FR-01 | ✅ Implemented | `app.js` + `lib/filter.js` |
| AC-02 | ✅ Tested | `tests/e2e/app.spec.js:42` |
| EC-01 | ✅ Tested | `tests/e2e/app.spec.js:89` |
| NFR-01 (Performance) | ✅ Measured | QA Report §3 — 48ms p95 |

---

## Test Evidence

### Unit Tests
<Run `npm test` live and paste the exact output. Never paraphrase.>
```
PASS: ci/test-colorUtils.js (12 assertions)
PASS: ci/test-filter.js (9 assertions)
```

### E2E Tests (Playwright)
<Run `npx playwright test --reporter=list` live and paste or summarise accurately.>
```
22 passed (14.2s)
```

### CI
Workflow: `.github/workflows/ci.yml`
Jobs on this PR: `unit-tests`, `e2e-tests`

---

## Code Review Summary

<Drawn from docs/code-review.md — report the verdict and unresolved items only.>

Verdict: <APPROVED / APPROVED WITH CONDITIONS / CHANGES REQUESTED>
Blockers resolved: <N / N>
MAJORs resolved: <N / N>
Skipped findings: <list or "None">

---

## Known Limitations

<Bullet list drawn from:>
<- Deferred items in docs/design-review.md>
<- Skipped findings in docs/code-review.md>
<- Out-of-scope items in docs/requirements.md>
<- Unresolved OQ-XX items>

If there are no known limitations: "No known limitations. All review findings resolved."

---

## Reviewer Checklist

The reviewer must tick every item before approving.

### Functional
- [ ] <List each AC-XX as a checkbox — derived from docs/requirements.md>

### Accessibility
- [ ] <List each ARIA/keyboard requirement — derived from NFR-XX in requirements>

### Error Handling
- [ ] <List each EC-XX as a checkbox>

### Code Quality
- [ ] No `innerHTML` used with non-literal values
- [ ] No hard-coded credentials in any tracked file
- [ ] `npm test` passes
- [ ] `npx playwright test` passes

### Documentation
- [ ] `docs/requirements.md` — present and complete
- [ ] `docs/architecture.md` — present with Mermaid diagrams
- [ ] `docs/design-review.md` — all findings resolved
- [ ] `docs/impl-plan.md` — all tasks complete
- [ ] `docs/code-review.md` — verdict APPROVED or APPROVED WITH CONDITIONS
- [ ] `docs/qa-report.md` — QA verdict PASS
```

---

## Part 3: CHANGELOG Entry Template

Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions strictly.

```markdown
## [Unreleased] — YYYY-MM-DD

### Added
<New files, features, components — one bullet per item — derived from `feat:` commits and `A` files in git diff>
- Color Palette Explorer SPA (`index.html`, `app.js`, `styles.css`)
- Filter engine (`lib/filter.js`) — stateless name + family filtering
- Color utilities (`lib/colorUtils.js`) — HEX→RGB, RGB→HSL, WCAG contrast ratio

### Changed
<Modified behaviour — from `refactor:`, `perf:` commits and `M` files that change behaviour>
- (none)

### Fixed
<Bug fixes — from `fix:` commits and code-review R-NN findings marked Fixed>
- R-01: Replaced `innerHTML` with `textContent` in swatch name render (`app.js:87`)
- R-03: Added `res.ok` check before JSON parse in `fetchColors` (`app.js:34`)

### Testing
<Test additions — from `test:` commits>
- Added Playwright E2E suite (22 tests covering all AC-XX)
- Added unit tests for `lib/colorUtils.js` and `lib/filter.js`

### Infrastructure
<CI, config, dependency changes — from `ci:`, `chore:` commits>
- Added GitHub Actions CI workflow (unit-tests + e2e-tests jobs)
- Pinned `@playwright/test` to 1.52.0

### Documentation
<Docs changes — from `docs:` commits>
- Added docs/requirements.md, architecture.md, design-review.md, impl-plan.md, code-review.md, qa-report.md
```

Rules:
- **Past tense** for all entries ("Added", "Fixed", not "Adding", "Fixes")
- **One item per bullet** — never combine two changes on one line
- **Trace each entry** to at least one commit SHA, finding ID, or task ID (you may omit the trace from the visible entry but verify it exists)
- **Omit empty sections** — if no `### Fixed` items exist, remove that section entirely
- **Never add a version number** to `[Unreleased]` — version bumps are a separate step

---

## Part 4: Quality Gates Before Submitting

Before calling `gh pr create`, verify:

- [ ] Every sentence in the Summary is backed by a specific doc or git fact
- [ ] The Changes Made table has no fabricated reasons
- [ ] Test Evidence shows actual command output (not "tests passed")
- [ ] Reviewer Checklist covers every AC-XX from requirements.md
- [ ] Known Limitations references specific doc sections (not vague)
- [ ] CHANGELOG entry has no empty sections
- [ ] PR title follows conventional commit format: `feat: <story title> (<ticket>)`

If any gate fails, fix the PR description before pushing.

---

## Guardrails

- **Never fabricate test output.** Run `npm test` and `npx playwright test` live. Paste actual output.
- **Never claim a finding is resolved if it appears in the "skipped" table** of `docs/code-review.md`.
- **Never omit a skipped code-review finding** from Known Limitations.
- **Use ISO 8601 dates** (`YYYY-MM-DD`) in all timestamps.
- **PR title must be ≤ 72 characters** — GitHub truncates longer titles in email notifications.
- **CHANGELOG date is today's date** — never use a future date.
