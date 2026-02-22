# AGENTS_TEMPLATE.md - Repository Agent Bootstrap

Bootstrap contract for AI coding agents in this repository.

## Required Startup Order

Read these in order before non-trivial work:

1. `AGENTS.md`
2. `AGENTS.override.md` (when present; repo-local overrides to this contract)
3. `.agents-config/docs/AGENT_RULES.md`
4. `.agents-config/docs/CONTEXT_INDEX.json`
5. `.agents-config/docs/AGENT_CONTEXT.md`
6. `.agents/EXECUTION_QUEUE.json` (when present)
7. `.agents/CONTINUITY.md`
8. Run `npm run agent:preflight` to refresh `.agents/SESSION_BRIEF.json` and enforce repository-index readiness

## Canonical Sources and Precedence

- Machine-readable canonical policy: `.agents-config/policies/agent-governance.json`
- Enforcement runner: `.agents-config/scripts/enforce-agent-policies.mjs`
- Session preflight generator: `.agents-config/scripts/agent-session-preflight.mjs`
- Canonical rule catalog: `.agents-config/contracts/rules/canonical-ruleset.json`
- Local rule override schema: `.agents-config/agent-overrides/rule-overrides.schema.json`
- Optional local rule overrides file: `.agents-config/agent-overrides/rule-overrides.json`
- Managed workflow manifest: `.agents-config/agent-managed.json`
- Managed workflow template seed: `.agents-config/tools/bootstrap/managed-files.template.json`
- Optional local AGENTS override file: `AGENTS.override.md`
- Release notes source of truth: `CHANGELOG.md`
- Release notes template artifact: `.agents-config/docs/RELEASE_NOTES_TEMPLATE.md`
- Release notes generator: `.agents-config/scripts/generate-release-notes.mjs`
- Feature index artifact: `.agents-config/docs/FEATURE_INDEX.json`
- Test matrix artifact: `.agents-config/docs/TEST_MATRIX.md`
- Route map artifact: `.agents-config/docs/ROUTE_MAP.md`
- JSDoc coverage artifact: `.agents-config/docs/JSDOC_COVERAGE.md`
- Logging standards source of truth: `.agents-config/docs/LOGGING_STANDARDS.md`
- Runtime logging rule: everything in project runtime code should be logged appropriately through shared logging helpers.
- Domain start-here readmes: `backend/src/routes/README.md`, `backend/src/services/README.md`, `frontend/features/*/README.md`
- Human-readable rules contract: `.agents-config/docs/AGENT_RULES.md`
- Human-readable project context: `.agents-config/docs/AGENT_CONTEXT.md`
- Context map index: `.agents-config/docs/CONTEXT_INDEX.json`

Conflict resolution order:

1. Latest explicit user instruction.
2. `AGENTS.override.md` (when present).
3. Machine-readable policy contracts/checks.
4. Human-readable rules contract.
5. Human-readable context contract.

## Session Context Artifacts

Canonical local artifact roots are under `.agents/`:

- Canonical execution queue: `.agents/EXECUTION_QUEUE.json`
- Feature-sharded cold archive: `.agents/archives/<feature_id>.jsonl`
- Archive index for historical lookup: `.agents/EXECUTION_ARCHIVE_INDEX.json`
- Generated startup brief: `.agents/SESSION_BRIEF.json`
- Continuity ledger: `.agents/CONTINUITY.md`
- Plan roots: `.agents/plans/current/`, `.agents/plans/deferred/`, `.agents/plans/archived/`
- Shared queue authority for orchestrator and subagents: `.agents/EXECUTION_QUEUE.json` (single source of truth)
- Bootstrap defaults to external workfiles mode: `.agents` is a symlink to `<agents-workfiles-path>/<project-id>` (default path `../agents-workfiles`).
- Local `.agents` directory mode is available only when bootstrap is explicitly set to `--agents-mode local`.
- Treat `.agents/**` as shared multi-writer state and apply semantic merges (preserve concurrent entries; never clobber with blind overwrite).
- `.agents/**` may be concurrently modified by other agent sessions; every edit under `.agents/**` must be semantically merged against latest on-disk state before write.
- All additional Git worktrees must be created under `.worktrees`.
- In non-primary worktrees, `.agents` must be a symlink to the canonical shared root.

