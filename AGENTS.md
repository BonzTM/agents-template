# AGENTS.md - agents-template Local Maintainer Contract

This file is repository-local for maintaining `agents-template` itself.

Downstream bootstrap contract source: `.agents-config/AGENTS_TEMPLATE.md`.
During bootstrap/sync, downstream projects receive that file as `AGENTS.md`.

## Required Startup Order (This Repository)

Read these in order before non-trivial work:

1. `AGENTS.md` (this file)
2. `.agents-config/docs/AGENT_RULES.md`
3. `.agents-config/docs/CONTEXT_INDEX.json`
4. `.agents-config/docs/AGENT_CONTEXT.md`
5. `.agents/EXECUTION_QUEUE.json` (when present)
6. `.agents/CONTINUITY.md`
7. Run `npm run agent:preflight`

Read downstream template sources only when intentionally changing downstream contract content:

- `.agents-config/AGENTS_TEMPLATE.md`
- `.agents-config/templates/CLAUDE.md`

## Local vs Downstream Contract

- Local-only maintainer instructions live in:
  - `AGENTS.md`
  - `CLAUDE.md`
- Downstream template sources live in:
  - `.agents-config/AGENTS_TEMPLATE.md` -> downstream `AGENTS.md`
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
- Managed workflow:
  - `npm run agent:managed -- --mode check`
  - `npm run agent:managed -- --fix --recheck`
- Governance checks:
  - `npm run policy:check`
  - `npm run rules:canonical:verify`
  - `npm run rules:canonical:sync`
  - `npm run agent:preflight`
