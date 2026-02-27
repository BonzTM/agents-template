# Test Matrix

Canonical feature-to-test map for fast, targeted verification.

## Usage Rule

- Treat this file as the canonical targeted-test command map.
- Whenever a feature is introduced, changed significantly, or removed, update or explicitly verify the related feature entry in `.agents-config/docs/FEATURE_INDEX.json` and this matrix in the same change set.
- Prefer running targeted impacted commands from this matrix before broad/full-suite runs.
- Run `npm run feature-index:verify` as a drift check for frontend feature coverage in `.agents-config/docs/FEATURE_INDEX.json`.

## Fast Commands

### Backend

```bash
# Add project-specific backend test commands here.
```

### Frontend

```bash
# Add project-specific frontend test commands here.
```

### Governance

```bash
npm run feature-index:verify
npm run openapi-coverage:verify
npm run logging:compliance:verify
node .agents-config/scripts/enforce-agent-policies.mjs
```

## Feature-to-Test Map

| Feature ID (`.agents-config/docs/FEATURE_INDEX.json`) | Targeted commands | Primary specs |
| --- | --- | --- |
| `<feature-id>` | `<command>` | `<spec-path>` |

## Update Triggers

Update this matrix when any of the following occurs:

- A feature is introduced, changed significantly, or removed.
- A reliable targeted command changes (script rename, path move, or framework invocation change).
- A high-value regression spec is added and should be part of the default targeted workflow.

## Verification Workflow

1. Locate impacted feature IDs in `.agents-config/docs/FEATURE_INDEX.json`.
2. Run the mapped targeted commands from this matrix.
3. If a command is stale, fix this matrix in the same change set.
4. If feature behavior changed materially, update or verify both `.agents-config/docs/FEATURE_INDEX.json` and `.agents-config/docs/TEST_MATRIX.md` before closeout.
