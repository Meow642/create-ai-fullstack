---
name: full-dev-flow
description: 用于小型全栈需求的 C1 开发流程：先写计划，再拆任务，随后用 Claude Code 子代理串行实现并验证。
---

# full-dev-flow

当用户希望把产品需求、API 变更、UI 请求或小型全栈功能落成当前生成项目中的可运行代码时，使用此 skill。

C1 刻意保持简单：

- 使用 `.claude/agents/` 中的 Claude Code 项目级子代理。
- 所有工作都在主工作区串行完成。
- 不创建 git worktree、分支、pull request，也不执行远程 push。
- 不创建或依赖 Codex/OpenCode agent 兼容文件。
- 将流程控制在 1 到 3 个任务能够完成的范围内。

## 启动检查

1. 运行 `node .claude/skills/full-dev-flow/scripts/check-state.mjs`。
2. 如果 `.dev/state.json` 存在，且仍有 checkpoint 未完成，在改文件前先询问用户要继续、重开还是放弃当前流程。
3. 如果没有状态文件，从阶段 1 开始。

## 阶段 1：需求理解与计划

目标：理解需求并写出 `.dev/plan.md` 与 `.dev/flow.mmd`。

步骤：

1. 阅读用户需求，并检查相关代码路径。
2. 只有在不澄清会带来明显实现风险时，才提出简短问题。
3. 按 `templates/plan-template.md` 创建或更新 `.dev/plan.md`。
4. 按 `templates/flow-template.mmd` 创建或更新 `.dev/flow.mmd`，用 Mermaid 描述本次需求从计划到验收的开发流程。
5. 每次创建或更新 `.dev/plan.md` / `.dev/flow.mmd` 后，立即运行 `node .claude/skills/full-dev-flow/scripts/open-phase1-artifacts.mjs`，用用户本机文本编辑器打开计划，并用默认浏览器打开 Mermaid 流程图预览。
6. 创建或更新 `.dev/state.json`：

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

`last_activity` 使用当前 UTC 时间。

确认点 1：停止执行，请用户同时审阅 `.dev/plan.md` 和 Mermaid 流程图预览，并确认或提出修改。

## 阶段 2：任务拆分

目标：把已确认的计划拆成小规模串行任务。

步骤：

1. 创建 `.dev/tasks/`。
2. 按 `templates/contracts-template.md` 创建 `.dev/tasks/contracts.md`。
3. 按 `templates/task-template.md` 创建 1 到 3 个任务文件。
4. 按 `templates/merge-plan-template.md` 创建 `.dev/merge-plan.md`。
5. 更新 `.dev/state.json`，写入 `phase: 2`、`checkpoints.1: "approved"`、`checkpoints.2: "pending"`。

C1 任务文件只能使用这些 agent：

- `contract-author`
- `feature-developer`
- `test-runner`

确认点 2：停止执行，请用户确认或修改任务拆分。

## 阶段 3：串行实现与验证

目标：在主工作区完成已确认的任务。

按以下顺序运行 agent：

1. `contract-author`：当任务需要契约变更时，更新 shared schema、API 文档和生成的 OpenAPI。
2. `feature-developer`：实现已确认任务所需的后端、前端、数据库和 glue code。
3. `test-runner`：运行聚焦验证和完整验证命令，并报告准确结果。

随着工作推进更新 `.dev/state.json`：

- 将 `phase` 设为 `3`。
- 将正在执行的任务 ID 加入 `running_tasks`。
- 将已完成的任务 ID 移入 `completed_tasks`。
- 用户确认阶段 2 后，将 `checkpoints.2` 设为 `"approved"`。
- 最终验收前，保持 `checkpoints.3` 为 `"pending"`。

确认点 3：输出最终验证摘要、行为变化和剩余风险，请用户做最终验收或要求继续修复。

## 必要验证

对 C1，先运行能证明变更正确的最小验证集；在可行时，最终验收前再运行 A 阶段回归命令：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

如果依赖尚未安装，先运行 `pnpm install`。

## 硬性限制

- 不创建 git worktree。
- 不创建 `.codex/agents/`、`.opencode/agents/`、`.agents/skills/` 或兼容 mirror。
- 不使用超过 3 个 C1 agent。
- C1 不实现 Playwright 视觉验收。
- 除非用户明确批准，否则不修改依赖版本。
