# Backend Services

Start-here guide for business logic modules in `backend/src/services`.

## Start Here

1. API call entrypoints: `backend/src/routes/*.ts`.
2. Endpoint-to-handler map: `.agents-config/docs/ROUTE_MAP.md`.
3. Feature-targeted verification commands: `.agents-config/docs/TEST_MATRIX.md`.

## Service Modules

| Service File | Area |
| --- | --- |
| `backend/src/services/healthService.ts` | Core |

## Update Rule

- Keep services reusable and route handlers thin. If service entrypoints or contracts change, update impacted docs/tests in the same change set.
