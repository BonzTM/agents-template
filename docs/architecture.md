# Architecture & Concepts

How the agents-template system works under the hood.

## Template vs Downstream

This repository (`agents-template`) is the **upstream governance template**. It contains:

- **Local maintainer files** — `AGENTS.md` and `CLAUDE.md` at the repo root are instructions for maintaining `agents-template` itself. They are *not* pushed downstream.
- **Downstream template sources** — files in `.agents-config/templates/` are what bootstrap copies into target projects:
  - `.agents-config/templates/AGENTS.md` → downstream `AGENTS.md`
  - `.agents-config/templates/CLAUDE.md` → downstream `CLAUDE.md`

When you run `npm run bootstrap`, the template sources are materialized in the target project alongside all managed governance files.

## Canonical + Overrides Model

Managed workflow files are declared in `.agents-config/agent-managed.json` and seeded from `.agents-config/tools/bootstrap/managed-files.template.json`.

### File Authority Modes

Each managed file has an authority mode that controls how sync behaves:

| Authority | Behavior |
|-----------|----------|
| `template` | Template-canonical. Overwritten on every sync. Default for most files. |
| `project` | Seeded once by bootstrap, then owned by the project. Not overwritten if local content differs. |
| `structured` | Template defines the schema/structure contract; project owns the content within that structure. |

The default authority is `template`, declared in `.agents-config/agent-managed.json` under `canonical_contract.default_authority`.

### Override Payloads

Template-authority managed files can optionally accept local overrides when the manifest entry sets `allow_override: true`:

- **Full replacement**: `<managed-file>.override.<ext>` — replaces the managed file entirely
- **Additive merge**: `<managed-file>.append.<ext>` — appended after the canonical content

Rules:
- `allow_override: true` is only valid for `template`-authority entries — `project` and `structured` entries cannot have overrides
- Only one override mode per managed path (`.override` *or* `.append`, not both)
- Override payloads default to adjacent files; per-entry `override_path` can remap the location
- Override payloads are opt-in local artifacts — bootstrap does not auto-seed them
- Unknown or non-allowlisted override files fail `npm run agent:managed -- --mode check`
- Deprecated `.replace` payload names are rejected

### AGENTS.md Downstream Override

Downstream projects can customize their AGENTS contract via filename:

- `AGENTS.override.md` — full replacement mode (canonical `AGENTS.md` is ignored)
- `AGENTS.append.md` — additive mode (read after canonical `AGENTS.md`)

### Structured Contracts

- **Structured markdown**: Can declare `placeholder_patterns` with `placeholder_failure_mode` (`warn` or `fail`) to surface unfilled template text in required sections.
- **Structured JSON**: Can declare `forbidden_paths` to prune deprecated machine-only keys during sync while preserving project-local values for required paths.

## Canonical Rule IDs

Canonical rule IDs and statements live in `.agents-config/contracts/rules/canonical-ruleset.json` (template-managed).

- Required rule IDs and context-index command keys are profile-scoped via `contracts.ruleCatalog.requiredIdsByProfile` and `contracts.contextIndex.requiredCommandKeysByProfile`
- Drift is checked by ID + hash lineage against policy/doc sources with `npm run rules:canonical:verify`
- Template maintainers regenerate canonical lineage after intentional policy/rule changes with `npm run rules:canonical:sync`
- When local profile/policy derivation diverges, `rules:canonical:sync` refreshes the adjacent override payload `.agents-config/contracts/rules/canonical-ruleset.override.json`
- Project-local rule overrides (local-only IDs) use `.agents-config/rule-overrides.json`, validated against `.agents-config/rule-overrides.schema.json`

## The `.agents-config/` Directory

This is the governance and tooling hub. Key subdirectories:

```
.agents-config/
├── agent-managed.json          # Managed files manifest
├── rule-overrides.schema.json  # Schema for local rule overrides
├── config/
│   └── project-tooling.json    # Project-specific tooling defaults
├── contracts/
│   └── rules/
│       └── canonical-ruleset.json  # Canonical rule IDs + hash lineage
├── docs/
│   ├── AGENT_RULES.md          # Human-readable behavioral contract
│   ├── AGENT_CONTEXT.md        # Project/architecture context for agents
│   ├── CONTEXT_INDEX.json      # Machine-readable context map
│   ├── RELEASE_NOTES_TEMPLATE.md
│   ├── FEATURE_INDEX.json      # (typescript/javascript profiles)
│   ├── TEST_MATRIX.md          # (typescript/javascript profiles)
│   ├── ROUTE_MAP.md            # (typescript/javascript profiles)
│   ├── JSDOC_COVERAGE.md       # (typescript/javascript profiles)
│   ├── OPENAPI_COVERAGE.md     # (typescript-openapi profile)
│   └── LOGGING_STANDARDS.md    # (typescript/javascript profiles)
├── policies/
│   └── agent-governance.json   # Machine-readable policy manifest
├── scripts/                    # Enforcement and lifecycle scripts
├── templates/
│   ├── AGENTS.md               # Downstream AGENTS.md source
│   ├── CLAUDE.md               # Downstream CLAUDE.md source
│   └── agents/                 # Scaffold for .agents directory
└── tools/
    ├── bootstrap/              # Bootstrap, sync, and managed-file tools
    ├── docs/                   # Doc generation tools
    └── rules/                  # Ruleset verification tools
```

## The `.agents/` Directory

This is the agent runtime workspace — session state, queues, plans, and memory. It is created by bootstrap and is typically external (symlinked).

```
.agents/
├── MEMORY.md                   # Canonical memory reference + submemory index
├── SESSION_LOG.md              # Timestamped implementation trace
├── SESSION_BRIEF.json          # Generated by preflight
├── EXECUTION_QUEUE.json        # Active task queue
├── EXECUTION_ARCHIVE_INDEX.json
├── memory/                     # Submemory directories (mNNN/_submemory.md)
├── archives/                   # Completed feature archives (.jsonl)
├── plans/
│   ├── current/                # Active feature plans (PLAN.json)
│   ├── deferred/               # Deferred plans
│   └── archived/               # Completed plans
└── index/
```

## Agent State Placement

See [Configuration — Agent State Placement](configuration.md#agent-state-placement) for the difference between external and local mode.

## Policy-as-Code

Agent behavior is enforced by executable checks, not just prose guidance:

- **Policy manifest**: `.agents-config/policies/agent-governance.json` — canonical enforceable contracts
- **Enforcement runner**: `.agents-config/scripts/enforce-agent-policies.mjs`
- **Session preflight**: `.agents-config/scripts/agent-session-preflight.mjs` — validates plan/queue state, generates `SESSION_BRIEF.json`

These checks run locally via npm scripts and in CI via the `pr-checks.yml` workflow. See [How It Works](how-it-works.md) for what the key rules are and how enforcement works, [Commands](commands.md) for the full command list, and [CI Integration](ci-integration.md) for the workflow details.