Queue-first execution rule:

- Before implementation/investigation execution starts, all planned work must exist as atomic entries in `.agents/EXECUTION_QUEUE.json`.
- `.agents/EXECUTION_QUEUE.json` is authoritative for task state/order; `PLAN.md` provides human detail and references queue item IDs.
- `npm run agent:preflight` auto-syncs `.agents/plans/current/*/PLAN.md` and `.agents/plans/deferred/*/PLAN.md` into queue items.
- Policy enforcement requires each current/deferred plan directory to have a corresponding queue item via `plan_ref`.
- `npm run agent:preflight` also backfills `.agents/plans/archived/*/PLAN.md` into `.agents/EXECUTION_ARCHIVE_INDEX.json` + feature shard archives idempotently.
- Queue state model is explicit and idempotent: top-level and per-item `state` use `active`/`deferred`/`pending`/`complete`, and items keep stable `id` + `idempotency_key`.
- When a task or feature becomes `complete`, move it from hot queue into feature shard archive.
- Do not read archive shards during normal startup; read archive on-demand for historical lookup only.
- In multi-agent sessions, read only queue fields/items relevant to the current feature/item scope (selector examples: `id`, `plan_ref`, `owner`, `depends_on`) instead of loading the entire queue.
- Preflight performs a stale `.agents/plans/**` reference scan and fails when unresolved links are detected.
- Session brief contract is machine-validated and required via `.agents/SESSION_BRIEF.json`; missing/stale freshness beyond policy threshold fails policy checks until refreshed.
- Preflight queue-quality gate blocks archival/closeout when required queue metadata is missing (`deferred_reason`, execution/completion timestamps, outputs/evidence/resolution summary).
- Completion evidence for `complete` items must include explicit verification trace entries prefixed `verify:`.
- Preflight includes repository index readiness gating: always re-index namespaced index and strict-verify before implementation work starts.

Simplified plan architecture:

- required per active feature: `PLAN.md`
- Optional when needed: `HANDOFF.md`, `PROMPT_HISTORY.md`, `EVIDENCE.md`
- Legacy `*_PLAN.md` and `LLM_SESSION_HANDOFF.md` files are valid historical formats.

## Orchestrator/Subagent Contract Pointer

Canonical enforceable source for orchestrator/subagent behavior:
`contracts.orchestratorSubagent` in `.agents-config/policies/agent-governance.json`

Policy-canonical rule IDs:

- `orch_hybrid_instruction_contract`
- `orch_scope_tightness`
- `orch_machine_payload_authoritative`
- `orch_delegate_substantive_work`
- `orch_operator_subagent_default`
- `orch_human_nuance_addendum`
- `orch_atomic_task_delegation`
- `orch_dual_channel_result_envelope`
- `orch_orchestrator_coordination_only`
- `orch_default_cli_routing`
- `orch_unconfirmed_unknowns`
- `orch_atomic_single_objective_scope`
- `orch_single_orchestrator_authority`
- `orch_concise_subagent_briefs`
- `orch_spec_refined_plan_verbosity`
- `orch_codex_model_default`

Single-orchestrator topology is required: one orchestrator agent owns cross-task coordination/context and subagents execute delegated atomic tasks only.
Operator/subagent execution is the default for non-trivial work; direct single-agent execution is allowed only for trivial tasks.
Subagent handoff brevity and spec/refined-spec/plan verbosity budgets are defined in `contracts.orchestratorSubagent.verbosityBudgets`.
Default model routing is policy-defined by role/risk:
- orchestrator: `gpt-5.3-codex` with `xhigh` reasoning effort
- subagents: `gpt-5.3-codex` with `high` reasoning effort
- low-risk fast loops only: `gpt-5.3-codex-spark` with explicit verification commands
Default CLI routing is policy-defined in `contracts.orchestratorSubagent.defaultCliRouting`:
- Codex agents: `codex`
- Claude agents: `claude`

