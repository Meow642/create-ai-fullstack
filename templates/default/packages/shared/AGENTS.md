# AGENTS.md (packages/shared)

> **AI 工具兼容**：本文件遵循 [AGENTS.md 开放标准](https://agents.md)。
> Claude Code / OpenCode / Codex / Cursor / Windsurf 均原生或通过 fallback 读取本文件。
> 子目录的 AGENTS.md 在该子目录下工作时优先级更高。
> C1 项目级 skill 主路径：`.claude/skills/`；Codex/OpenCode skill mirror 留到 C3。
> C1 子 Agent 主路径：`.claude/agents/*.md`（Claude Code）；Codex/OpenCode 专用 agent 兼容层留到 C3。

## 语言

始终使用中文回复用户。

## 职责

`packages/shared` 是 API 契约的单一事实源，包含 Zod schema、推导类型和 OpenAPI registry。

## 硬性约束

- schema 与推导类型同名导出：`export const X` + `export type X = z.infer<typeof X>`。
- 前后端类型都从 `@workspace/shared` 导入，不在 app 内手抄接口类型。
- 新增或修改字段时，必须同步三处：shared schema → `docs/api/API-*.md` → `pnpm gen:openapi`。
- 时间字段保持 SQLite 字符串格式 `YYYY-MM-DD HH:mm:ss`，不要使用 `z.string().datetime()`。
- 列表响应统一使用 `{ total, limit, offset, items }`。
- 错误响应统一使用 `{ error: string }`。
