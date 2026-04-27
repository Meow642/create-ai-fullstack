---
name: full-dev-flow
description: Run the C1 full development flow for small fullstack changes: plan, split tasks, implement serially with Claude Code subagents, and verify.
---

# full-dev-flow

Use this skill when the user asks to turn a product requirement, API change, UI request, or small fullstack feature into working code in this generated project.

C1 is intentionally simple:

- Use Claude Code project subagents from `.claude/agents/`.
- Run everything serially in the main workspace.
- Do not create git worktrees, branches, pull requests, or remote pushes.
- Do not create or rely on Codex/OpenCode agent compatibility files.
- Keep the workflow small enough for a 1 to 3 task implementation.

## Startup

1. Run `node .claude/skills/full-dev-flow/scripts/check-state.mjs`.
2. If `.dev/state.json` exists and any checkpoint is still pending, ask the user whether to continue, restart, or abandon the current flow before changing files.
3. If there is no state file, start Phase 1.

## Phase 1: Requirements And Plan

Goal: understand the request and write `.dev/plan.md`.

Steps:

1. Read the user's requirement and inspect the relevant code paths.
2. Ask concise clarification questions only when the implementation would otherwise be risky.
3. Create `.dev/plan.md` from `templates/plan-template.md`.
4. Create or update `.dev/state.json`:

```json
{
  "phase": 1,
  "wave": "P0",
  "last_activity": "2026-04-26T10:30:00Z",
  "running_tasks": [],
  "completed_tasks": [],
  "checkpoints": { "1": "pending", "2": "pending", "3": "pending" }
}
```

Use the current UTC timestamp for `last_activity`.

Checkpoint 1: stop and ask the user to approve or revise `.dev/plan.md`.

## Phase 2: Task Split

Goal: turn the approved plan into a small serial task list.

Steps:

1. Create `.dev/tasks/`.
2. Create `.dev/tasks/contracts.md` from `templates/contracts-template.md`.
3. Create 1 to 3 task files from `templates/task-template.md`.
4. Create `.dev/merge-plan.md` from `templates/merge-plan-template.md`.
5. Update `.dev/state.json` with `phase: 2`, `checkpoints.1: "approved"`, and `checkpoints.2: "pending"`.

C1 task files may only use these agents:

- `contract-author`
- `feature-developer`
- `test-runner`

Checkpoint 2: stop and ask the user to approve or revise the task split.

## Phase 3: Serial Implementation And Verification

Goal: complete the approved tasks in the main workspace.

Run the agents in this order:

1. `contract-author`: update shared schemas, API docs, and generated OpenAPI when the task requires contract changes.
2. `feature-developer`: implement backend, frontend, database, and glue code required by the approved tasks.
3. `test-runner`: run the focused and full verification commands, then report exact results.

Update `.dev/state.json` as work progresses:

- Set `phase` to `3`.
- Add active task IDs to `running_tasks`.
- Move finished task IDs to `completed_tasks`.
- Set `checkpoints.2` to `"approved"` after the user approves Phase 2.
- Set `checkpoints.3` to `"pending"` until final user acceptance.

Checkpoint 3: output the final verification summary, changed behavior, and any remaining risks. Ask the user for final acceptance or further fixes.

## Required Verification

For C1, use the smallest set that proves the change, then run the A-stage regression commands before final acceptance when feasible:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

If dependencies have not been installed, run `pnpm install` first.

## Hard Limits

- Do not create git worktrees.
- Do not create `.codex/agents/`, `.opencode/agents/`, `.agents/skills/`, or compatibility mirrors.
- Do not spawn more than the 3 C1 agents.
- Do not implement Playwright visual QA in C1.
- Do not change dependency versions unless the user explicitly approves it.
