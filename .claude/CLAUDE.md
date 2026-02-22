# CLAUDE.md - agents-template Local Maintainer Bootstrap

Before proceeding any further, follow startup order in repository-root `AGENTS.md`.

For downstream contract changes, edit downstream template sources (not local-only files):

- `AGENTS_TEMPLATE.md`
- `.claude-template/CLAUDE.md`

After every context compaction, treat it as a fresh startup and re-run:

- `npm run agent:preflight`
- `node .github/scripts/enforce-agent-policies.mjs`
