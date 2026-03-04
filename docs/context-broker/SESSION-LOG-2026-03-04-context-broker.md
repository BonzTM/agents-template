# Session Record: Context Broker Brainstorm and ADR Capture

- Date: 2026-03-04
- Session reference time captured at: 2026-03-04T08:36:22-05:00
- Workspace: `/home/joshd/git/agents-template`
- Session intent: Architecture/brainstorm only (no implementation of runtime broker in this session)
- Requested final artifacts:
  1. Final ADR document
  2. Exhaustive session record in "excruciating detail"

## 1) Executive Summary

This session designed a deterministic, SQL-only context broker architecture for LLM agents, focused on reducing token overhead, improving retrieval accuracy, and enforcing safe behavior outside model compliance.

Core outcomes:

1. Settled on a broker model with strict boundaries between LLM and data layer.
2. Chose a shared core with both CLI and MCP interfaces.
3. Finalized a four-table pattern:
   - `context_pointers`
   - `agent_memories`
   - `agent_runs`
   - `memory_candidates`
4. Confirmed deterministic retrieval algorithm with phase-aware weighting.
5. Confirmed strict scope gating and two-stage memory ingestion.
6. Added operational automation (`sync`, `health-check`, `regress`) and CI gates.
7. Produced an ADR-ready draft and then captured it to file.

## 2) Problem Framing Captured During Session

The user framed the core problem as context inefficiency and agent blindness:

1. Too much startup context is loaded every time regardless of task type.
2. Agents grep blindly instead of starting from high-signal pointers.
3. Rediscovery happens across sessions because memory is unstructured.
4. Rule docs are monolithic and over-loaded for small tasks.

The explicit target was:

1. No vector database.
2. Plain Postgres + SQL.
3. Human-maintainable operations.
4. Fast, low-token, accurate agent behavior.

## 3) Raw Requirements and Proposed Baseline From User

The user proposed:

1. Two tables initially: `context_pointers` and `agent_memories`.
2. Pointer metadata with tags and relationships.
3. Memory categories and supersession flow.
4. Hash-based staleness checks.
5. Task-driven retrieval with tag overlap.
6. Replacing heavy startup docs with demand-loaded rule/doc pointers.

User emphasized "plain-English pointer indexing" over traditional indexing semantics, with the broker returning exactly what should be read for the task.

## 4) Assistant Recommendations Introduced During Session

Recommendations added incrementally:

1. Keep two-table spirit but strengthen with:
   - stable pointer keys
   - path/anchor split
   - pointer kind classification
   - generated `tsvector` columns
   - memory confidence + evidence links
2. Add tiny always-load core packet.
3. Use canonical tag dictionary file (not DB table) to avoid tag drift.
4. Add hard retrieval caps for deterministic context budgets.
5. Add strict memory write quality requirements.
6. Add context receipt with `why_selected` for audit/debug.
7. Add health-check and regression eval suite.
8. Add gateway enforcement so model cannot bypass system.

## 5) Major Design Evolution Across Turns

### Phase A: Two-table concept validation

- Confirmed user direction is viable.
- Proposed refinements while preserving simplicity.

### Phase B: Enforcement-first architecture

- Shifted from "rules in prompts" to "rules in broker + DB constraints + CI gates".
- Introduced fail-closed behavior.

### Phase C: Form-factor decision

User asked about API vs CLI vs MCP. Session converged on:

1. One shared core.
2. CLI for broad compatibility and operational simplicity.
3. MCP adapter for tool-native model flows.
4. Defer standalone HTTP service unless multi-tenant/remote need appears.

### Phase D: Plan mode + session review support

- Added phase-aware retrieval (`plan`, `execute`, `review`).
- Added append-only run history (`agent_runs`) separate from durable memory.

### Phase E: ADR hardening

Assistant suggested hardening details before acceptance:

