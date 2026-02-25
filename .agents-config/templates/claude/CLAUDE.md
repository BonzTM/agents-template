# CLAUDE.md - Claude Code Bootstrap

Before proceeding any further, follow the startup sequence defined in `AGENTS.md` at the repository root.

After every context compaction, treat it as a fresh startup and re-run the full sequence above before resuming work.

## Orchestrator/Subagent Contract Quick Reference

Canonical enforceable source: `.agents-config/policies/agent-governance.json` at `contracts.orchestratorSubagent`.

- Use single-orchestrator topology: one orchestrator owns cross-task coordination/context; subagents execute delegated atomic tasks only.
- Default to the operator/subagent pattern for non-trivial work; direct single-agent execution is allowed only for trivial tasks.
- Keep delegated tasks single-objective with explicit `atomic_scope` boundaries.
- Use machine-readable payloads as authority with concise human nuance addenda.
- Return dual-channel results: machine-readable envelope plus concise human summary.
- Follow default CLI routing unless user-overridden: Codex agents via `codex` CLI, Claude agents via `claude` CLI.
- Claude-to-Codex delegation: prefer `codex exec -p "<prompt>"` for atomic tasks.
- Respect policy verbosity budgets for subagent briefs/spec/refined-spec/plan sections.
- Ensure completed queue-item evidence includes explicit verification entries prefixed `verify:`.

Before non-trivial implementation or closeout, run:

- `npm run agent:preflight`
- `node .agents-config/scripts/enforce-agent-policies.mjs`
