# CI Integration

How agents-template integrates with GitHub Actions for automated governance checks.

## PR Checks Workflow

The `.github/workflows/pr-checks.yml` workflow runs on every pull request and push to `main`. It contains a single job (`policy-as-code`) that runs four checks:

1. **Policy enforcement** (`npm run policy:check:ci`) — validates agent governance policies in CI mode
2. **Managed workflow drift** (`npm run agent:managed -- --mode check`) — ensures managed files match their canonical sources
3. **Release runtime contract** (`npm run release:contract:check`) — validates release tooling contracts
4. **Template-impact declaration** (`npm run agent:template-impact:check`) — *(PR only)* ensures PRs touching meaningful workflow paths include the required metadata

The workflow uses Node.js 20 and runs `npm ci` for reproducible installs.

## Template-Impact Declaration

PRs that touch meaningful agent workflow paths must declare their template impact in the PR body. The `agent:template-impact:check` script parses the PR body for this metadata.

### Required Format

Every PR body must include one of these declarations:

**When changes affect the template:**
```
Template-Impact: yes
Template-Ref: <link-to-template-PR-or-commit>
```

**When changes do not affect the template:**
```
Template-Impact: none
Template-Impact-Reason: <brief explanation of why no template update is needed>
```

### What Counts as a Meaningful Workflow Path?

The check examines whether the PR diff touches files in governance-significant locations (managed files, policy contracts, scripts, etc.). If it does, the declaration is required. The exact path patterns are configured in the check script.

## PR Template

The repository includes `.github/PULL_REQUEST_TEMPLATE.md` with pre-filled sections:

- **Summary** — what and why
- **Template Impact** — the declaration fields described above
- **Type of Change** — checkbox list (bug fix, feature, enhancement, docs, refactor, other)
- **Verification** — checklist of governance commands to run before merging:
  - `node .agents-config/scripts/enforce-agent-policies.mjs`
  - `npm run agent:managed -- --mode check`
  - `npm run agent:preflight`
  - Additional targeted checks
- **Notes** — migration, rollout, or follow-up notes

## Running CI Checks Locally

You can run the same checks locally before pushing:

```bash
# Policy enforcement (CI mode)
npm run policy:check:ci

# Managed workflow drift
npm run agent:managed -- --mode check

# Release runtime contract
npm run release:contract:check

# Template-impact declaration (requires --base-ref)
npm run agent:template-impact:check -- --base-ref origin/main
```

See [Commands](commands.md) for the full command reference.
