# AGENTS.md - agents-template Local Maintainer Contract

IMPORTANT: This file defines the mandatory startup sequence for ALL agent work in this repository. You MUST complete the full startup order below before doing ANY work — including answering questions, reading code, or making changes. This is a blocking requirement that applies to every agent (Claude, Codex, or any other LLM agent), every session, and every task regardless of complexity. Do not skip, defer, or partially complete the startup sequence under any circumstances.

After every context compaction or session reset, treat it as a fresh startup: re-read this file and complete the full startup order again, including re-reading `.agents/MEMORY.md` and any relevant submemory files, before resuming work.

This file is repository-local for maintaining `agents-template` itself.

Downstream bootstrap contract source: `.agents-config/templates/AGENTS.md`.
During bootstrap/sync, downstream projects receive that file as `AGENTS.md`.

## Required Startup Order (This Repository)

Always read these in order, no matter how trivial the work:

1. `AGENTS.md` (this file)
2. `.agents-config/docs/AGENT_RULES.md`
3. `.agents-config/docs/CONTEXT_INDEX.json`
4. `.agents-config/docs/AGENT_CONTEXT.md`
5. `.agents/EXECUTION_QUEUE.json` (when present)
6. `.agents/MEMORY.md` (canonical memory reference point and submemory index)
7. Run `npm run agent:preflight`

Treat `.agents/MEMORY.md` as the reference point for persistent memories and for the indexed submemory directories under `.agents/memory/`. After compaction, re-read `.agents/MEMORY.md` and any submemory files relevant to the active task before resuming implementation.

Read downstream template sources only when intentionally changing downstream contract content:

- `.agents-config/templates/AGENTS.md`
- `.agents-config/templates/CLAUDE.md`
- `.agents-config/tools/bootstrap/managed-files.template.json`
- `.agents-config/agent-managed.json`
- `.agents-config/config/project-tooling.json`

## Local vs Downstream Contract

- Local-only maintainer instructions live in:
  - `AGENTS.md`
  - `CLAUDE.md`
- Downstream template sources live in:
  - `.agents-config/templates/AGENTS.md` -> downstream `AGENTS.md`
  - `.agents-config/templates/CLAUDE.md` -> downstream `CLAUDE.md`
- Do not place template-maintainer-only instructions in downstream template sources.

## Repository-Local Rules

- Do not bootstrap this `agents-template` repository as a target project.
- Keep `.agents` pointed at external workfiles (`../agents-workfiles/agents-template`) for local runtime state.
- Keep `.agents-config/templates/agents/` as tracked downstream scaffold content only.
- Keep local runtime `.agents/**` state untracked.
- For maintenance tasks, orchestrators must delegate discovery and implementation work to subagents whenever possible, assign strict atomic task briefs, and close subagents immediately when complete.

## Maintainer Commands

- New sibling project:
  - `npm run bootstrap -- --project-name <project-name>`
- Existing project:
  - `npm run bootstrap -- --mode existing --target-path ../<project-name> --project-id <project-id>`
  - Existing-mode prerequisite: `.agents-config/config/project-tooling.json` must exist in target repo (plus TS/JS profile artifacts like feature index/logging baseline when those profiles are active).
- Existing downstream project one-command sync (run inside downstream repo):
  - `npm run agent:sync`
- Managed workflow:
  - `npm run agent:managed -- --mode check`
  - `npm run agent:managed -- --fix --recheck`
- Governance checks:
  - `npm run policy:check`
  - `npm run rules:canonical:verify`
  - `npm run rules:canonical:sync`
  - `npm run agent:preflight`
