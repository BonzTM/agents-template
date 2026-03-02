# How It Works

What this system actually does and why it matters.

## The Problem

LLM agents default to working however they want — skipping context, guessing at project structure, writing code before planning, and claiming things work without verification. Prose instructions help, but agents routinely ignore or forget them, especially after context compaction. This system replaces the honor system with enforceable contracts.

## Key Rules

The behavioral rules that change how agents work vs their defaults. These are defined in `.agents-config/docs/AGENT_RULES.md` and enforced by executable policy checks.

### Startup Discipline

Agents must read governance files in a mandatory order and run session preflight before doing any work — including answering questions. After context compaction, agents re-read everything and run preflight again. There is no "quick question" exception.

- Mandatory read order: `AGENTS.md` → `AGENT_RULES.md` → `CONTEXT_INDEX.json` → `AGENT_CONTEXT.md` → `EXECUTION_QUEUE.json` → `MEMORY.md`
- Preflight command: `npm run agent:preflight`
- Post-compaction: full re-bootstrap, not a partial resume

### Plan Before Code

All non-trivial work goes through a planning sequence before any implementation begins. Plans are machine-readable (`PLAN.json`) and gated by the execution queue.

- Planning stages: spec outline → refined spec → detailed implementation plan
- Atomic tasks with explicit status values (`pending`, `in_progress`, `complete`, `blocked`)
- Verbosity budgets enforced per stage (spec outline ≤ 220 words, refined spec ≤ 420 words, per-task block ≤ 160 words)
- Queue gate: work items must exist in `EXECUTION_QUEUE.json` with `planned_at` metadata before execution starts

### Test-Driven Development

Strict tests-first TDD is the default. Agents confirm acceptance criteria, write failing tests, then implement only until tests pass. Deviations require explicit user approval plus documented rationale.

### Verification Evidence

Agents must run verification commands and read output before claiming results. No "should work" language, no assuming tests pass. The run-then-claim protocol means every completion claim has evidence behind it.

### Structured Debugging

Phased root-cause investigation before implementing fixes. Agents follow a methodical diagnostic process rather than guessing. After three failed attempts at a fix, agents must escalate rather than continue looping.

### Memory and Continuity

Persistent context survives across sessions and context compaction through a structured memory system.

- `.agents/MEMORY.md`: canonical memory reference point and submemory index
- `.agents/memory/`: submemory directories for topic-specific context
- `.agents/SESSION_LOG.md`: timestamped implementation trace
- Post-compaction: re-read `MEMORY.md` and relevant submemory files before resuming

### Orchestrator/Subagent Model

Multi-agent sessions follow a strict delegation hierarchy. One orchestrator owns coordination; subagents execute atomic tasks.

- Single orchestrator authority per session
- Mandatory delegation: orchestrators delegate discovery and implementation work whenever feasible
- Atomic task briefs: one objective, bounded context, explicit acceptance criteria
- Idle subagents must be released immediately when no longer executing work
- Model routing: orchestrator uses `claude-opus-4-6`, subagents use `claude-opus-4-6` or `claude-sonnet-4-6` for lighter tasks

### Security and Scope

Agents default to read-only exploration. Edits are workspace-scoped. Changes stay narrowly focused.

- Read-only by default; edit only when required by the task
- Remote API interactions are read-only unless explicitly confirmed
- Secret scanning: never print secrets/tokens/credentials in terminal output
- Narrow scope: smallest safe change that solves the issue
- No broad refactors unless explicitly requested

## How Enforcement Works

Rules are enforced by three layers of executable checks, not just prose. These run locally via npm scripts and in CI via the `pr-checks.yml` workflow.

### Layer 1: Policy Checks

**Script**: `.agents-config/scripts/enforce-agent-policies.mjs`
**Command**: `npm run policy:check`

Validates governance document structure and content against the policy manifest (`.agents-config/policies/agent-governance.json`). Checks include:

