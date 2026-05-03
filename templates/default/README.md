# {{PROJECT_NAME}}

由 `create-ai-fullstack` 生成的 AI 友好全栈 monorepo。模板默认包含一个可运行的前端应用、一个 Express API 服务、一个共享契约包，以及面向 AI 编码代理的项目指引。

## 技术栈

### Monorepo 与工程化

- **pnpm workspace**：管理 `apps/*` 与 `packages/*` 多包工作区。
- **TypeScript 6**：前端、后端、共享契约统一使用 TypeScript。
- **ESLint + typescript-eslint**：按包执行静态检查。
- **Prettier**：统一代码格式化。
- **Vitest**：前后端测试框架。
- **GitHub Actions**：默认 CI 执行类型、lint、覆盖率、契约和构建校验。
- **Docker Compose**：提供开发与生产 compose 配置。
- **Node.js >= 22**：使用现代 Node 能力，包括 `--env-file-if-exists`。

### 前端 `apps/web`

- **React 19 + React DOM 19**：构建前端交互界面。
- **Vite 8**：开发服务器、构建与 HMR。
- **React Router 7**：页面路由。
- **TanStack Query 5**：服务端状态、请求缓存与失效更新。
- **Axios**：HTTP 客户端封装。
- **Tailwind CSS 4 + shadcn/ui 风格组件**：基础样式、设计系统组件与可组合 UI。
- **Radix UI / Base UI**：无障碍交互原语。
- **React Hook Form + Zod**：表单状态与数据校验。
- **Zustand**：轻量客户端状态管理。
- **Lucide React**：图标库。
- **Recharts**：图表组件。
- **Sonner**：Toast 通知。
- **WebSocket 客户端**：订阅后端实时事件。

### 后端 `apps/api`

- **Express 5**：HTTP API 服务。
- **Zod**：请求参数、请求体、响应模型的 schema 定义。
- **@asteasolutions/zod-to-openapi**：从共享 Zod schema 生成 OpenAPI 文档。
- **Scalar API Reference**：在 `/docs` 提供交互式 API 文档。
- **YAML OpenAPI 契约**：在 `api-contracts/api/openapi.yaml` 版本化，并通过 `/openapi.yaml` 受限暴露。
- **better-sqlite3**：本地 SQLite 数据库。
- **ws**：WebSocket 实时通知。
- **Helmet / CORS / Morgan**：安全头、跨域与请求日志。
- **tsx**：开发环境直接运行 TypeScript。
- **tsc-alias**：构建后处理 TypeScript 路径别名。

### 共享契约 `packages/shared`

- **Zod schema 单一来源**：前端、后端、OpenAPI 共用同一套数据契约。
- **共享类型导出**：通过 `@workspace/shared` 在应用之间复用 DTO、请求 payload、查询参数与分页模型。
- **OpenAPI 构建工具**：集中维护 API registry、paths 与文档生成逻辑。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
pnpm gen:openapi
pnpm validate:openapi
pnpm verify:contracts
```

命令说明：

- `pnpm dev`：同时启动 API 与 Web 开发服务。
- `pnpm build`：递归构建 workspace 内所有包。
- `pnpm typecheck`：递归执行 TypeScript 类型检查。
- `pnpm lint`：递归执行 ESLint。
- `pnpm test`：递归执行 Vitest。
- `pnpm test:coverage`：递归执行覆盖率测试，阈值为 80%。
- `pnpm gen:openapi`：基于共享 Zod schema 重新生成 `api-contracts/api/openapi.yaml`。
- `pnpm validate:openapi`：校验 OpenAPI YAML。
- `pnpm verify:contracts`：生成 OpenAPI 并检查契约文件无漂移。
- `pnpm format`：使用 Prettier 格式化项目。

## 开发地址

- 前端页面：`http://localhost:5173/items`
- API 文档：`http://localhost:3000/docs`
- 机器契约：`http://localhost:3000/openapi.yaml`
- 健康检查：`http://localhost:3000/health`

## Docker Compose

开发环境：

```bash
docker compose up
```

生产模式示例：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

## 环境变量

- API 示例：`apps/api/.env.example`
- Web 示例：`apps/web/.env.example`

`.env` 文件禁止提交，环境差异必须通过环境变量或 Compose 注入。

## 功能概览

模板默认实现了一个 `items` 示例模块，用来展示前后端协作方式：

