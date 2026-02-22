# agents-template

Reusable agent-governance scaffold for multi-project bootstrap.

This template provides policy-as-code enforcement, startup/preflight contracts, queue lifecycle tooling, index/readiness checks, and release-note workflow scaffolding.

## Agent Clients

- `AGENTS_TEMPLATE.md` is the downstream cross-agent startup-contract source and is synced as downstream `AGENTS.md`.
- `.claude-template/CLAUDE.md` is the downstream Claude bootstrap source and is synced as downstream `.claude/CLAUDE.md`.
- `AGENTS.md` and `.claude/CLAUDE.md` are repository-local maintainer instructions for `agents-template` itself.

## One-Command Bootstrap (Recommended)

From `agents-template` root, bootstrap a sibling project at `../<project-name>`:

```bash
npm run bootstrap -- --project-name <project-name>
```

Default behavior:

- target repo path: `../<project-name>`
- profiles: `base`
- agents mode: `external`
- agents workfiles path: `../agents-workfiles`
- canonical agents root: `../agents-workfiles/<project-id>`
- project `.agents` is symlinked to that canonical path
- preflight runs automatically at the end

Common flags:

- `--mode new|existing` (`new` default)
- `--profiles base,node-web`
- `--agents-workfiles-path <relative-path>` (default: `../agents-workfiles`)
- `--agents-mode external|local` (`external` default, `local` for repo-local `.agents`)
- `--project-id <project-id>`
- `--repo-owner <owner>`
- `--repo-name <repo>`
- `--target-path ../custom-path`
- `--skip-preflight`

### What Is `project-id`?

`project-id` is the stable identifier for agent workflow state and policy metadata. It is used for things like:

- canonical agents/workfiles path (for example `../agents-workfiles/<project-id>`)
- policy/context metadata IDs (for example `<project-id>-agent-governance`)

If omitted, bootstrap derives it from the target project name/path. Use an explicit `--project-id` when you want a stable value that does not change even if repo naming changes.

Profile summary:

- `base`: core orchestrator/subagent governance, queue, preflight, policy checks.
- `node-web`: route-map/domain-readme/jsdoc/logging/feature-index contracts.
  Use this after Node backend/frontend source roots are present; start with `base` for greenfield non-Node or not-yet-scaffolded repos.

## Bootstrap Inside an Existing Target Repo

Apply bootstrap wiring to an existing repo from `agents-template` root:

```bash
npm run bootstrap -- --mode existing --target-path ../<project-name> --project-id <project-id>
```

## Canonical + Overrides Model

- Managed workflow files are declared in `.agent-managed.json`.
- Canonical source is declared in `.agent-managed.json` (`template.repo`, `template.ref`, `template.localPath`) and seeded from `tools/bootstrap/managed-files.template.json`.
- Per-project overrides live in `.agent-overrides/**` and win over template defaults.
- Project-specific architecture and process details should be maintained in local docs/policy files, not hard-forked template scripts.

### Canonical Rule IDs

- Canonical rule IDs/statements live in `contracts/rules/canonical-ruleset.json`.
- Drift is checked by ID + hash lineage against policy/doc sources with `npm run rules:canonical:verify`.
- Template maintainers can regenerate canonical lineage after intentional policy/rule changes with `npm run rules:canonical:sync`.
- Project-local rule overrides (local-only IDs) must use `.agent-overrides/rule-overrides.json` and validate against `.agent-overrides/rule-overrides.schema.json`.

## Drift Controls

Check managed workflow drift:

```bash
npm run agent:managed -- --mode check
```

Fix managed workflow drift and re-check:

```bash
npm run agent:managed -- --fix --recheck
```

PR declaration gate for meaningful workflow changes:

```bash
npm run agent:template-impact:check -- --base-ref origin/main
```

PRs touching meaningful workflow paths must include one of:

- `Template-Impact: yes` and `Template-Ref: <link-or-ref>`
- `Template-Impact: none` and `Template-Impact-Reason: <why>`

## Agent State Placement

External mode (recommended):

- bootstrap defaults to `--agents-workfiles-path ../agents-workfiles`
- pass `--agents-workfiles-path <relative-path>` to customize
- canonical runtime state becomes `<relative-path>/<project-id>`
- repo-local `.agents` is a symlink to that external path

Local mode:

- pass `--agents-mode local`
- `.agents` is a local directory inside the project repository

## Template Repo Local Conventions

For this `agents-template` repository itself:

- use `.agents -> ../agents-workfiles/agents-template` for local template-maintainer context
- keep `.agents-template/` as the tracked scaffold used by bootstrap to seed downstream `.agents` structure
- keep template-maintainer-only guidance in local `AGENTS.md` and local `.claude/CLAUDE.md`
- do not target this repository when running `npm run bootstrap`
