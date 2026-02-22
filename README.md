# agents-template

Reusable agent-governance scaffold for multi-project bootstrap.

This template provides policy-as-code enforcement, startup/preflight contracts, queue lifecycle tooling, index/readiness checks, and release-note workflow scaffolding.

## Agent Clients

- `AGENTS.md` is the canonical cross-agent startup contract.
- `.claude/CLAUDE.md` provides Claude Code bootstrap wiring into the same startup sequence and orchestrator/subagent policy.

## Quick Start

1. Copy this template into your target repository root.
2. Customize project identity and domain docs:
- `AGENTS.md`
- `docs/AGENT_CONTEXT.md`
- `docs/FEATURE_INDEX.json`
- `docs/TEST_MATRIX.md`
- `docs/ROUTE_MAP.md`
- `docs/JSDOC_COVERAGE.md`
- `docs/LOGGING_STANDARDS.md`
- `.github/policies/agent-governance.json`
3. Bootstrap defaults for your project:

```bash
npm run bootstrap:project -- --project-id <project-id>
```

Optional profile selection:

```bash
npm run bootstrap:project -- --project-id <project-id> --profiles base,node-web
```

- `base`: core orchestrator/subagent governance, queue, preflight, policy checks.
- `node-web`: route-map/domain-readme/jsdoc/logging/feature-index contracts.

4. Run policy check:

```bash
node .github/scripts/enforce-agent-policies.mjs
```

5. If you skipped preflight in bootstrap, run preflight:

```bash
npm run agent:preflight
```

## Drift Controls

- Sync managed workflow files from canonical source:

```bash
npm run agent:sync
```

- Fail when managed files drift from canonical source/overrides:

```bash
npm run agent:drift:check
```

- PR declaration gate for meaningful workflow changes:

```bash
npm run agent:template-impact:check -- --base-ref origin/main
```

PRs touching meaningful workflow paths must include one of:

- `Template-Impact: yes` and `Template-Ref: <link-or-ref>`
- `Template-Impact: none` and `Template-Impact-Reason: <why>`

## External Agent State (Recommended)

Default workspace policy is configured for an external canonical agents root:

- `../agents-workfiles/<project-id>` (canonical state root)
- local `.agents` symlink in the project repo points to that canonical root

This keeps project repositories free of large `.agents` runtime state while allowing private tracking of agent work artifacts.

## Per-Project Overrides

Treat this repo as core workflow and keep project-specific overrides in each target repo:

- Project architecture/stack/context in `docs/AGENT_CONTEXT.md`
- Feature/test mapping in `docs/FEATURE_INDEX.json` and `docs/TEST_MATRIX.md`
- Release surface config in `.github/policies/agent-governance.json` (`contracts.releaseNotes` and `contracts.releaseVersion`)
- Domain scaffolding and route maps in `backend/src/**`, `frontend/**`, and generated docs

## Notes

- `.agents/**` is intentionally local runtime state and should remain git-ignored.
- This repository ships placeholders for backend/frontend route/service/feature docs so governance checks can run immediately.
