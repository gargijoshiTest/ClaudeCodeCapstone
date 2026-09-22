# CLAUDE.md — Color Palette Explorer (ClaudeCodeCapstone)

This repository uses an automated, multi-agent SDLC workflow framework. Before executing code modifications, running tests, or staging pull requests, cross-reference and adhere to the instructions in the corresponding agent profile listed below.

JIRA: `TES-*` on `epam-team-yxi9fjzt.atlassian.net` · Branch: `claudecodeTesting` → PR target: `main`

---

## SDLC Agent Persona Matrix

Always reference the individual agent files inside `.claude/agents/` to enforce specific engineering roles:

| Phase | Agent file | Enforces |
|-------|-----------|---------|
| Intake & Scope | `.claude/agents/requirementEngineer.md` | `RequirementValidation` skill |
| Technical Design | `.claude/agents/solutionArchitect.md` | `ArchitectureGuidelines` skill |
| Design Review | `.claude/agents/designReviewer.md` | `DesignSanityCheck` skill |
| Code Production | `.claude/agents/developer.md` | `DefensiveCoding` + `ArchitectureGuidelines` skills |
| Quality Assurance | `.claude/agents/qaEngineer.md` | `TestMatrixGenerator` skill |
| Review & Verification | `.claude/agents/codeReviewer.md` | `DefensiveCoding` + `ArchitectureGuidelines` skills |
| Release & Handoff | `.claude/agents/prCreator.md` | `ContextHandoff` + `ChangeLogFormatter` skills |

Trigger the full cycle with `/sdlc`, or invoke each agent individually with its trigger phrase (e.g. "gather requirements", "implement", "code review", "create PR"). All agents use model `claude-sonnet-5`.

### ContextHandoff protocol

Each agent emits a handoff block at the end of its phase and the next agent verifies it before starting. If the upstream handoff block is missing or shows a FAIL verdict, the receiving agent stops and asks the user to resolve it.

### Key agent guardrails

- **developer**: shows every file's full content before writing — user must type `approve` to proceed.
- **prCreator**: will not open a PR if `docs/qa-report.md` verdict is FAIL.
- **codeReviewer**: any BLOCKER finding must be fixed before the PR is created.
- **requirementEngineer**: runs 7-gate `RequirementValidation` before writing `docs/requirements.md`.

---

## Core Commands

```bash
npm run serve        # Start local dev server at http://localhost:3000
npm test             # Run unit smoke tests (colorUtils + filter + playground)
npx playwright test  # Run E2E Playwright suite (requires: npx playwright install on first run)
```

Never declare a task complete or raise a PR until `npm test` returns a clean `exit 0`.

---

## Project Structure

```
index.html           # App shell
lib/
  colorUtils.js      # HEX→RGB→HSL, contrast ratio, swatch text color
  filter.js          # Filter engine (search + family)
ci/
  test-colorUtils.js # Unit tests for colorUtils
  test-filter.js     # Unit tests for filter logic
  test-playground.js # Unit tests for text color playground
colors.v1.json       # Bundled color dataset
docs/
  requirements.md    # FR/NFR from JIRA TES-2
  architecture.md    # Component diagram + tech decisions
  design-review.md   # Pre-code design review findings
  impl-plan.md       # Task breakdown from architecture
  code-review.md     # Pre-PR review checklist
  qa-report.md       # Playwright QA results
.claude/
  agents/            # Custom SDLC subagents (see above)
  skills/            # Shared skill files consumed by agents (see below)
  settings.json      # MCP servers + lifecycle hooks (JSONC — // comments supported)
```

The `docs/` directory is the single source of truth for all SDLC artefacts. Never delete files there mid-cycle. Keep docs commits and source code commits separate.

---

## Skills (.claude/skills/)

Shared instruction files consumed by agents at specific phases — not triggered directly by users.