1. Correct non-empty array checks with `coalesce(array_length(...),0)`.
2. Track staleness explicitly (`is_stale`) rather than `content_hash IS NOT NULL`.
3. Add `retrieval_version` to receipts/runs for reproducibility.
4. Allowlist generated-file scope exceptions.
5. Add dedupe guard for promoted memories.

## 6) Final Architecture Captured

### 6.1 System shape

- `context-core`: shared deterministic library
- `ctx-cli`: human and CI-friendly operational interface
- `ctx-mcp`: tool-native interface over same core

### 6.2 Data contracts

- `context_pointers`: retrieval entry points and relationships
- `agent_memories`: durable, evidence-linked facts
- `agent_runs`: append-only run/session summaries
- `memory_candidates`: pending/quarantine/promoted memory staging

### 6.3 Retrieval behavior

- canonical tag normalization
- deterministic scoring
- phase weights (`plan`, `execute`, `review`)
- include all matched rules
- cap non-rules + one-hop expansion
- memory retrieval cap
- single fallback widen
- explicit `insufficient_context` when signal remains too weak

### 6.4 Enforcement

- model has no direct DB access
- strict structured JSON I/O
- receipt-based scope gate
- CI revalidation of scope
- two-stage memory validation and promotion

### 6.5 Operations

- `ctx sync --changed`
- `ctx health-check`
- `ctx regress` with eval suite and CI threshold

## 7) Open Decisions That Were Discussed and Resolved

1. Broker form factor:
   - Resolved to CLI + MCP on shared core.
2. Bootstrap strategy:
   - LLM-assisted candidate generation + human review before import.
3. Rule retrieval cap behavior:
   - Include all matching rules; cap only non-rules.
4. Empty retrieval fallback:
   - Widen once, then fail-closed.
5. Session logs vs memory:
   - Keep separate (`agent_runs` for session history, `agent_memories` for durable facts).

## 8) Session Timeline (Detailed)

### T0: User sets repository instructions and environment

- User provided repository-local AGENTS contract and environment context.
- Session included strict startup/read-order and preflight constraints.

### T1: User requests brainstorming architecture only

User asked for architecture ideation (no implementation), with constraints:

1. Postgres available.
2. No vectors, plain SQL.
3. Index/pointer strategy for loading only task-relevant context.
4. Structured memory companion model.
5. Simple, maintainable design.

User provided detailed draft including:

1. 6,658-word startup tax analysis.
2. Four explicit gap categories.
3. Two-table starting schema.
4. Proposed runtime flow.
5. "What dies" and "what survives" migration model.

### T2: Assistant validates and refines schema

Assistant response:

1. Confirmed overall direction as strong.
2. Kept two-table basis.
3. Recommended stable key + anchor split + kind dimension + memory trust metadata.
4. Proposed deterministic runtime flow and anti-drift controls.

### T3: User asks for additional suggestions

Assistant added pragmatic controls:

1. always-load core packet
2. canonical tags file
3. retrieval caps
4. memory quality gate
5. stale exclusion by default
6. context receipt
7. health check
8. eval suite

### T4: User asks how to enforce against non-compliant models

Assistant shifted to enforcement-first:

1. strict gateway API
2. deterministic retrieval
3. schema-only JSON outputs
4. DB constraints/triggers
5. two-stage memory writes
6. git-diff staleness automation
7. receipt scope gate
8. CI regression harness
9. full task/retrieval logging

### T5: User presents consolidated architecture, settled/open decisions

User contributed a comprehensive architecture review, including:

1. settled components
2. unresolved decisions
3. option analysis for API/CLI/MCP
4. bootstrap strategies
5. core packet content
6. rule retrieval treatment
7. relation population strategies
8. fallback strategy
9. context receipt as enforcement object
10. mapping current system to broker model

User preference at this point: build both CLI and MCP over shared backend; include plan mode and session summaries.

### T6: Assistant confirms final shape

Assistant recommendation:

