# {{PROJECT_NAME}} CLAUDE.md (root)

本文件为 Claude Code 在本 monorepo **根目录**工作时的指引。子项目有各自的 `CLAUDE.md`，请按需进入。

## 语言

始终使用中文回复用户。

## 项目定位

这是一个**面向 CLAUDE CODE / CODEX / OPENCODE 优化的全栈模板**。结构、契约与文档刻意写成 AI 友好的形态，目的是让 AI 在生成业务代码时有清晰、可遵循的规范。

> 由 [`create-ai-fullstack`](https://www.npmjs.com/package/create-ai-fullstack) CLI 初始化生成。

## 仓库结构

```
.
├── apps/
│   ├── web/              # 前端：Vite 8 + React 19 + TS + Tailwind v4 + shadcn/ui + TanStack Query
│   └── api/              # 后端：Express 5 + TS (CJS) + better-sqlite3 + ws + zod
├── packages/
│   └── shared/           # 共享 Zod schemas、推导类型、OpenAPI registry、通用工具
├── docs/
│   ├── api/
│   │   ├── API.md        # 通用约定（错误格式、状态码、分页等）
│   │   └── API-<x>.md    # 各模块接口的人类可读契约
│   └── openapi.json      # 由 shared 自动生成的 OpenAPI 文档（机器可读）
├── pnpm-workspace.yaml
├── package.json
├── eslint.config.mjs     # 根级共享 ESLint（各子项目 extends）
├── .prettierrc           # 根级共享 Prettier（各子项目 extends）
├── tsconfig.base.json    # 根级共享 tsconfig（各子项目 extends）
└── CLAUDE.md             # 本文件
```

## 子项目导航

**开始改代码前**，先打开对应位置的 `CLAUDE.md`：

| 你要做什么 | 进入哪里 |
|---|---|
| 改前端页面 / 组件 / 数据请求 | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) |
| 改后端路由 / DB / WebSocket | [apps/api/CLAUDE.md](apps/api/CLAUDE.md) |
| 改 API 字段 / 类型 / 校验规则 | [packages/shared/](packages/shared/) + [docs/api/API.md](docs/api/API.md) |
| 看接口定义 | [docs/api/](docs/api/) 或运行后端后访问 `http://localhost:3000/docs` |

## 契约三件套（核心理念）

API 契约由三层构成，**单一事实源是 `packages/shared` 里的 Zod schema**：

| 层 | 位置 | 谁读 |
|---|---|---|
| Zod schema（事实源）| `packages/shared/src/<module>/schema.ts` | 后端中间件 / 前端类型 / OpenAPI 生成器 |
| 人类可读契约 | `docs/api/API-<module>.md` | 人 / AI |
| 机器可读契约 | `docs/openapi.json`（生成）| 工具链 / `/docs` 站点 |

**改字段务必三处同步**：先改 Zod schema → 再改 `API-<module>.md` → 最后 `pnpm gen:openapi`。

详见 [docs/api/API.md](docs/api/API.md) 的「契约三件套」章节。

## 常用命令（根级）

> 本项目用 **pnpm workspaces**，要求 `pnpm >= 9` 与 `Node >= 22`。

| 命令 | 作用 |
|---|---|
| `pnpm install` | 安装所有 workspace 依赖 |
| `pnpm dev` | 同时启动前后端（Ctrl+C 会安静停止两个服务） |
| `pnpm build` | 顺序构建 shared → api / web |
| `pnpm lint` | 全仓 ESLint |
| `pnpm format` | 全仓 Prettier 写回 |
| `pnpm test` | 全仓 vitest |
| `pnpm gen:openapi` | 由 shared 重新生成 `docs/openapi.json` |
| `pnpm -F web <s>` | 在前端子项目跑脚本（如 `pnpm -F web build`） |
| `pnpm -F api <s>` | 在后端子项目跑脚本 |

## 内置 Demo

模板自带两个完整可跑的 demo，作为「AI 生成业务代码的参考样板」：

1. **Items CRUD**：完整覆盖列表分页 / 搜索 / 详情 / 新建 / 编辑 / 删除，覆盖 axios 拦截器 / TanStack Query / react-hook-form + zodResolver / shared schema。
2. **WebSocket 通知**：`POST /items` 成功后服务端广播 `item.created` 事件，前端用 `useWebSocket` hook 接收并展示 toast。

新增业务模块时，**优先模仿 items 模块的目录与文件命名**（前端 `src/features/items/*`、后端 `src/routes/items.ts` + shared `packages/shared/src/items/schema.ts` + 文档 `docs/api/API-items.md`）。

## 给 AI 的硬性约束

- **类型不要手抄**：所有跨边界类型从 `@workspace/shared` 导入。
- **校验不要手写散落 if**：后端走 `validate(schema)` 中间件，前端表单走 `zodResolver(schema)`。
- **错误响应只能是 `{ error: string }`**，列表响应只能是 `{ total, limit, offset, items }`。
- **时间字段是 `YYYY-MM-DD HH:mm:ss` UTC**，不是 ISO 8601。前端解析用 `parseServerTime`。
- **新增模块务必三处同步**：shared schema → `API-<module>.md` → `pnpm gen:openapi`。
- **路径别名**：前端 `@/*`，跨包 `@workspace/shared`，**不要相对路径跨包**。
- **环境变量**：后端用 `node --env-file-if-exists=.env`，**不要**装 `dotenv` 包。

## 项目开发约定

- API 契约的单一事实源是 `packages/shared` 里的 Zod schema。
- 前端请求统一走 TanStack Query + `src/lib/api` 封装。
- 后端路由统一用 `validate()` 中间件校验 `body/query/params`。
- `docs/openapi.json` 是离线机器可读文档，修改 schema 后执行 `pnpm gen:openapi` 刷新；`/docs` 页面运行时直接读取当前 schema 生成。
