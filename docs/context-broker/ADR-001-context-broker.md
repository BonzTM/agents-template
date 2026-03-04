# ADR-001: Deterministic Context Broker (`ctx`) for LLM Task Context and Memory

- Status: Proposed
- Date: 2026-03-04
- Owners: Human operator + agent maintainers
- Scope: Project-local LLM context retrieval and durable machine-usable memory

## Context

Current agent startup loads large, mostly task-irrelevant context before any task-specific work starts. This creates context-window overhead, repeated rediscovery, and blind file search. We want a simple, maintainable architecture that:

1. Minimizes always-loaded context.
2. Retrieves only task-relevant files/rules/memories.
3. Enforces behavior outside model compliance.
4. Remains human-reviewable and easy to operate.
5. Avoids vector DB dependencies (Postgres + SQL only).

## Decision

Build a deterministic context broker called `ctx` with one shared core implementation and two front doors:

1. `ctx` CLI (primary interface, lowest operational burden).
2. `ctx` MCP server (thin adapter over same core for tool-native models).

No model runtime gets direct SQL access. Models only interact via broker operations and structured JSON contracts.

## Architecture

### Shared Core

`context-core/` provides:

- `queries.ts`: SQL retrieval and upsert logic.
- `validation.ts`: schema checks, canonical tag normalization, input hardening.
- `scoring.ts`: deterministic ranking with phase-specific weights.
- `sync.ts`: git-diff-driven pointer/hash maintenance.
- `health.ts`: index integrity diagnostics.
- `regress.ts`: retrieval evaluation runner.

### Interfaces

#### CLI (`ctx-cli/`)

Commands:

- `ctx get` -> `get_context(task_text, phase, project_id)`
- `ctx propose-memory` -> `propose_memory(receipt_id, payload_json)`
- `ctx report-completion` -> `report_completion(receipt_id, files_changed, outcome)`
- `ctx sync` -> pointer/hash upkeep from git diff
- `ctx health-check` -> integrity and drift report
- `ctx regress` -> retrieval regression suite
- `ctx bootstrap` -> initial pointer candidate generation

#### MCP (`ctx-mcp/`)

Tools:

- `get_context`
- `propose_memory`
- `report_completion`

MCP layer is intentionally thin and delegates all business logic to `context-core`.

## Data Model

### 1) `context_pointers`

Purpose: task entry points for code/docs/tests/rules/commands.

```sql
CREATE TABLE context_pointers (
  id              bigserial PRIMARY KEY,
  project_id      text NOT NULL,
  path            text NOT NULL,
  anchor          text,
  pointer_key     text GENERATED ALWAYS AS (
                    project_id || ':' || path || COALESCE('#' || anchor, '')
                  ) STORED,
  kind            text NOT NULL CHECK (kind IN ('code','rule','doc','test','command')),
  label           text NOT NULL,
  description     text NOT NULL,
  tags            text[] NOT NULL DEFAULT '{}',
  relates_to      text[] NOT NULL DEFAULT '{}',
  content_hash    text,
  is_stale        boolean NOT NULL DEFAULT false,
  search_tsv      tsvector GENERATED ALWAYS AS (
                    to_tsvector('english', coalesce(label,'') || ' ' || coalesce(description,''))
                  ) STORED,
  UNIQUE (pointer_key)
);

CREATE INDEX idx_pointers_project ON context_pointers(project_id);
CREATE INDEX idx_pointers_tags ON context_pointers USING gin(tags);
CREATE INDEX idx_pointers_search ON context_pointers USING gin(search_tsv);
CREATE INDEX idx_pointers_kind ON context_pointers(project_id, kind);
```

### 2) `agent_memories`

Purpose: durable, curated facts learned from completed work.

```sql
CREATE TABLE agent_memories (
  id                    bigserial PRIMARY KEY,
  project_id            text NOT NULL,
  category              text NOT NULL CHECK (category IN ('decision','gotcha','pattern','preference')),
  subject               text NOT NULL,
  content               text NOT NULL CHECK (char_length(content) <= 600),
  related_pointer_keys  text[] NOT NULL DEFAULT '{}',
  tags                  text[] NOT NULL DEFAULT '{}',
  confidence            smallint NOT NULL DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  evidence_pointer_keys text[] NOT NULL DEFAULT '{}'
                        CHECK (coalesce(array_length(evidence_pointer_keys, 1), 0) >= 1),
  dedupe_key            text,
  superseded_by         bigint REFERENCES agent_memories(id),
  search_tsv            tsvector GENERATED ALWAYS AS (
                          to_tsvector('english', coalesce(subject,'') || ' ' || coalesce(content,''))
                        ) STORED
);

CREATE UNIQUE INDEX uq_memories_dedupe_key ON agent_memories(project_id, dedupe_key)
WHERE dedupe_key IS NOT NULL;

CREATE INDEX idx_memories_project_active
  ON agent_memories(project_id) WHERE superseded_by IS NULL;
CREATE INDEX idx_memories_tags ON agent_memories USING gin(tags);
CREATE INDEX idx_memories_search ON agent_memories USING gin(search_tsv);
```

### 3) `agent_runs`

Purpose: append-only session/run summaries for human review and "reference last session" context.

