# Troubleshooting

Common issues and how to resolve them.

## Bootstrap Failures

### Target is not a git repository

Bootstrap expects the target directory to be a git repository (or to create one in `new` mode). If you see a git-related error:

```bash
# For new projects, bootstrap handles git init.
# For existing projects, make sure the target is already a git repo:
cd ../<project-name>
git init
```

### Missing prerequisites for existing mode

Existing-mode bootstrap requires certain files to already be present. If bootstrap fails with a missing file error:

| Profile | Required File | How to Create |
|---------|--------------|---------------|
| `base` | `.agents-config/config/project-tooling.json` | Copy from a bootstrapped project and customize |
| `typescript` / `javascript` | `.agents-config/docs/FEATURE_INDEX.json` | Run initial bootstrap in `new` mode first, or create manually |
| `typescript` / `javascript` | `.agents-config/policies/logging-compliance-baseline.json` | Run initial bootstrap in `new` mode first, or create manually |

### Node.js version mismatch

Bootstrap requires Node.js 20+. Check your version:

```bash
node --version
```

## Managed Drift

### What managed drift looks like

When `npm run agent:managed -- --mode check` fails, it reports which managed files have diverged from their canonical template source. Example output will list the drifted files and their expected vs actual content.

### How to fix managed drift

```bash
# Auto-fix drift and re-check:
npm run agent:managed -- --fix --recheck

# Or run full sync (includes managed fix + rules sync + policy check):
npm run agent:sync
```

### Drift after intentional local changes

If you intentionally modified a template-managed file:

1. Check if the managed entry supports overrides (`allow_override: true` in `.agents-config/agent-managed.json`)
2. If yes, create the appropriate override payload instead of editing the managed file directly:
   - `<file>.override.<ext>` for full replacement
   - `<file>.append.<ext>` for additive merge
3. If the file does not support overrides, the change must go through the template itself

### Unknown override payload files

If managed check fails with "unknown override payload" errors, you have `.override` or `.append` files next to managed entries that are not allowlisted. Either:

- Remove the override file
- Or add `allow_override: true` to the managed entry in the template manifest

Note: `.replace` is a deprecated naming convention and will always be rejected.

## Preflight Failures

### `npm run agent:preflight` fails

Preflight validates plan/queue state and generates `SESSION_BRIEF.json`. Common causes:

- **Invalid PLAN.json schema**: Check that active plan files in `.agents/plans/current/` conform to the plan machine contract defined in policy
- **Queue state inconsistency**: Verify `.agents/EXECUTION_QUEUE.json` is valid JSON with the expected schema
- **Missing `.agents` directory**: Ensure `.agents` exists (or its symlink target exists)

### Preflight after context compaction

If you're an agent that just experienced context compaction, you must re-run the full startup sequence including preflight before resuming work. This is a mandatory contract requirement.

## `.agents` Symlink Issues

### Symlink target does not exist

If `.agents` is a symlink but the target directory is missing:

```bash
# Check where it points:
ls -la .agents

# Create the target directory:
mkdir -p ../agents-workfiles/<project-id>

# Or re-run bootstrap to set it up:
npm run bootstrap -- --mode existing --target-path . --project-id <project-id>
```

### Converting between external and local mode

**External → Local:**
```bash
npm run bootstrap -- --mode existing --target-path . --agents-mode local --project-id <project-id>
```
Bootstrap will de-symlink and copy canonical state into a local `.agents` directory.

**Local → External:**
```bash
npm run bootstrap -- --mode existing --target-path . --agents-mode external --project-id <project-id>
```
Bootstrap will migrate the local `.agents` directory to external storage and create a symlink. A timestamped backup is kept at `.agents.backup-<timestamp>`.

## Policy Check Failures

### `npm run policy:check` fails

The policy enforcer validates agent governance contracts. Read the error output carefully — it will identify which specific policy contracts are failing and why.

Common causes:
- AGENT_RULES.md missing required rule IDs
- CONTEXT_INDEX.json out of sync with policy
- Plan files with invalid status or missing required fields

### Canonical ruleset hash mismatch

If `npm run rules:canonical:verify` fails, the canonical ruleset has drifted from its source documents:

```bash
# After intentional policy/rule changes, regenerate the lineage:
npm run rules:canonical:sync
```

## Template-Impact Check Failures

If `npm run agent:template-impact:check` fails in CI, your PR touches meaningful workflow paths but is missing the required declaration. Add one of these to your PR body:

```
Template-Impact: yes
Template-Ref: <link-or-ref>
```

or

```
Template-Impact: none
Template-Impact-Reason: <why no template update is needed>
```

See [CI Integration](ci-integration.md) for details.
