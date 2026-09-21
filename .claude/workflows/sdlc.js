export const meta = {
  name: 'sdlc',
  description: 'Full agentic SDLC cycle with human-in-the-loop gates between each agent',
  phases: [
    { title: 'Requirements',        detail: 'Read JIRA ticket, capture FR/NFR/AC, write docs/requirements.md' },
    { title: 'Requirements Gate',   detail: 'Human review: approve / revise / stop' },
    { title: 'Architecture',        detail: 'Design components, NFR decisions, Mermaid diagrams, write docs/architecture.md' },
    { title: 'Architecture Gate',   detail: 'Human review: approve / revise / stop' },
    { title: 'Design Review',       detail: 'Senior review across 8 dimensions, write docs/design-review.md' },
    { title: 'Design Review Gate',  detail: 'Human review: approve / revise / stop' },
    { title: 'Implementation',      detail: 'Generate impl-plan.md and write all source files wave by wave' },
    { title: 'Implementation Gate', detail: 'Human review: approve / revise / stop' },
    { title: 'Code Review',         detail: 'Peer review across 7 dimensions, fix BLOCKERs/MAJORs, write docs/code-review.md' },
    { title: 'Code Review Gate',    detail: 'Human review: approve / revise / stop' },
    { title: 'QA',                  detail: 'Playwright E2E suite, run all tests, write docs/qa-report.md' },
    { title: 'QA Gate',             detail: 'Human review: approve / revise / stop' },
    { title: 'Pull Request',        detail: 'Commit, push, generate PR description + CHANGELOG' },
  ],
}

// Pass a JIRA URL as args when invoking this workflow:
//   Workflow({ name: 'sdlc', args: 'https://company.atlassian.net/browse/PROJ-1' })
const jiraUrl = (typeof args === 'string' && args.startsWith('http'))
  ? args
  : 'ASK_USER'

// ─── Gate schema ─────────────────────────────────────────────────────────────
// The gate agent presents each phase's output to the user and captures their decision.

const GATE_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Concise bulleted summary of what the phase produced (2-5 key points)',
    },
    decision: {
      type: 'string',
      enum: ['approve', 'revise', 'stop'],
      description: 'User decision captured after presenting the summary',
    },
    revisionNotes: {
      type: 'string',
      description: 'If decision is "revise": what the user wants changed. Otherwise empty.',
    },
  },
  required: ['summary', 'decision'],
}

// ─── Helper: run one agent with a human gate ──────────────────────────────────
// Each phase loops up to MAX_REVISIONS times:
//   1. Run the main agent (revision notes appended on retry).
//   2. Run the gate: present output, ask approve / revise / stop.
// Returns { stopped: true/false }.

const MAX_REVISIONS = 3

async function runWithGate(phaseTitle, gateTitle, buildPrompt, gateDocHint, nextPhase) {
  let revisionNotes = ''
  let attempts = 0

  while (attempts < MAX_REVISIONS) {
    phase(phaseTitle)
    const revisionSuffix = attempts === 0
      ? ''
      : `\n\n--- REVISION REQUEST (attempt ${attempts + 1} of ${MAX_REVISIONS}) ---\n${revisionNotes}\nAddress the feedback above before finishing.`

    await agent(buildPrompt(revisionSuffix), { label: phaseTitle, phase: phaseTitle })

    phase(gateTitle)
    const gate = await agent(
      `You are a human-in-the-loop checkpoint for the SDLC workflow.
The "${phaseTitle}" phase just finished. Before the workflow continues to "${nextPhase}", the user must review and approve.

YOUR STEPS:
1. Read ${gateDocHint} and any other docs already written in docs/.
2. Present a clear, concise summary to the user — key metrics, decisions made, files written, anything notable.
   Use a short bulleted list so the user can quickly assess the output quality.
3. Tell the user what will happen next ("Next: ${nextPhase}").
4. Show this exact prompt to the user and wait for their reply:

   ─────────────────────────────────────────────
   ✅  Approve and proceed to "${nextPhase}"?

   Reply with ONE of:
     approve          — output looks good, continue
     revise <notes>   — redo this phase with your notes
     stop             — halt the entire workflow here
   ─────────────────────────────────────────────

5. Read the user's response carefully and record it in your structured output.
   Do NOT proceed until the user has replied.`,
      { label: gateTitle, phase: gateTitle, schema: GATE_SCHEMA }
    )

    if (!gate || gate.decision === 'stop') {
      log(`Workflow stopped by user after "${phaseTitle}".`)
      return { stopped: true }
    }

    if (gate.decision === 'approve') {
      log(`"${phaseTitle}" approved — proceeding to ${nextPhase}.`)
      return { stopped: false }
    }

    // revise — loop back
    revisionNotes = (gate.revisionNotes || '').trim() || 'Revise based on user feedback.'
    log(`Revision ${attempts + 1} requested for "${phaseTitle}": ${revisionNotes}`)
    attempts++
  }

  log(`Max revisions (${MAX_REVISIONS}) reached for "${phaseTitle}" — continuing to next phase.`)
  return { stopped: false }
}

