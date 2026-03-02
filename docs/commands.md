# Command Reference

All npm scripts available in agents-template projects, grouped by category.

## Bootstrap & Sync

| Command | Description |
|---------|-------------|
| `npm run bootstrap -- --project-name <name>` | Bootstrap a new sibling project at `../<name>` |
| `npm run bootstrap -- --mode existing --target-path <path> --project-id <id>` | Apply bootstrap wiring to an existing repo |
| `npm run agent:sync` | Full downstream sync: re-bootstrap + managed fix + rules sync + policy check + preflight |

### `agent:sync` Flags

| Flag | Description |
|------|-------------|
| `--prefer-remote` | Forwarded to `agent:managed -- --fix --recheck` |
| `--template-ref <ref>` | Temporarily override template ref for this run |
| `--template-repo <owner/repo>` | Temporarily override template repo for this run |
| `--profiles <csv>` | Temporarily override active profiles for this run |

See [Configuration](configuration.md) for all bootstrap flags.

## Governance & Policy

| Command | Description |
|---------|-------------|
| `npm run policy:check` | Run policy enforcement checks locally |
| `npm run policy:check:ci` | Run policy checks in CI mode |
| `npm run rules:canonical:verify` | Verify canonical ruleset hash lineage against policy/doc sources |
| `npm run rules:canonical:sync` | Regenerate canonical ruleset lineage after intentional changes |
| `npm run agent:preflight` | Run session preflight — validates plan/queue state, generates `SESSION_BRIEF.json` |

## Managed Files

| Command | Description |
|---------|-------------|
| `npm run agent:managed -- --mode check` | Check for managed workflow drift |
| `npm run agent:managed -- --fix --recheck` | Fix managed drift and re-check |
| `npm run agent:template-impact:check -- --base-ref origin/main` | Check PR for template-impact declaration |

## Queue Lifecycle

| Command | Description |
|---------|-------------|
| `npm run agent:queue:open -- <args>` | Open a new queue item |
| `npm run agent:queue:start -- <args>` | Mark a queue item as started |
| `npm run agent:queue:complete -- <args>` | Mark a queue item as complete |
| `npm run agent:queue:close-feature -- <args>` | Close out a feature in the queue |
| `npm run agent:queue:verify-evidence:check` | Check queue verification evidence |
| `npm run agent:queue:verify-evidence:write` | Write queue verification evidence |

## Agent Utilities

| Command | Description |
|---------|-------------|
| `npm run agent:payload:stub -- --help` | Generate a subagent payload stub |

## Documentation & Coverage (Profile-Specific)

These commands are available when `typescript`, `typescript-openapi`, or `javascript` profiles are active.

| Command | Profile | Description |
|---------|---------|-------------|
| `npm run feature-index:verify` | typescript, javascript | Verify feature index consistency |
| `npm run route-map:generate` | typescript, javascript | Generate route map from source |
| `npm run route-map:verify` | typescript, javascript | Verify route map is current |
| `npm run domain-readmes:generate` | typescript, javascript | Generate per-domain start-here READMEs |
| `npm run domain-readmes:verify` | typescript, javascript | Verify domain READMEs are current |
| `npm run jsdoc-coverage:generate` | typescript, javascript | Generate JSDoc coverage report |
| `npm run jsdoc-coverage:verify` | typescript, javascript | Verify JSDoc coverage is current |
| `npm run openapi-coverage:generate` | typescript-openapi | Generate OpenAPI coverage report |
| `npm run openapi-coverage:verify` | typescript-openapi | Verify OpenAPI coverage is current |
| `npm run logging:compliance:generate` | typescript, javascript | Refresh logging compliance baseline |
| `npm run logging:compliance:verify` | typescript, javascript | Check for raw logging drift |

## Release

| Command | Description |
|---------|-------------|
| `npm run release:prepare -- --version <X.Y.Z>` | Promote `Unreleased` in CHANGELOG.md to a versioned section |
| `npm run release:verify -- --version <X.Y.Z>` | Verify release version state |
| `npm run release:notes -- --version <X.Y.Z> --from <tag> [--to <ref>]` | Generate release notes from CHANGELOG.md |
| `npm run release:contract:check` | Verify release runtime contract |

### `release:notes` Flags

| Flag | Description |
|------|-------------|
| `--version <X.Y.Z>` | Release version (semver, no `v` prefix) |
| `--from <tag>` | Start commit ref |
| `--to <ref>` | End commit ref (default: HEAD) |
| `--output <path>` | Output file path |
| `--summary <text>` | Optional release summary |
| `--known-issue <text>` | Optional known issue (repeatable) |
| `--compat-note <text>` | Optional compatibility note (repeatable) |

`release:notes` resolves the repo web URL from `git remote.origin.url`, falling back to `.agents-config/config/project-tooling.json` at `releaseNotes.defaultRepoWebUrl`.

## Logging Compliance

Logging compliance baseline metadata identity is sourced from `.agents-config/config/project-tooling.json` at `loggingCompliance.baselineMetadataId`.

## Ownership

| Command | Description |
|---------|-------------|
| `npm run ownership:generate` | Generate ownership matrix |
| `npm run ownership:verify` | Verify ownership matrix is current |
