# Logging Standards

Canonical logging contract for frontend, backend, and Python sidecars/runtime services.

## Shared Principles

- Everything in the project should be logged appropriately with shared logging helpers.
- Avoid silent runtime failures, retries, or state transitions.
- Include enough context for production diagnosis while avoiding secrets in logs.

## Frontend Contract

- Prefer a shared logger module at `frontend/lib/logger.ts`.
- Avoid direct `console.*` usage in production runtime components/hooks.

## Backend Contract

- Prefer a shared logger module at `backend/src/utils/logger.ts`.
- Use structured logging and helper wrappers for timing and error context.

## Python Sidecar Contract

- Prefer shared logging utilities at `services/common/logging_utils.py`.
- Avoid ad hoc `print` debugging paths in runtime code.

## Enforcement

- Baseline generation: `npm run logging:compliance:generate`
- Strict verification: `npm run logging:compliance:verify`
- Policy enforcement: `node .agents-config/scripts/enforce-agent-policies.mjs`

## Migration to 100% Coverage

- New runtime code should not add raw logging drift.
- Existing drift should be retired incrementally with baseline updates only after intentional migrations.