// ─── PHASE 1: Requirements ────────────────────────────────────────────────────

log(jiraUrl === 'ASK_USER'
  ? 'No JIRA URL provided — Requirements agent will ask the user for it.'
  : `Starting SDLC workflow for: ${jiraUrl}`)

const r1 = await runWithGate(
  'Requirements',
  'Requirements Gate',
  (suffix) => `You are a requirements engineer. Read .claude/agents/requirementEngineer.md first and follow every step.

JIRA ticket: ${jiraUrl === 'ASK_USER' ? '(ask the user for the JIRA URL before proceeding)' : jiraUrl}

Context:
- Step 1 of 7. Next step (solutionArchitect) reads docs/requirements.md.
- Ask only essential clarifying questions. Accept sensible defaults for everything else.
- REQUIRED DELIVERABLE: docs/requirements.md committed to git.${suffix}`,
  'docs/requirements.md',
  'Architecture'
)
if (r1.stopped) return { status: 'stopped', stoppedAfter: 'Requirements', jiraUrl }

// ─── PHASE 2: Architecture ────────────────────────────────────────────────────

const r2 = await runWithGate(
  'Architecture',
  'Architecture Gate',
  (suffix) => `You are a solution architect. Read .claude/agents/solutionArchitect.md first and follow every step.

Context:
- docs/requirements.md exists — read it as your primary input.
- Step 2 of 7. Next step (designReviewer) reads docs/architecture.md.
- Decide autonomously where requirements are clear. Ask the user only if a decision cannot be inferred.
- REQUIRED DELIVERABLE: docs/architecture.md committed. Must include Mermaid diagrams and NFR decisions table.${suffix}`,
  'docs/architecture.md',
  'Design Review'
)
if (r2.stopped) return { status: 'stopped', stoppedAfter: 'Architecture', jiraUrl }

// ─── PHASE 3: Design Review ───────────────────────────────────────────────────

const r3 = await runWithGate(
  'Design Review',
  'Design Review Gate',
  (suffix) => `You are a senior design reviewer. Read .claude/agents/designReviewer.md first and follow every step.

Context:
- docs/requirements.md and docs/architecture.md exist — read both.
- Step 3 of 7. Next step (Developer) reads docs/design-review.md and docs/architecture.md.
- Present all findings with RISK/GAP/DECISION-NEEDED labels. Ask Accept/Reject/Defer on each.
- Apply accepted changes to docs/architecture.md before finishing.
- REQUIRED DELIVERABLES: docs/design-review.md and updated docs/architecture.md, both committed.${suffix}`,
  'docs/design-review.md',
  'Implementation'
)
if (r3.stopped) return { status: 'stopped', stoppedAfter: 'Design Review', jiraUrl }

// ─── PHASE 4: Implementation ──────────────────────────────────────────────────