1. shared `context-core`
2. CLI + MCP
3. phase-aware retrieval
4. separate run history from durable memory
5. strict external enforcement

### T7: User presents near-final ADR text

User provided a comprehensive "Final Architecture" draft with:

1. component structure
2. full SQL schema
3. retrieval algorithm
4. scope gate logic
5. memory flow
6. sync/health/regress flows
7. core packet

### T8: Assistant provides ADR hardening corrections

Assistant provided five high-value corrections:

1. `coalesce(array_length(...),0)` in non-empty checks
2. explicit `is_stale`
3. `retrieval_version`
4. scope allowlist for generated files
5. memory dedupe check

Assistant also provided a formal ADR structure.

### T9: User requests file capture

User asked for:

1. final ADR into file
2. exhaustive session details into separate file
3. present resulting files

## 9) Tool and Command Activity Log

This section captures command-level activity performed during this session in the working environment.

### Startup compliance pass 1 (earlier in session)

1. Read `AGENTS.md`.
2. Read `.agents-config/docs/AGENT_RULES.md`.
3. Read `.agents-config/docs/CONTEXT_INDEX.json`.
4. Read `.agents-config/docs/AGENT_CONTEXT.md`.
5. Read `.agents/EXECUTION_QUEUE.json`.
6. Read `.agents/MEMORY.md`.
7. Ran `npm run agent:preflight` successfully.

### Startup compliance pass 2 (before writing files)

Re-ran startup sequence before this artifact-writing task:

1. `cat AGENTS.md`
2. `cat .agents-config/docs/AGENT_RULES.md`
3. `cat .agents-config/docs/CONTEXT_INDEX.json`
4. `cat .agents-config/docs/AGENT_CONTEXT.md`
5. `cat .agents/EXECUTION_QUEUE.json`
6. `cat .agents/MEMORY.md`
7. `npm run agent:preflight` (success)

Observed outputs of note:

1. Preflight completed and wrote `.agents/SESSION_BRIEF.json` under external workfiles path.
2. `starship` emitted non-blocking TERM/session-log warnings.

### Timestamp capture

- Ran `date -Is`.
- Captured value: `2026-03-04T08:36:22-05:00`.

### File-write path adjustment

Initial attempt:

1. Attempted to write files under `.agents/records/...`.
2. Failed due sandbox permission denial (symlinked `.agents` resolved outside writable root).

Resolution:

1. Switched output path to repository-local `docs/context-broker/`.
2. Wrote both requested files successfully there.

## 10) Decision Ledger

### Confirmed

1. SQL-only retrieval and memory architecture.
2. Deterministic broker with fail-closed behavior.
3. Shared core with both CLI and MCP interfaces.
4. Phase-aware retrieval (`plan`, `execute`, `review`).
5. Session-run summaries separate from durable memory.

### Guardrails accepted as final quality bar

1. canonical tags normalization
2. strict schema validation
3. evidence-linked memory writes
4. scope-gated completion
5. CI regression and scope checks

## 11) Detailed Reconstruction of User-Provided Architecture Content

This section captures the high-detail architecture content submitted by the user in-session.

### User-provided gap analysis highlights

1. startup is task-blind and over-loads every task
2. no deterministic "where to start" pointer
3. repeated rediscovery across sessions
4. rules are monolithic rather than task-scoped

### User-provided initial schemas and rationale

1. `context_pointers` for path/label/description/tags/relations/hash
2. `agent_memories` for category/subject/content/tags/supersession
3. hash-based staleness preferred over timestamp-only methods
4. no additional heavy tables if avoidable

### User-provided open decision framework

1. broker location options: API vs CLI vs MCP
2. bootstrap population path
3. core packet contents
4. retrieval behavior for `kind='rule'`
5. relation-population strategy
6. empty-retrieval fallback
7. receipt enforcement mechanics
8. mapping from current monolithic docs to new broker strategy

### User-provided complete architecture draft highlights

