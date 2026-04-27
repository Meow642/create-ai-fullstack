# Merge Plan

## Mode

C1 simple mode. All work is performed serially in the main workspace.

## Execution Order

1. `contract-author`
2. `feature-developer`
3. `test-runner`

## File Ownership

- `packages/shared/**`: `contract-author`
- `docs/api/**`: `contract-author`
- `docs/openapi.json`: `contract-author`
- `apps/api/**`: `feature-developer`
- `apps/web/**`: `feature-developer`
- tests and verification notes: `test-runner`

## Conflict Policy

C1 does not create worktrees and does not auto-merge branches. If the workspace has unrelated user changes or conflicts, stop and ask the user how to proceed.

## Checkpoint 2

Human approval required before implementation starts.
