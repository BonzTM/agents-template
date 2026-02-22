# project {{VERSION}} Release Notes - {{RELEASE_DATE}}

## Release Summary

{{RELEASE_SUMMARY}}

## Fixed

{{FIXED_ITEMS}}

## Added

{{ADDED_ITEMS}}

## Changed

{{CHANGED_ITEMS}}

## Admin/Operations

{{ADMIN_ITEMS}}

## Deployment and Distribution

- Docker image: `ghcr.io/example/project:{{VERSION}}`
- Helm chart repository: `https://example.github.io/project`
- Helm chart name: `project`
- Helm chart reference: `project/project`

```bash
helm repo add project https://example.github.io/project
helm repo update
helm upgrade --install project project/project --version {{VERSION}}
```

## Breaking Changes

{{BREAKING_ITEMS}}

## Known Issues

{{KNOWN_ISSUES}}

## Compatibility and Migration

{{COMPATIBILITY_AND_MIGRATION}}

## Full Changelog

- Compare changes: {{COMPARE_URL}}
- Full changelog: {{FULL_CHANGELOG_URL}}