## Policy-as-Code Enforcement

- Local: `node .agents-config/scripts/enforce-agent-policies.mjs`
- Session preflight: `npm run agent:preflight`
- Canonical rules verify: `npm run rules:canonical:verify`
- Canonical rules sync: `npm run rules:canonical:sync`
- Managed workflow check: `npm run agent:managed -- --mode check`
- Managed workflow fix/recheck: `npm run agent:managed -- --fix --recheck`
- Managed workflow canonical contract source: `.agents-config/agent-managed.json` + `.agents-config/tools/bootstrap/managed-files.template.json` (`canonical_contract`, per-entry `allow_override`).
- `AGENTS.md` is template-managed; local project-specific adjustments should go in `AGENTS.override.md` (do not hand-edit canonical `AGENTS.md`).
- Bootstrap seeds allowlisted override payloads when rewritten local content diverges from template source.
- Managed override gate: unknown/non-allowlisted `.agents-config/agent-overrides/**` payload files fail managed checks.
- Template-impact declaration gate (PR metadata): `npm run agent:template-impact:check -- --base-ref origin/<base-branch>`
- Release prep (changelog rotation): `npm run release:prepare -- --version <X.Y.Z>`
- Release notes generator: `npm run release:notes -- --version <X.Y.Z> --from <tag> [--to <ref>] [--output <path>]`
- Release workflow rule: `release:prepare` must promote `## [Unreleased]` into `## [<version>] - <date>` and recreate a fresh empty `## [Unreleased]` scaffold (`Added`, `Changed`, `Fixed`).
- Release notes source rule: `release:notes` must read items from the corresponding `CHANGELOG.md` version section (plain-English changelog bullets are canonical).
- Release notes content rule: summarize changes in plain English and avoid raw commit-jargon wording.
- Route map generator: `npm run route-map:generate`
- Domain readmes generator: `npm run domain-readmes:generate`
- JSDoc coverage verify: `npm run jsdoc-coverage:verify`
- Logging compliance verify: `npm run logging:compliance:verify`
- Logging policy requirement: runtime code paths should not ship without appropriate scoped logging coverage.
- CI gate: `.github/workflows/pr-checks.yml` job `policy-as-code`
- CI template gate: meaningful workflow-path changes must carry `Template-Impact` declaration (`yes` with `Template-Ref`, or `none` with `Template-Impact-Reason`).
- If process expectations change, update all of:
  - `.agents-config/AGENTS_TEMPLATE.md`
  - `.agents-config/docs/AGENT_RULES.md`
  - `.agents-config/docs/AGENT_CONTEXT.md`
  - `.agents-config/docs/CONTEXT_INDEX.json`
  - `.agents-config/agent-managed.json`
  - `.agents-config/tools/bootstrap/managed-files.template.json`
  - `.agents-config/contracts/rules/canonical-ruleset.json`
  - `.agents-config/agent-overrides/rule-overrides.schema.json`
  - `.agents-config/docs/FEATURE_INDEX.json`
  - `.agents-config/docs/TEST_MATRIX.md`
  - `.agents-config/docs/ROUTE_MAP.md`
  - `.agents-config/docs/JSDOC_COVERAGE.md`
  - `.agents-config/docs/LOGGING_STANDARDS.md`
  - `backend/src/routes/README.md`
  - `backend/src/services/README.md`
  - `frontend/features/README.md`
  - `.agents-config/policies/agent-governance.json`
  - `.agents-config/scripts/enforce-agent-policies.mjs`
  - `.agents-config/tools/rules/verify-canonical-ruleset.mjs`
  - `.agents-config/scripts/verify-logging-compliance.mjs`