- **Document structure**: required markdown sections, section ordering, required text snippets
- **Sequence validation**: startup read order and required sequence snippets
- **Placeholder detection**: unfilled template markers in structured documents
- **Forbidden patterns**: secrets, credentials, and disallowed content in tracked files
- **Session log format**: timestamped entry format compliance
- **Memory index contract**: canonical memory reference structure validation
- **Context index contract**: machine-readable context map structure and drift detection
- **Plan machine contract**: `PLAN.json` lifecycle status, narrative fields, implementation step structure, pre-spec outline requirements
- **Workspace layout**: `.agents` path validation, worktree root enforcement
- **Canonical ruleset**: rule ID + hash lineage verification against policy/doc sources
- **Orchestrator/subagent contracts**: delegation rules, payload shape, verbosity budgets
- **Profile-scoped contracts**: feature index, test matrix, route map, JSDoc coverage, logging standards, OpenAPI coverage (when profile is active)

### Layer 2: Session Preflight

**Script**: `.agents-config/scripts/agent-session-preflight.mjs`
**Command**: `npm run agent:preflight`

Runs at session start and after every context compaction. Validates and normalizes the agent workspace:

- **Workspace layout**: validates `.agents` symlink, ensures plan directories exist, validates worktree configuration
- **Plan-to-queue sync**: scans `PLAN.json` files in plan directories and syncs feature entries into `EXECUTION_QUEUE.json`
- **Plan normalization**: ensures `PLAN.json` documents conform to the machine contract (required fields, status values, narrative structure, implementation steps)
- **Memory index validation**: confirms `.agents/MEMORY.md` exists and is structurally valid
- **Session brief generation**: produces `SESSION_BRIEF.json` with a freshness token, branch info, queue summary, plan status, and workspace state
- **Archive management**: maintains execution archive index and feature-sharded archive artifacts
- **Stale reference scanning**: detects plan references that point to non-existent files

### Layer 3: Managed File Drift Detection

**Script**: `.agents-config/tools/bootstrap/agent-managed-files.mjs`
**Command**: `npm run agent:managed -- --mode check`

Tracks managed files against canonical template sources and detects divergence:

- **Authority modes**: each managed file is `template` (overwritten on sync), `project` (seeded once, then project-owned), or `structured` (template defines structure, project owns content)
- **Content comparison**: compares local files against template source content, accounting for override payloads (`.override` and `.append` files)
- **Override validation**: ensures override payloads exist only for explicitly allowlisted template-authority entries; rejects unknown, non-allowlisted, or deprecated `.replace` payloads
- **Structured contracts**: validates structured markdown (required sections, placeholder detection) and structured JSON (required paths, forbidden paths, declared types)
- **Profile filtering**: only checks files relevant to active profiles
- **Fix mode**: `npm run agent:managed -- --fix --recheck` repairs drift by overwriting template-authority files and pruning forbidden paths in structured JSON

### Lifecycle

```
Startup                Planning               Implementation         Verification           Completion
─────────────────────  ─────────────────────  ─────────────────────  ─────────────────────  ─────────────────────
Read governance files   Spec outline           Execute atomic task    Run tests/checks       Update task status
Run preflight           Refined spec           Follow TDD protocol    Read and confirm       Record completion
Review queue state      Implementation plan    Scope changes tightly  Provide evidence       Archive if done
                        Queue gate                                                           Update memory
```

### When Each Layer Runs

| Layer | Local | CI | Trigger |
|-------|-------|----|---------|
| Policy checks | `npm run policy:check` | `pr-checks.yml` | On demand, in CI on every PR |
| Session preflight | `npm run agent:preflight` | — | Session start, post-compaction, before work |
| Managed file drift | `npm run agent:managed -- --mode check` | `pr-checks.yml` | On demand, in CI on every PR |

## Further Reading

- [Architecture & Concepts](architecture.md) — template vs downstream, canonical+overrides model, directory layout
- [Command Reference](commands.md) — all npm scripts including enforcement commands
- [CI Integration](ci-integration.md) — how policy checks run in pull request workflows
