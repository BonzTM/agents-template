# Backend Routes

Start-here guide for API route handlers in `backend/src/routes`.

## Start Here

1. Mount points and middleware chain: `backend/src/index.ts`.
2. Canonical endpoint map: `docs/ROUTE_MAP.md`.
3. Targeted verification commands: `docs/TEST_MATRIX.md`.

## Mounted Route Modules

| Route File | Mounted Prefixes |
| --- | --- |
| `backend/src/routes/health.ts` | `/api` |

## Update Rule

- When adding, removing, or changing endpoints in this directory, regenerate `docs/ROUTE_MAP.md` and verify impacted targeted commands in `docs/TEST_MATRIX.md`.