- 前端通过 TanStack Query 调用 `/items` API，支持列表、详情、新增、编辑与删除。
- 后端使用 Express 路由实现 `GET /items`、`POST /items`、`GET /items/:id`、`PATCH /items/:id`、`DELETE /items/:id`。
- 请求参数和请求体通过共享 Zod schema 校验。
- 数据存储在本地 SQLite 数据库中，默认数据库文件为 `apps/api/data.db`。
- 新增 item 后，后端通过 WebSocket 广播实时事件，前端可订阅并刷新相关数据。
- API 文档由共享契约生成，开发时可直接打开 `/docs` 调试接口。

## 项目结构

```text
.
├── AGENTS.md                  # AI 编码代理的主指引
├── CLAUDE.md                  # 指向 AGENTS.md 的 Claude Code 兼容入口
├── api-contracts/
│   └── api/
│       ├── openapi.yaml       # 生成的 OpenAPI YAML
│       └── consumer.json      # API 消费者登记
├── prompts/                   # AI prompt 与说明
├── package.json               # workspace 根包与统一脚本
├── pnpm-workspace.yaml        # pnpm workspace 配置
├── docker-compose.yml         # Compose 基础配置
├── docker-compose.override.yml # 开发环境覆盖
├── docker-compose.prod.yml    # 生产环境覆盖示例
├── tsconfig.base.json         # TypeScript 基础配置
├── scripts/
│   └── dev.mjs                # 同时启动 API 与 Web 的开发脚本
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.ts         # Express 应用组装
│   │   │   ├── index.ts       # API 与 WebSocket 服务入口
│   │   │   ├── db.ts          # SQLite 初始化
│   │   │   ├── middleware/    # 请求校验等中间件
│   │   │   ├── routes/        # HTTP 路由
│   │   │   ├── ws/            # WebSocket 连接与通知
│   │   │   └── test/          # API 测试
│   │   ├── schema.sql         # SQLite 表结构
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── components/ui/ # shadcn/ui 风格基础组件
│       │   ├── features/      # 业务功能模块
│       │   ├── hooks/         # React hooks
│       │   ├── lib/api/       # HTTP、QueryClient、WebSocket 封装
│       │   ├── pages/         # 页面组件
│       │   ├── providers/     # React Provider
│       │   ├── routes.tsx     # 前端路由定义
│       │   └── main.tsx       # 前端入口
│       └── package.json
├── packages/
│   └── shared/
│       └── src/
│           ├── common/        # 通用 schema
│           ├── items/         # items 模块契约
│           ├── openapi/       # OpenAPI registry 与生成入口
│           └── index.ts       # 共享导出入口
└── docs/
    ├── bdd-scenarios.md       # 关键路径 BDD 索引
    ├── contracts.md           # 契约说明
    └── todo.md                # 后续规范改进项
```

## 数据与接口契约

本模板推荐以 `packages/shared` 作为前后端契约的单一事实源：

1. 在 `packages/shared/src/**/schema.ts` 中定义 Zod schema、TypeScript 类型、字段说明和 example。
2. 在 `packages/shared/src/**/contracts.ts` 中定义 HTTP method、path、request、response、状态码和接口说明。
3. 后端路由导入 schema 与 contract path，用于请求校验、响应组装和路由注册。
4. 前端 API hooks 导入 contract path 与类型，获得端到端约束。
5. OpenAPI 生成逻辑复用同一批 schema 与 contract，输出 `api-contracts/api/openapi.yaml`，减少接口文档与实现不一致的风险。

当新增业务模块时，建议先在 `packages/shared` 定义契约，再分别实现 `apps/api/src/routes` 与 `apps/web/src/features`。

## AI 工具兼容性

本项目使用 `AGENTS.md` 作为 AI 编码代理指引的单一事实源，并保留 `CLAUDE.md` pointer 兼容 Claude Code。

支持 Claude Code、Codex、OpenCode、Cursor、Windsurf 等工具读取项目指引。

当前模板不预置项目级 skills 或子 agent。后续如需自动化开发流、任务调度或专用代理，可在保持 `AGENTS.md` 规则为单一事实源的前提下再接入。

## 新功能开发建议

添加一个新功能时，可以按以下顺序推进：

1. 在 `packages/shared` 中定义 schema、类型、字段说明和 API contract constants。
2. 在 `apps/api/src/routes` 中实现接口，并补充 API 测试。
3. 在 `apps/web/src/features` 中实现请求 hooks、列表/表单/详情等界面。
4. 运行 `pnpm gen:openapi` 更新契约。
5. 运行 `pnpm typecheck && pnpm lint && pnpm test:coverage && pnpm validate:openapi` 验证改动。

这种顺序能让契约先行，减少前后端字段不一致、接口文档滞后的问题。
