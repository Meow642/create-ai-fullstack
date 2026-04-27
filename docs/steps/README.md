# `create-ai-fullstack` 实施里程碑索引

源计划：[../dev-plan-full.md](../dev-plan-full.md)

按"独立可发布里程碑"拆分为 4 阶段。**A 是 v0.1.0 唯一前置条件**；B / C / D 任意一个都可在 A 之后**单独**实施并发版（v0.2 / v0.3 / v0.4），三者**互不依赖**、可任意顺序或并行。

| 里程碑 | 文件 | 目标版本 | 关键交付 | 是否依赖前一阶段 |
|---|---|---|---|---|
| A | [step-A-cli-baseline.md](step-A-cli-baseline.md) | v0.1.0 | CLI + 可运行 fullstack monorepo 模板（含 items CRUD + WS demo） | — |
| B | [step-B-agents-md.md](step-B-agents-md.md) | v0.2.0 | AGENTS.md 化 + 多 AI 工具兼容（symlink、Codex TOML） | 仅依赖 A |
| C | [step-C-full-dev-flow.md](step-C-full-dev-flow.md) | v0.3.0 | `full-dev-flow` skill + 7 子 agent + git worktree 编排 | 仅依赖 A（无需 B） |
| D | [step-D-playwright-visual.md](step-D-playwright-visual.md) | v0.4.0 | `@playwright/cli` 集成 + visual-qa 视觉验收回路 | 仅依赖 A（无需 B/C） |

## 公共硬性约束（每阶段都要遵守）

1. **干净目录验收**：每阶段结束后，从空目录运行 `pnpm dlx file:$PWD <app>` 必须能完成 `install / dev / typecheck / lint / test / build` 全部脚本。
2. **依赖版本表只读**：[dev-plan-full.md §8 依赖版本锁定](../dev-plan-full.md) 是冻结的；任何调整必须先附 `npm view <pkg> version` 实测输出，并写入对应阶段文档。
3. **包管理器只支持 pnpm**；Node 引擎 `>=22.0.0`。
4. **B/C/D 不得作为 A 的前置**：A 阶段产物自身完整可用、可发布、可被用户独立消费；不假设 B/C/D 会落地。

## 推荐实施顺序

1. 先把 A 做完并发布 v0.1.0（这是用户当前要求）。
2. B/C/D 之后按用户优先级随取随做，不必排队。

## 各阶段独立可发版的含义

每个阶段在**自己范围内**完成时，必须：
- `pnpm publish --dry-run` 通过（tarball 内容正确）。
- `scripts/verify-template.sh` 全绿（脚本本身在 A 阶段建立，B/C/D 在其上扩展）。
- 不破坏前一已发布版本的命令行 API（仅做加法）。