const r4 = await runWithGate(
  'Implementation',
  'Implementation Gate',
  (suffix) => `You are a full-cycle developer. Read .claude/agents/Developer.md first and follow every step.

Context:
- docs/requirements.md, docs/architecture.md, and docs/design-review.md exist — read all three.
- Step 4 of 7. CodeReviewer and qaEngineer will review and test what you write.
- Generate docs/impl-plan.md first; wait for user approval before writing source files.
- Show each file before writing it; follow the wave-by-wave protocol from the agent spec.
- Run npm test after the final wave. Commit all files.
- REQUIRED DELIVERABLES: docs/impl-plan.md and all source files committed.${suffix}`,
  'docs/impl-plan.md',
  'Code Review'
)
if (r4.stopped) return { status: 'stopped', stoppedAfter: 'Implementation', jiraUrl }

// ─── PHASE 5: Code Review ─────────────────────────────────────────────────────

const r5 = await runWithGate(
  'Code Review',
  'Code Review Gate',
  (suffix) => `You are a peer code reviewer. Read .claude/agents/CodeReviewer.md first and follow every step.

Context:
- All source files and docs exist — read them.
- Step 5 of 7. qaEngineer will build tests on top of the reviewed code.
- Review all 7 dimensions in full. Present findings; ask Fix/Skip/Question for each.
- Fix all BLOCKER and MAJOR findings with user approval per finding.
- Run npm test after fixes. Commit all changes.
- REQUIRED DELIVERABLE: docs/code-review.md committed. npm test must pass.${suffix}`,
  'docs/code-review.md',
  'QA'
)
if (r5.stopped) return { status: 'stopped', stoppedAfter: 'Code Review', jiraUrl }

// ─── PHASE 6: QA ─────────────────────────────────────────────────────────────

const r6 = await runWithGate(
  'QA',
  'QA Gate',
  (suffix) => `You are a QA engineer. Read .claude/agents/qaEngineer.md first and follow every step.

Context:
- All source files, docs, and unit tests exist — read them.
- Step 6 of 7. PRCreator will use docs/qa-report.md as test evidence for the PR.
- Install Playwright if needed. Show tests/e2e/app.spec.js before writing; ask for confirmation.
- Run both npm test and npx playwright test. Fix real app bugs found (with user approval).
- Update .github/workflows/ci.yml to include the e2e-tests job.
- REQUIRED DELIVERABLES: tests/e2e/app.spec.js, docs/qa-report.md, updated ci.yml — all committed. All tests must pass.${suffix}`,
  'docs/qa-report.md',
  'Pull Request'
)
if (r6.stopped) return { status: 'stopped', stoppedAfter: 'QA', jiraUrl }

// ─── PHASE 7: Pull Request ────────────────────────────────────────────────────
// No gate after PR — it is the final phase and already asks for user approval
// before pushing (per the PRCreator agent spec).

phase('Pull Request')
log('PR phase starting — assembling description and pushing branch.')

await agent(
  `You are a PR creator. Read .claude/agents/PRCreator.md first and follow every step.

Context:
- All docs and source files exist. This is the final step of the SDLC workflow.
- Read every file in docs/ for context. Run npm test and npx playwright test live for the Test Evidence section.
- Generate the full PR description with all 5 required sections (Summary, Changes Made, Test Evidence, Known Limitations, Reviewer Checklist).
- Present the description to the user and wait for their approval before pushing.
- Write CHANGELOG.md, commit all remaining uncommitted files, push the branch.
- If gh CLI is available: create the PR and print the URL.
- If gh CLI is not available: print the full PR description and the GitHub compare URL for manual creation.
- REQUIRED DELIVERABLES: CHANGELOG.md committed, branch pushed, PR created or URL + description printed.`,
  { label: 'PRCreator', phase: 'Pull Request' }
)

log('SDLC workflow complete — all phases finished.')

// ─── Final summary ────────────────────────────────────────────────────────────

return {
  jiraUrl,
  status: 'complete',
  phasesCompleted: [
    'Requirements',
    'Architecture',
    'Design Review',
    'Implementation',
    'Code Review',
    'QA',
    'Pull Request',
  ],
  deliverables: [
    'docs/requirements.md',
    'docs/architecture.md',
    'docs/design-review.md',
    'docs/impl-plan.md',
    'docs/code-review.md',
    'docs/qa-report.md',
    'CHANGELOG.md',
    'tests/e2e/app.spec.js',
  ],
}
