# AGENTS.md - agents-template Local Maintainer Contract

This file is repository-local for maintaining `agents-template` itself.

Downstream bootstrap contract source: `AGENTS_TEMPLATE.md`.
During bootstrap/sync, downstream projects receive that file as `AGENTS.md`.

## Required Startup Order (This Repository)

Read these in order before non-trivial work:

1. `AGENTS.md` (this file)
2. `docs/AGENT_RULES.md`
3. `docs/CONTEXT_INDEX.json`
4. `docs/AGENT_CONTEXT.md`
5. `.agents/EXECUTION_QUEUE.json` (when present)
6. `.agents/CONTINUITY.md`
7. Run `npm run agent:preflight`

Read downstream template sources only when intentionally changing downstream contract content:

- `AGENTS_TEMPLATE.md`
- `.claude-template/CLAUDE.md`

## Local vs Downstream Contract

- Local-only maintainer instructions live in:
  - `AGENTS.md`
  - `.claude/CLAUDE.md`
- Downstream template sources live in:
  - `AGENTS_TEMPLATE.md` -> downstream `AGENTS.md`
  - `.claude-template/CLAUDE.md` -> downstream `.claude/CLAUDE.md`
- Do not place template-maintainer-only instructions in downstream template sources.

## Repository-Local Rules

- Do not bootstrap this `agents-template` repository as a target project.
- Keep `.agents` pointed at external workfiles (`../agents-workfiles/agents-template`) for local runtime state.
- Keep `.agents-template/` as tracked downstream scaffold content only.
- Keep local runtime `.agents/**` state untracked.

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
