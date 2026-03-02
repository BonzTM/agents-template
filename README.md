# agents-template

Reusable agent-governance scaffold that bootstraps multi-project repos with policy-as-code enforcement, startup/preflight contracts, queue lifecycle tooling, managed-file drift controls, and release-note workflow scaffolding — so every downstream project gets consistent LLM agent behavior out of the box.

## Prerequisites

- **Node.js** 20+
- **git**
- **npm**

## Quick Start

### 1. Clone this repo

```bash
git clone <this-repo-url>
cd agents-template
```

### 2. Install dependencies

```bash
npm install
```

### 3. Bootstrap a new project

```bash
npm run bootstrap -- --project-name my-project
```

This creates `../my-project` with all governance files, an `.agents` workspace (symlinked to `../agents-workfiles/my-project`), and npm scripts for policy checks, sync, and preflight.

### 4. Verify the target project

```bash
cd ../my-project
npm run agent:preflight
```

Preflight validates plan/queue state and generates a session brief. A clean run means the project is ready.

### 5. Start working

Agents read `AGENTS.md` at session start, follow the startup sequence, and use the governance tooling automatically. See [Architecture](docs/architecture.md) for how the system works.

## What Bootstrap Creates

```
my-project/
├── AGENTS.md                       # Agent startup contract
├── CLAUDE.md                       # Claude-specific instructions
├── .agents -> ../agents-workfiles/my-project/  # Agent runtime workspace (symlink)
│   ├── MEMORY.md                   # Persistent memory + submemory index
│   ├── EXECUTION_QUEUE.json        # Task queue
│   ├── SESSION_LOG.md              # Implementation trace
│   ├── memory/                     # Submemory directories
│   ├── plans/                      # Feature plans (current/deferred/archived)
│   └── archives/                   # Completed feature archives
├── .agents-config/
│   ├── agent-managed.json          # Managed files manifest
│   ├── config/
│   │   └── project-tooling.json    # Project-specific defaults
│   ├── contracts/rules/
│   │   └── canonical-ruleset.json  # Canonical rule IDs
│   ├── docs/
│   │   ├── AGENT_RULES.md          # Behavioral contract
│   │   ├── AGENT_CONTEXT.md        # Project context for agents
│   │   └── CONTEXT_INDEX.json      # Machine-readable context map
│   ├── policies/
│   │   └── agent-governance.json   # Policy-as-code manifest
│   ├── scripts/                    # Enforcement & lifecycle scripts
│   └── tools/                      # Bootstrap, sync, doc-gen tools
├── .github/
│   ├── workflows/pr-checks.yml     # CI governance checks
│   └── PULL_REQUEST_TEMPLATE.md    # PR template with impact declaration
└── package.json                    # Includes governance npm scripts
```

## Keeping in Sync

From a downstream project, pull the latest template changes with one command:

```bash
npm run agent:sync
```

This re-bootstraps from the template, fixes managed file drift, syncs canonical rules, runs policy checks, and runs preflight. See [Commands](docs/commands.md) for `agent:sync` flags.

## Profiles

| Profile | What it adds |
|---------|-------------|
| `base` | Core governance, queue lifecycle, preflight, policy checks |
| `typescript` | Route map, domain READMEs, JSDoc coverage, logging compliance, feature index, test matrix |
| `typescript-openapi` | OpenAPI coverage tracking (implies `typescript`) |
| `javascript` | Same as `typescript`, for JS repos |
| `python` | Reserved for Python contracts (base only, no additional artifacts yet) |

Activate profiles with `--profiles base,typescript`:

```bash
npm run bootstrap -- --project-name my-project --profiles base,typescript
```

See [Configuration & Profiles](docs/configuration.md) for profile details and all bootstrap flags.

## Bootstrap Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--project-name <name>` | *(required)* | Target project name |
| `--mode new\|existing` | `new` | Create new or wire into existing repo |
| `--profiles <csv>` | `base` | Profiles to activate |
| `--target-path <path>` | `../<name>` | Custom target path |
| `--project-id <id>` | derived | Stable ID for agent state |
| `--agents-mode external\|local` | `external` | Agent state placement |
| `--skip-preflight` | — | Skip post-bootstrap preflight |

See [Configuration](docs/configuration.md) for the complete flag reference, `project-id` explanation, and agent state placement options.

## Existing Project Bootstrap

Apply governance wiring to an existing repo:

```bash
npm run bootstrap -- --mode existing --target-path ../<project-name> --project-id <project-id>
```

Prerequisites vary by profile — see [Configuration](docs/configuration.md#existing-mode-bootstrap) for details.

## Further Reading

- [Configuration & Profiles](docs/configuration.md) — all flags, profile details, agent state placement
- [Architecture & Concepts](docs/architecture.md) — template vs downstream, canonical+overrides model, directory structure
- [Command Reference](docs/commands.md) — all npm scripts grouped by category
- [CI Integration](docs/ci-integration.md) — PR checks workflow, template-impact declaration
- [Troubleshooting](docs/troubleshooting.md) — common issues and fixes

## Template Repo Conventions

For this `agents-template` repository itself:

- `AGENTS.md` and `CLAUDE.md` at the root are local maintainer instructions — not pushed downstream
- `.agents-config/templates/AGENTS.md` is the downstream agent contract source
- `.agents-config/templates/CLAUDE.md` is the downstream Claude bootstrap source
- Managed workflow/template contracts are authored in `.agents-config/tools/bootstrap/managed-files.template.json` and materialized per repo in `.agents-config/agent-managed.json`
- Keep `.agents-config/templates/agents/` as the tracked scaffold used by bootstrap to seed downstream `.agents` structure
- Use `.agents -> ../agents-workfiles/agents-template` for local template-maintainer context
- Do not target this repository when running `npm run bootstrap`
