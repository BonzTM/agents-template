# AGENT_CONTEXT.md

Human-readable project/product/architecture context for LLM agents in this repository.

## Project Overview

Replace this section with a short product summary, major user workflows, and repository ownership context.

**License:** `<license>`
**Repository:** `<org>/<repo>`

Canonical machine-readable context map: `docs/CONTEXT_INDEX.json`

## Architecture

Describe the high-level runtime topology and request/data flow here.

Example:

```
Client -> Frontend/API Gateway -> Backend Services -> Data Stores/Queues -> Sidecars/External APIs
```

## Tech Stack

Document the primary runtime stack by domain.

Suggested domains:

- Backend (runtime/framework/language/build/test)
- Frontend (runtime/framework/language/styling/test)
- Sidecars/Workers (runtime/framework/test)
- Infrastructure (DB/cache/queue)

## Project Structure

Document canonical code locations and boundaries.

Suggested coverage:

- Entrypoints
- Routes/controllers
- Services/business logic
- Shared utilities
- Worker/job processors
- Frontend routes/features/hooks

## Key Conventions

Document local coding and architecture conventions, including:

- API/route error envelope expectations
- Shared helper usage requirements
- Environment/config loading rules
- Logging helper requirements
- Testing defaults and constraints

## Reuse and Consolidation Atlas

Track reusable abstractions and where to find them.

Suggested categories:

- Core entrypoints and framework boundaries
- Common route/service/hook patterns
- Shared helper libraries and wrappers
- Known consolidation opportunities and deferrals

## Fork Documentation Maintenance

For this repository, documentation updates are part of done for behavior-changing work.

- Update `CHANGELOG.md` under `## [Unreleased]` for user-visible behavior changes.
- Treat `CHANGELOG.md` as the release-notes source of truth.
- Run `npm run release:prepare -- --version <X.Y.Z>` before release publication.
- Generate release notes with `npm run release:notes -- --version <X.Y.Z> --from <tag> [--to <ref>] [--output <path>]`.
- Keep `docs/FEATURE_INDEX.json`, `docs/TEST_MATRIX.md`, `docs/ROUTE_MAP.md`, `docs/JSDOC_COVERAGE.md`, and `docs/LOGGING_STANDARDS.md` current.
- Keep `contracts/rules/canonical-ruleset.json` and `.agent-overrides/rule-overrides.schema.json` synchronized with policy/rules updates (`npm run rules:canonical:verify`).
- Keep per-domain start-here docs current in `backend/src/routes/README.md`, `backend/src/services/README.md`, and `frontend/features/README.md`.
- Maintain canonical continuity in `.agents/CONTINUITY.md` and queue state in `.agents/EXECUTION_QUEUE.json`.

## Full-Stack Delivery Gates

For changes touching API/auth/routing/integration boundaries:

- Document end-to-end request path in active plan context.
- Validate both backend-direct and frontend/proxy paths where applicable.
- Include at least one explicit full-stack verification checkpoint task.
- Convert production trace failures into deterministic regression tests before closeout.

## Database

Document schema ownership, migration process, and operational constraints.

## Streaming Integration

If applicable, document streaming/integration architecture and provider-specific contracts.

If not applicable, mark this section explicitly as not in scope for this project.

## Testing

Document canonical test layout and commands by domain.

Default expectations:

- Regression prevention tests for behavior changes.
- Contract tests for compatibility-sensitive interfaces.
- Targeted impacted-suite verification before broad suites.
- Coverage default is 100% unless user-approved exception exists.

## Local Testing Bootstrap

Document local infrastructure and app startup commands.

Suggested format:

- Infra bootstrap command(s)
- Optional profiles/services
- Host-run service commands
- Port/base-URL alignment requirements

## Common Tasks

Document frequent contributor workflows, for example:

- Add backend endpoint
- Add frontend page
- Apply schema migration
- Add/modify integration