1. full components list (`context-core`, `ctx-cli`, `ctx-mcp`)
2. expanded schema including run and candidate tables
3. deterministic retrieval algorithm with phase weights
4. completion scope gate + CI mirror check
5. staged memory promotion model
6. sync/health/regression operational commands
7. always-load core packet text

## 12) Complete Turn-by-Turn Dialogue Reconstruction (Near-Verbatim)

Note: This section is intentionally verbose and reproduces each turn as accurately as possible from the session record.

### Turn 1 (User)

- Asked for brainstorming/architecture only.
- Requested Postgres + plain SQL approach without vectors.
- Targeted indexing of prompts/context to avoid loading large boilerplate every run.
- Asked for memory pairing and pointer-driven project navigation.
- Provided detailed analysis of 6,658-word startup overhead, listed gaps, supplied two-table schema draft, runtime flow, and migration concept of what artifacts die/survive.

### Turn 1 (Assistant)

- Confirmed direction was strong.
- Suggested structural refinements while preserving simplicity:
  - stable pointer keys
  - path+anchor split
  - pointer kind classification
  - generated tsvector columns
  - memory confidence/evidence fields

### Turn 2 (User)

- Asked for additional suggestions with emphasis on simplicity, maintainability, speed, low context use, and accuracy.

### Turn 2 (Assistant)

- Proposed:
  - always-load core packet
  - canonical tag dictionary
  - hard retrieval caps
  - strict memory write criteria
  - stale exclusion default
  - context receipt
  - health checks
  - small eval set

### Turn 3 (User)

- Asked how to automate and prevent less-compliant models from breaking the system.

### Turn 3 (Assistant)

- Recommended hard gateway model:
  - no direct SQL
  - deterministic retrieval
  - schema-enforced JSON only
  - DB invariants
  - candidate memory staging
  - git-diff sync
  - receipt scope gate
  - CI enforcement
  - detailed logging

### Turn 4 (User)

- Stated that the design is effectively a context broker.
- Listed settled items and unresolved decisions.
- Compared API/CLI/MCP tradeoffs.
- Added bootstrap options and rule retrieval logic.
- Proposed relation strategies and fallback path.
- Provided receipt example and migration matrix from current workflow.
- Added preference: both CLI and MCP backed by same core; include planning and session summary memory.

### Turn 4 (Assistant)

- Confirmed final recommended shape:
  - shared `context-core`
  - CLI + MCP
  - phase-aware retrieval
  - separate run history from durable memory
  - hard external enforcement
- Offered next step: define exact command/API contracts.

### Turn 5 (User)

- Supplied comprehensive "Final Architecture" draft including:
  - full components
  - SQL schema for four tables
  - retrieval algorithm
  - scope gate
  - memory flow
  - sync/health/regress behavior
  - core packet
- Asked whether format is good and whether assistant would prefer a final ADR format.

### Turn 5 (Assistant)

- Confirmed overview strength.
- Suggested five corrections:
  - robust non-empty array checks
  - explicit stale flag
  - receipt versioning
  - scope exception allowlist
  - memory dedupe
- Returned structured ADR template text.

### Turn 6 (User)

- Requested two file artifacts before implementation:
  1. final ADR captured in file
  2. complete session capture in excruciating detail

### Turn 6 (Assistant)

- Executed required startup checks again.
- Wrote requested artifacts under `docs/context-broker/`.
- Prepared file paths for handoff.

## 13) Scope and Accuracy Notes

1. This document is intentionally exhaustive and includes both decision-level and command-level detail.
2. It captures brainstorming and architecture only; no broker runtime code was implemented in this session.
3. The ADR content captured in companion file reflects the latest hardened version discussed in-session.

## 14) Artifacts Produced by This Request

1. `docs/context-broker/ADR-001-context-broker.md`
2. `docs/context-broker/SESSION-LOG-2026-03-04-context-broker.md` (this file)

