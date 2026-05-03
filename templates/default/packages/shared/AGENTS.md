# AGENTS.md (packages/shared)

> **AI 工具兼容**：本文件遵循 [AGENTS.md 开放标准](https://agents.md)。
> Claude Code / OpenCode / Codex / Cursor / Windsurf 均原生或通过 fallback 读取本文件。
> 子目录的 AGENTS.md 在该子目录下工作时优先级更高。
> 当前模板不预置项目级 skills 或子 agent；自动化开发流会在后续阶段重新接入。

## 语言

始终使用中文回复用户。

## 职责

`packages/shared` 是 API 契约的单一事实源，包含 Zod schema、推导类型、API contract constants 和 OpenAPI registry。

## 硬性约束

- schema 与推导类型同名导出：`export const X` + `export type X = z.infer<typeof X>`。
- 字段说明、DTO 说明和示例写在 Zod schema 的 `.meta({ description, example })` 里。
- 接口说明写在 contract constants 的 `summary`、`description`、`tags` 里。
- HTTP method/path/request/response 定义放在 `src/<module>/contracts.ts`。Express route、前端 API hook、OpenAPI path 注册都必须从这里引用，不要手写重复 path 字符串。
- 前后端类型都从 `@workspace/shared` 导入，不在 app 内手抄接口类型。
- 新增或修改字段、路径、接口说明时，只更新 shared schema / contract constants，然后执行 `pnpm gen:openapi`。
- `api-contracts/api/openapi.yaml` 只能由 shared schema 和 registry 自动生成，不允许手写。
- 时间字段保持 SQLite 字符串格式 `YYYY-MM-DD HH:mm:ss`，不要使用 `z.string().datetime()`。
- 列表响应统一使用 `{ total, limit, offset, items }`。
- 错误响应统一使用 `{ error: string }`。