```sql
CREATE TABLE agent_runs (
  id                bigserial PRIMARY KEY,
  project_id        text NOT NULL,
  task_text         text NOT NULL,
  phase             text NOT NULL CHECK (phase IN ('plan','execute','review')),
  resolved_tags     text[] NOT NULL,
  receipt           jsonb NOT NULL,
  receipt_id        text NOT NULL,
  retrieval_version text NOT NULL,
  outcome           text,
  files_changed     text[] DEFAULT '{}',
  pointers_updated  text[] DEFAULT '{}',
  memories_proposed int[] DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_runs_project ON agent_runs(project_id, created_at DESC);
CREATE UNIQUE INDEX uq_runs_receipt_id ON agent_runs(project_id, receipt_id);
```

### 4) `memory_candidates`

Purpose: two-stage memory ingestion and quarantine.

```sql
CREATE TABLE memory_candidates (
  id                    bigserial PRIMARY KEY,
  run_id                bigint REFERENCES agent_runs(id),
  project_id            text NOT NULL,
  category              text NOT NULL CHECK (category IN ('decision','gotcha','pattern','preference')),
  subject               text NOT NULL,
  content               text NOT NULL CHECK (char_length(content) <= 600),
  related_pointer_keys  text[] NOT NULL DEFAULT '{}',
  tags                  text[] NOT NULL DEFAULT '{}',
  confidence            smallint NOT NULL DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  evidence_pointer_keys text[] NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(evidence_pointer_keys,1),0) >= 1),
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','promoted','rejected')),
  promoted_to           bigint REFERENCES agent_memories(id),
  rejection_reason      text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
```

## Canonical Tags

Use one human-owned `canonical_tags.json` file (not a DB table). All retrieval and write paths normalize tags through this dictionary.

## Retrieval Contract

`get_context(task_text, phase='execute', project_id)`:

1. Normalize task text into 3-6 canonical tags.
2. Query fresh candidates where `(tags overlap OR FTS match)` and `is_stale = false`.
3. Score deterministically:
   - `base = tag_overlap_count*10 + ts_rank*5`
   - phase weights:
     - `plan`: rule*3, doc*2, code*1
     - `execute`: code*3, test*2, rule*1
     - `review`: rule*3, test*2, code*1
4. Split `rule` vs non-rule.
5. Include all matching rules (uncapped).
6. Include top non-rules capped at 8.
7. Expand one hop via `relates_to` for non-rules, cap +5.
8. Fetch active memories by selected pointer keys and tags, confidence-ranked, cap 6.
9. If fewer than 2 pointers, widen once to FTS-only; if still fewer than 2, return `insufficient_context`.
10. Return context receipt with `receipt_id`, `retrieval_version`, selected artifacts, reasons, and budget accounting.

## Scope Gate Enforcement

`report_completion(receipt_id, files_changed, outcome)` enforces:

1. `files_changed` must be subset of receipt pointer paths.
2. Allow configured generated-file exceptions.
3. Violations return rejection and require re-retrieval.
4. CI repeats same scope check and blocks merge on violation.

## Memory Ingestion Contract

`propose_memory(receipt_id, payload_json)`:

1. Validate strict schema.
2. Require non-empty evidence pointers that resolve to real pointers.
3. Enforce canonical tags and confidence range.
4. Compute `dedupe_key` and reject duplicate durable memory.
5. Insert into `memory_candidates`.
6. Promote only when validation policy passes.

## Automation

### `ctx sync --changed`

- Read changed paths from git diff.
- Recompute hashes.
- Mark stale/fresh and upsert pointers.
- Insert candidates for new files by conventions.
- Keep deleted pointers but mark stale.

### `ctx health-check`

Reports:

- stale pointers
- orphan relations
- unknown tags
- duplicate labels by project
- empty descriptions
- weak/unsupported memories
- pending quarantines

### `ctx regress`

- Read `eval_suite.json`.
- Run `get_context` for each test case.
- Score precision/recall/F1.
- Fail CI if aggregate recall below threshold.

## Always-Load Core Packet

Load a small packet (~150 words) for every task:

1. Project identity.
2. Broker operations.
3. Scope and structured I/O rules.
4. Required loop: classify -> retrieve -> execute -> update.
5. `insufficient_context` fallback behavior.
6. Tag dictionary location.

## Consequences

### Benefits

1. Major context-window reduction.
2. Deterministic, auditable retrieval.
3. Model non-compliance is contained by external gates.
4. Strong human operability via logs, health checks, and run summaries.

### Tradeoffs

1. Requires curation quality of pointers/tags.
2. Requires eval suite upkeep.
3. Adds broker tooling surface (CLI + MCP).

## Rollout Plan

1. Implement schema + `context-core` + CLI (`get`, `propose-memory`, `report-completion`).
2. Add sync, health-check, regress.
3. Add MCP adapter over same core.
4. Add CI gates (scope + regression threshold).
5. Pilot in one project, then templatize.

## Rejected Alternatives

1. Full monolithic startup docs on every task: rejected for token cost.
2. Direct SQL by model runtime: rejected for safety/compliance.
3. Vector search dependency: rejected for simplicity and operational scope.

