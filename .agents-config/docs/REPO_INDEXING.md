# Repository Indexing

Deterministic local repository indexing for retrieval and drift detection.

## Purpose

- Keep searchable project context fresh for agent workflows.
- Enable strict verification gates before implementation.
- Preserve reproducible indexing across branches/worktrees.

## Local Customization Modes

- Replacement mode: if `.agents-config/agent-overrides/.agents-config/docs/REPO_INDEXING.replace.md` exists, managed sync/check treats it as the authoritative local content for `.agents-config/docs/REPO_INDEXING.md`.
- Additive mode (default): when the `.replace.md` file is absent, optional `.agents-config/agent-overrides/.agents-config/docs/REPO_INDEXING.override.md` content is appended after the canonical template body.
- Keep `.agents-config/docs/REPO_INDEXING.md` template-managed; place local project indexing details in `.replace.md` or `.override.md`.

## Canonical Commands

```bash
npm run index:build
npm run index:verify
node .agents-config/tools/index/indexer.mjs query "<query>" --strict-fresh
```

## Storage Layout

Default output directory:

- `.agents/index/project-v1/<namespace>/manifest.json`
- `.agents/index/project-v1/<namespace>/files.jsonl`
- `.agents/index/project-v1/<namespace>/chunks.jsonl`
- `.agents/index/project-v1/<namespace>/symbols.jsonl`
- `.agents/index/project-v1/<namespace>/vectors.f32`

## Preflight Gate

`npm run agent:preflight` must:

1. Rebuild index namespace for the active branch/worktree.
2. Run strict verify.
3. Fail when reindex/verify fails unless policy explicitly downgrades failure mode.

## Update Rule

When indexing behavior changes, update in the same change set:

- `.agents-config/docs/REPO_INDEXING.md`
- `.agents-config/tools/index/index.config.json`
- `.agents-config/tools/index/indexer.mjs`
- `.agents-config/docs/CONTEXT_INDEX.json` command map
- `.agents-config/policies/agent-governance.json` contracts (if required)
