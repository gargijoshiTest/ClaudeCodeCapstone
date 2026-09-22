# 🤖 Project AI Agents Directory (SDLC Registry)

Welcome! This project uses an automated, multi-agent AI framework powered by Claude Code to assist with the Software Development Life Cycle (SDLC). 

Use this directory to understand **which AI agent handles your specific request**, what skills they possess, and how to interact with them.

---

## 🗺️ Agent Routing & Responsibility Matrix

| SDLC Phase | AI Agent Persona | Core Responsibility (What they do) | Primary Skills Enforced |
| :--- | :--- | :--- | :--- |
| **Intake & Scope** | `requirementEngineer.md` | Validates user stories, flags scope creep, checks technical feasibility, and highlights missing edge cases. | `RequirementValidation` |
| **Architecture** | `solutionArchitect.md` | Enforces design system constraints, manages system boundaries, and maps API contracts. | `ArchitectureGuidelines` |
| **Safety & Design** | `designReviewer.md` | Audits code structure for security flaws, performance bottlenecks, and architectural violations. | `DefensiveCoding` |
| **Implementation** | `developer.md` | Writes the functional application code, fixes bugs, and handles standard refactoring. | Code Generation |
| **Quality Assurance**| `qaEngineer.md` | Generates comprehensive test matrices and automatically runs test sweeps. | `TestMatrixGenerator` |
| **Review & Audit** | `codeReviewer.md` | Conducts a final human-like code audit against guidelines before marking code ready. | Code Optimization |
| **Deployment / PR** | `prCreator.md` | Compiles delta summaries, formats human-readable changelogs, and drafts the GitHub PR. | `ContextHandoff`, `ChangeLogFormatter` |

---

## 💡 How BAs and PMs Can Leverage These Agents

### 1. Refining a User Story (For BAs)
Before handing a ticket to developers, you can run your raw requirements past the **Requirement Engineer**. 
* **How it works:** Open Claude Code and ask: *"Review this new feature draft using the rules in requirementEngineer.md."*
* **The Benefit:** It will automatically run the `RequirementValidation` skill to flag if your requirements are too vague, missing acceptance criteria, or conflicting with existing features.

### 2. Checking Impact Analysis (For PMs)
If a client asks for a major change mid-sprint, you can use the **Solution Architect** to see how difficult it will be.
* **How it works:** Ask Claude Code: *"Based on solutionArchitect.md, what components will be impacted if we change the checkout API?"*
* **The Benefit:** It will immediately call out design violations or database constraints before a single line of code is mistakenly modified.

### 3. Reviewing Automated Release Notes (For PMs)
When a feature branch is ready to move to staging, the **PR Creator** utilizes the `ChangeLogFormatter` skill.
* **The Benefit:** It automatically translates complex technical git commits into clean, business-friendly bullet points showing exactly *what* value was added, saving you from parsing code diffs.
