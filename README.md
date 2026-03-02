# agents-template

Reusable agent-governance scaffold for multi-project bootstrap.

This template provides policy-as-code enforcement, startup/preflight contracts, queue lifecycle tooling, index/readiness checks, and release-note workflow scaffolding.

## Agent Clients

- `.agents-config/AGENTS_TEMPLATE.md` is the downstream cross-agent startup-contract source and is synced as downstream `AGENTS.md`.
- Downstream projects can choose local AGENTS mode by filename:
- `AGENTS.override.md` for full replacement mode.
- `AGENTS.append.md` for additive mode (read after canonical `AGENTS.md` when no `.override.md` is present).
- `.agents-config/templates/CLAUDE.md` is the downstream Claude bootstrap source and is synced as downstream `CLAUDE.md`.
- Managed workflow/template contracts are authored in `.agents-config/tools/bootstrap/managed-files.template.json` and materialized per repo in `.agents-config/agent-managed.json`.
- `AGENTS.md` and `CLAUDE.md` are repository-local maintainer instructions for `agents-template` itself.

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
- `--profiles base,typescript[,typescript-openapi][,javascript][,python]`
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
- `typescript`: route-map/domain-readme/jsdoc/logging/feature-index contracts for TS web/backend repos.
- `typescript-openapi`: OpenAPI coverage contract; implies `typescript`.
- `javascript`: route-map/domain-readme/jsdoc/logging/feature-index contracts for JS web/backend repos.
- `python`: reserved for Python-specific contracts (no additional seeded artifacts yet).
- Bootstrap writes profile-relevant npm scripts only; inactive profile script entries are removed when they still match template-managed values.

## Bootstrap Inside an Existing Target Repo

Apply bootstrap wiring to an existing repo from `agents-template` root:

```bash
npm run bootstrap -- --mode existing --target-path ../<project-name> --project-id <project-id>
```

Prerequisites for existing-mode bootstrap:

- Base profile requires `.agents-config/config/project-tooling.json`.
- `typescript`/`javascript` profiles require `.agents-config/docs/FEATURE_INDEX.json` and `.agents-config/policies/logging-compliance-baseline.json`.

## One-Command Downstream Sync (Recommended)

From the downstream repo root, run:

```bash
npm run agent:sync
```

What `agent:sync` does:

- runs existing-mode bootstrap against the current repo using profile/template settings from `.agents-config/agent-managed.json`
- runs managed workflow fix/recheck
- runs canonical rules sync (`npm run rules:canonical:sync`) to refresh local canonical override payloads when derivation drifts
- runs policy check
- runs session preflight

Common flags:

- `--prefer-remote` (forwarded to `agent:managed -- --fix --recheck`)
- `--template-ref <ref>` (temporarily override template ref for this run)
- `--template-repo <owner/repo>` (temporarily override template repo for this run)
- `--profiles <csv>` (temporarily override active profiles for this run)

## Canonical + Overrides Model

- Managed workflow files are declared in `.agents-config/agent-managed.json`.
- Canonical source is declared in `.agents-config/agent-managed.json` (`template.repo`, `template.ref`, `template.localPath`) and seeded from `.agents-config/tools/bootstrap/managed-files.template.json`.
- Managed file authority defaults to template-canonical via `.agents-config/agent-managed.json.canonical_contract.default_authority = "template"`.
- `AGENTS.md` is canonical/template-managed.
- Local AGENTS mode selection is filename-driven in downstream repos:
- `AGENTS.override.md` means full replacement mode.
- `AGENTS.append.md` means additive mode.
- Known override surfaces are explicit: managed entries must set `allow_override: true` before override payload files are accepted.
- Override payloads default to adjacent files next to managed targets (`<managed-file>.override.<ext>` for full replacement and `<managed-file>.append.<ext>` for additive merge), and can be remapped per entry via `override_path`.
- Override payloads are template-authority only: `allow_override: true` is not valid for `project` or `structured` entries.
- For one managed path, choose one override mode only (`.override` or `.append`).
- Bootstrap does not auto-seed managed override payloads; overrides are opt-in local artifacts.
- Existing-mode bootstrap preserves non-template managed files (`project` and `structured`) when local content differs from the template seed source.
- Unknown/non-allowlisted override payload files (adjacent `.override`/`.append`) fail `npm run agent:managed -- --mode check`; deprecated `.replace` payload names are rejected.
- Project-specific tooling defaults live in `.agents-config/config/project-tooling.json` (project-owned) while `.agents-config/scripts/generate-release-notes.mjs` and `.agents-config/scripts/verify-logging-compliance.mjs` remain template-owned.
- `release:notes` accepts optional `--summary`, repeatable `--known-issue`, and repeatable `--compat-note`; it validates semver-without-`v` and verifies `--from`/`--to` commit refs.
- `release:notes` prefers `git remote.origin.url` for compare links and falls back to `.agents-config/config/project-tooling.json.releaseNotes.defaultRepoWebUrl`.
- `logging:compliance:*` baseline metadata identity is sourced from `.agents-config/config/project-tooling.json.loggingCompliance.baselineMetadataId`.
- Optional non-template ownership can be declared per entry:
- `authority: "project"` for seed-once project-local files.
- `authority: "structured"` for template-defined section/key contracts where project content remains local.
- Structured markdown contracts may add `placeholder_patterns` with `placeholder_failure_mode` (`warn` or `fail`) to surface unfilled template text in required sections.
- Structured JSON contracts may add `forbidden_paths` to prune deprecated machine-only keys during sync while preserving project-local values for required paths.
- Project-specific architecture and process details should be maintained in local docs/policy files, not hard-forked template scripts.

### Canonical Rule IDs

- Canonical rule IDs/statements live in `.agents-config/contracts/rules/canonical-ruleset.json`.
- `.agents-config/contracts/rules/canonical-ruleset.json` is template-managed; downstream local derivations are refreshed via adjacent override payload `.agents-config/contracts/rules/canonical-ruleset.override.json` when `npm run rules:canonical:sync` runs.
- Required rule IDs and required context-index command keys are profile-scoped via `contracts.ruleCatalog.requiredIdsByProfile` and `contracts.contextIndex.requiredCommandKeysByProfile`.
- Drift is checked by ID + hash lineage against policy/doc sources with `npm run rules:canonical:verify`.
- Template maintainers can regenerate canonical lineage after intentional policy/rule changes with `npm run rules:canonical:sync`.
- Project-local rule overrides (local-only IDs) must use `.agents-config/rule-overrides.json` and validate against `.agents-config/rule-overrides.schema.json`.

## Drift Controls

Perform full downstream template sync/fix/verify:

```bash
npm run agent:sync
```

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
- if a local `.agents` directory exists, bootstrap migrates it into canonical external storage and keeps a timestamped local backup (`.agents.backup-<timestamp>`)

Local mode:

- pass `--agents-mode local`
- `.agents` is a local directory inside the project repository
- if `.agents` is currently a symlink, bootstrap de-symlinks and copies current canonical state into local `.agents`

## Template Repo Local Conventions

For this `agents-template` repository itself:

- use `.agents -> ../agents-workfiles/agents-template` for local template-maintainer context
- keep `.agents-config/templates/agents/` as the tracked scaffold used by bootstrap to seed downstream `.agents` structure
- keep template-maintainer-only guidance in local `AGENTS.md` and local `CLAUDE.md`
- do not target this repository when running `npm run bootstrap`
