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

- 所有 schema 文件必须从本包的 `src/zod.ts` 导入 `z`（如 `import { z } from '../zod'`），不要直接从 `zod` 包导入；`src/zod.ts` 已经执行 `extendZodWithOpenApi(z)`。
- schema 与推导类型同名导出：`export const X` + `export type X = z.infer<typeof X>`。
- 字段说明、DTO 说明和示例写在 Zod schema 的 `.meta({ description, example })` 里。
- 接口说明写在 contract constants 的 `summary`、`description`、`tags` 里。
- HTTP method/path/request/response 定义放在 `src/<module>/contracts.ts`。Express route、前端 API hook、OpenAPI path 注册都必须从这里引用，不要手写重复 path 字符串。
- 前后端类型都从 `@workspace/shared` 导入，不在 app 内手抄接口类型。
- 新增或修改字段、路径、接口说明时，只更新 shared schema / contract constants，然后在项目根执行 `pnpm gen:openapi`，或执行 `pnpm -F api gen:openapi`。
- `api-contracts/api/openapi.yaml` 只能由 shared schema 和 registry 自动生成，不允许手写。
- 时间字段保持 SQLite 字符串格式 `YYYY-MM-DD HH:mm:ss`，不要使用 `z.string().datetime()`。
- 列表响应统一使用 `{ total, limit, offset, items }`；schema 用 `Paginated(ItemDto)` 组合，类型可用 `Paginated<ItemDto>`，具体模块可导出 `PaginatedItems` 这类命名 schema。
- 错误响应统一使用 `{ error: string }`。

## 新增模块流程

新增 `users`、`orders` 等模块时，按这个顺序更新：

1. 新建 `src/<module>/schema.ts`，定义 DTO、payload、query、params schema，并导出同名推导类型。
2. 新建 `src/<module>/contracts.ts`，定义 path 常量、前端路径 helper、Express path helper 和 `RouteConfig` contract map。
3. 在 `src/openapi/registry.ts` 注册新增 schema，确保它们进入 OpenAPI components。
4. 在 `src/openapi/paths.ts` 注册新增 contract，确保 paths 进入 OpenAPI。
5. 在 `src/index.ts` 导出新增模块的 schema / contracts。
6. 在项目根执行 `pnpm gen:openapi`，并提交刷新后的 `api-contracts/api/openapi.yaml`。

`export const X` 与 `export type X` 同名是刻意约定：值用于运行时校验和 OpenAPI 生成，类型用于前后端编译期类型检查；只用类型时必须 `import type`。