| Skill | Used by | Purpose |
|-------|---------|---------|
| `ContextHandoff` | all agents | Emit/verify structured handoff block between phases |
| `RequirementValidation` | `requirementEngineer` | 7-gate checklist before committing `requirements.md` |
| `ArchitectureGuidelines` | `developer`, `codeReviewer` | File structure, module conventions, security mandates |
| `DefensiveCoding` | `developer`, `codeReviewer` | Engineering standards: EH-XX, SEC-XX, CC-XX, DRY-XX, DEP-XX rules |
| `DesignSanityCheck` | `designReviewer` | Pre-code design sanity verification |
| `TestMatrixGenerator` | `qaEngineer` | Test coverage matrix generation |
| `ChangeLogFormatter` | `prCreator` | Git history parsing + PR description + CHANGELOG template |

---

## Non-Negotiable AI Code Behavior Rules

### 1. Verification Enforcement
Never declare a task complete or ask for a PR until `npm test` returns a clean `exit 0`.

### 2. Error Boundary Architecture
Always implement explicit error handling catch boundaries and fallback envelopes. Silenced errors, empty catch blocks, or implicit type casting are strictly forbidden (rule EH-01).

### 3. Absolute Code Footprint Minimums
Only rewrite or insert logic into code paths explicitly required to satisfy the validation schema. Do not refactor adjacent files or clean up unrelated syntax unless commanded by `solutionArchitect.md`.

### 4. Git Hygiene
All branches flow from `main`. Commits must be atomic and use semantic format: `feat:`, `fix:`, `docs:`, `test:`, `chore:` (e.g. `feat: add token validation`).

---

## Key Defensive Coding Rules

Violations are BLOCKER findings in code review.

| Rule | Requirement |
|------|------------|
| EH-01 | Every `async`/`fetch` must have an explicit `try/catch` with a user-visible error state |
| SEC-01 | Never use `innerHTML` — use `textContent` or `createElement` for all data-derived DOM writes |
| CC-01 | No magic numbers — use named constants (`CHUNK_SIZE = 50`, `DEBOUNCE_MS = 150`) |
| DRY-01 | No copy-pasted logic — extract shared code into `lib/` utilities |
| DEP-01 | Pin all package versions exactly (no `^` or `~` in `package.json`) |

---

## Key Architecture Decisions

- **No bundler** — Chrome-only target, ES modules loaded directly in the browser.
- **Chunked rendering** — `requestAnimationFrame` with `CHUNK_SIZE = 50` prevents UI freeze.
- **Offline fallback** — If `colors.v1.json` fetch fails (e.g. `file://`), an embedded dataset loads and a non-dismissible warning banner is shown.
- **CSP header** — `Content-Security-Policy: default-src 'self'` enforced by `npm run serve`.
- **No innerHTML** — All DOM writes use `textContent` or `createElement` (SEC-01).

---

## Active Hooks (.claude/settings.json)

| Event | Type | Status | Purpose |
|-------|------|--------|---------|
| `CwdChanged` | command | active | Checks for `session_context.json`; logs ContextHandoff status |
| `PreToolUse` | prompt | active | Validates file edits/commands against architecture boundaries |
| `PostToolUse` | command (async) | active | Detects git changes; triggers TestMatrix/ChangeLog notifications |
| `UserPromptSubmit` | prompt | commented out | Was: RequirementValidation gate on every user prompt |
| `Stop` | prompt | commented out | Was: CodeReviewer feedback at session end |

---

## MCP Integration

| Tool | Used by | Purpose |
|------|---------|---------|
| `mcp__atlassian__jira_get_issue` | `requirementEngineer` | Fetch JIRA ticket by key (e.g. `TES-2`) |
| `mcp__atlassian__jira_search` | `requirementEngineer` | Search JIRA issues |
| `mcp__atlassian__confluence_get_page` | `requirementEngineer` | Read Confluence pages as fallback source |
| `mcp__atlassian__confluence_search` | `requirementEngineer` | Search Confluence |

Credentials live in `.claude/settings.json` env block. If MCP auth fails, set `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN` and restart Claude Code.

---

## Notes

- `prCreator` uses the GitHub MCP server (`mcp__github__create_pull_request`) — set `GITHUB_PERSONAL_ACCESS_TOKEN` (needs `repo` scope) in your environment before running it.
- The `developer` agent's human-in-the-loop requires explicit `approve` for every file write — do not bypass this.
- Playwright E2E tests require `npx playwright install` on first run.
