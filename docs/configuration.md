# Configuration & Profiles

Detailed reference for bootstrap flags, profiles, and configuration options.

## Bootstrap Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--project-name <name>` | *(required for new mode)* | Name of the target project; target path defaults to `../<name>` |
| `--mode new\|existing` | `new` | `new` creates a fresh project; `existing` wires into an existing repo |
| `--profiles <csv>` | `base` | Comma-separated list of profiles to activate |
| `--target-path <path>` | `../<project-name>` | Relative path to the target project directory |
| `--project-id <id>` | derived from project name | Stable identifier for agent state and policy metadata |
| `--agents-mode external\|local` | `external` | Where `.agents` state lives (see [Architecture](architecture.md#agent-state-placement)) |
| `--agents-workfiles-path <path>` | `../agents-workfiles` | Root directory for external agent workfiles |
| `--repo-owner <owner>` | — | GitHub repository owner (for PR template links, etc.) |
| `--repo-name <repo>` | — | GitHub repository name |
| `--skip-preflight` | — | Skip the automatic preflight check after bootstrap |

## What Is `project-id`?

`project-id` is the stable identifier for agent workflow state and policy metadata. It is used for:

- Canonical agents/workfiles path (e.g. `../agents-workfiles/<project-id>`)
- Policy/context metadata IDs (e.g. `<project-id>-agent-governance`)

If omitted, bootstrap derives it from the target project name/path. Use an explicit `--project-id` when you want a stable value that does not change even if repo naming changes.

## Profiles

### `base`

Core orchestrator/subagent governance, queue lifecycle, preflight, policy checks. Included in every project.

### `typescript`

Adds contracts for TypeScript web/backend repos:

- Route map generation and verification
- Per-domain start-here READMEs (`backend/src/routes/`, `backend/src/services/`, `frontend/features/`)
- JSDoc coverage tracking
- Logging compliance verification
- Feature index and test matrix

### `typescript-openapi`

Adds OpenAPI endpoint/spec coverage tracking. Implies `typescript` — you do not need to list both.

### `javascript`

Same contracts as `typescript`, but for JavaScript repos:

- Route map, domain READMEs, JSDoc coverage, logging compliance, feature index, test matrix

### `python`

Reserved for Python-specific contracts. Currently activates `base` only — no additional seeded artifacts yet.

### Profile-Aware Script Management

Bootstrap writes profile-relevant npm scripts only. Inactive profile script entries are removed when they still match template-managed values, keeping `package.json` clean.

## Existing-Mode Bootstrap

Apply bootstrap wiring to an existing repo from `agents-template` root:

```bash
npm run bootstrap -- --mode existing --target-path ../<project-name> --project-id <project-id>
```

### Prerequisites

| Profile | Required Files |
|---------|---------------|
| `base` | `.agents-config/config/project-tooling.json` |
| `typescript` / `javascript` | `.agents-config/docs/FEATURE_INDEX.json` and `.agents-config/policies/logging-compliance-baseline.json` |

Existing-mode bootstrap preserves non-template managed files (`project` and `structured` authority) when local content differs from the template seed source. This means your project-specific configuration is not overwritten.

## Agent State Placement

### External mode (default, recommended)

- Bootstrap defaults to `--agents-workfiles-path ../agents-workfiles`
- Canonical runtime state lives at `<agents-workfiles-path>/<project-id>`
- Repo-local `.agents` is a symlink to that external path
- If a local `.agents` directory already exists, bootstrap migrates it into canonical external storage and keeps a timestamped backup (`.agents.backup-<timestamp>`)

### Local mode

- Pass `--agents-mode local`
- `.agents` is a regular directory inside the project repository
- If `.agents` is currently a symlink, bootstrap de-symlinks and copies current canonical state into local `.agents`
