# AGENTS.md (apps/api)

> **AI 工具兼容**：本文件遵循 [AGENTS.md 开放标准](https://agents.md)。
> Claude Code / OpenCode / Codex / Cursor / Windsurf 均原生或通过 fallback 读取本文件。
> 子目录的 AGENTS.md 在该子目录下工作时优先级更高。
> 当前模板不预置项目级 skills 或子 agent；自动化开发流会在后续阶段重新接入。

本文件为 AI 编码代理在**后端子项目**（`apps/api`）中工作时的指引。Monorepo 根级指引见仓库根目录的 [AGENTS.md](../../AGENTS.md)。

## 语言

始终使用中文回复用户。

## 技术栈

Node.js 后端：**Express 5 + TypeScript (CommonJS) + SQLite ({{DATABASE_DRIVER_NAME}}) + ws + zod**。不使用 ORM，业务代码通过 `src/db.ts` 中的仓储函数访问数据库，驱动差异收敛在 `src/db/adapter.ts` 与 `src/db/drivers/`。

- **校验**：所有路由的 `body / query / params` 一律用 `zod` schema 校验，schema 来自 `@workspace/shared`。
- **OpenAPI**：用 `@asteasolutions/zod-to-openapi` 把 shared 中的 schema 注册到 OpenAPI registry，由 `pnpm -F api gen:openapi` 输出 `api-contracts/api/openapi.yaml`。开发时挂载机器契约到 `/openapi.yaml`，交互文档到 `/docs`。
- **WebSocket**：用 `ws` 包，与 Express 共用同一个 HTTP server（`server.on('upgrade', ...)`）。

## 常用命令

> 命令均通过根级 `pnpm -F api <script>` 调用，或在 `apps/api/` 目录里直接 `pnpm <script>`。

- `pnpm dev` — `tsx watch --env-file-if-exists=.env src/index.ts`，热重载并在 `.env` 存在时自动加载（Node 原生支持，**不依赖 dotenv 包**）。
- `pnpm build` — `tsc -p tsconfig.json && tsc-alias -p tsconfig.json`，编译到 `dist/` 并重写构建产物里的路径别名。
- `pnpm start` — `node --env-file-if-exists=.env dist/apps/api/src/index.js`。
- `pnpm gen:openapi` — 从 shared 包的 schema 注册表生成 `api-contracts/api/openapi.yaml`。
- `pnpm test:coverage` — 执行 Vitest 覆盖率测试，阈值 80%。
- `pnpm test` — `vitest run`。
- `pnpm lint` — ESLint（继承根级配置）。
- `pnpm format` — Prettier（继承根级配置）。

环境变量（见 `.env.example`，由 `--env-file-if-exists` 参数加载，**不要**在代码里手动 `import 'dotenv/config'`）：
- `PORT`（默认 `3000`）
- `DB_PATH`（默认当前工作目录下的 `./data.db`）
- `OPENAPI_ALLOWLIST`（逗号分隔的 IPv4 或 CIDR；`/openapi.yaml` 默认只允许 localhost）

## 架构

两层结构：**routes → db**。不引入 service / controller 层。

- `src/index.ts` — 创建 HTTP server，挂载 Express 与 WebSocket，`server.listen(PORT)`。
- `src/app.ts` — 构建 Express 应用并导出（不 listen，便于测试）。中间件顺序固定：`helmet({ contentSecurityPolicy: false }) → cors → morgan('dev') → express.json`，然后挂业务路由 → `/openapi.yaml` → `/docs` Scalar 站点 → 404 兜底 → 错误处理。**新路由要注册在 404 handler 之前。** CSP 关闭是为了避免 Scalar 文档页被浏览器拦成空白。
- `src/db.ts` — 模块级仓储层。在 `DB_PATH` 打开 SQLite 数据库文件，从 `process.cwd()` 读取 `schema.sql` 并执行。业务代码不要直接 import 数据库 driver；通过这里导出的 helper 读写。
- `src/db/adapter.ts` 与 `src/db/drivers/` — SQLite 共同能力集。Driver 负责处理 `better-sqlite3` / `sql.js` 的 API、初始化、写入持久化、锁等差异；业务层只使用 `read/write/get/all/run` 这组窄接口。
- `src/db/driver.ts` — 由脚手架在生成时按所选驱动写入的 re-export 文件，业务侧统一从 `./db/driver` 导入 `createSqliteAdapter`。**不要手改这个文件**；要换驱动请重新执行 scaffold（或参考脚手架逻辑手工替换）。
- `src/middleware/validate.ts` — 提供 `validate({ body?, query?, params? })` 兼容型中间件，以及优先使用的 `validated(schemas, handler)` 路由包装器。校验失败统一返回 `400 { error: string }`，错误消息取自第一条 Zod issue 的 `path` + `message`。
- `src/routes/*.ts` — 一个 feature 一个文件，每个文件默认导出一个 `Router`，在 `src/app.ts` 里注册。业务契约路由 path 必须从 `@workspace/shared` 的 `<module>/contracts.ts` 导出值引用，不要手写重复字符串；基础探活路由如 `/health` 可在本地定义。业务路由优先使用 `validated(schemas, handler)`，handler 内的 `req.body / req.query / req.params` 会按 Zod schema 推导类型，避免重复 parse 或手写 cast。
- `src/ws/*.ts` — WebSocket 处理。`src/ws/index.ts` 导出 `attachWebSocket(server)`，在 `index.ts` 中调用。每个频道一个文件（如 `notifications.ts`），用一个简单的 `Set<WebSocket>` 维护客户端。广播由路由处理函数主动调用（如 `POST /items` 成功后调 `broadcastItemCreated(item)`）。
- `src/openapi.ts` — 调用 shared OpenAPI 构建逻辑，写出 `api-contracts/api/openapi.yaml`。`pnpm gen:openapi` 即跑此脚本，禁止手写 YAML。
- `schema.sql` — 建表 DDL 的唯一来源。**语句必须幂等**（`CREATE TABLE IF NOT EXISTS ...`），因为每次启动都会执行。没有迁移 runner；改已有表结构需要手动处理。

## API 契约（对前端的承诺）

新增/修改任何路由时，先改 `packages/shared/src/<module>/schema.ts` 和 `packages/shared/src/<module>/contracts.ts`。接口说明、字段说明、状态码和响应模型都写在这两个文件里，并由 OpenAPI 自动进入 `/docs` 与 `api-contracts/api/openapi.yaml`。

- 错误响应统一为 `{ error: string }`（4xx/5xx 都用这个结构，不要自造字段）。
- 列表响应统一为 `{ total, limit, offset, items }`，`items` 按 `createdAt DESC` 排序。
- 时间字段用 SQLite `datetime('now')` 原生格式（`"YYYY-MM-DD HH:mm:ss"` UTC），字段名一律 camelCase（`createdAt` / `updatedAt`），**不要**返回下划线风格。
- 状态码语义：`201` 创建、`204` 删除（无 body）、`400` 校验失败、`404` 不存在。
- DELETE 成功必须 `res.status(204).end()`，不要带 body。

工作流：
1. 先在 `packages/shared/src/<module>/schema.ts` 改 Zod schema、字段说明和 example。
2. 如涉及 URL、method、状态码、接口说明或响应模型，同步 `packages/shared/src/<module>/contracts.ts`。
3. 执行 `pnpm -F api gen:openapi` 刷新 `api-contracts/api/openapi.yaml`。
4. 通过 `http://localhost:3000/docs` 查看人类可读接口文档。

## 路由编写模板

```ts
// apps/api/src/routes/items.ts
import { Router } from 'express';
import { CreateItemPayload, ListItemsQuery, ItemDto, itemApiExpressPaths } from '@workspace/shared';
import { validated } from '../middleware/validate';
import { createItem, listItemsPage } from '../db';
import { broadcastItemCreated } from '../ws/notifications';

const router = Router();

router.get(itemApiExpressPaths.list, validated({ query: ListItemsQuery }, async (req, res) => {
  const { limit, offset, q } = req.query;
  const { items, total } = await listItemsPage({ limit, offset, q });
  res.json({ total, limit, offset, items });
}));

router.post(itemApiExpressPaths.create, validated({ body: CreateItemPayload }, async (req, res) => {
  const { title } = req.body;
  const item: ItemDto = await createItem(title);
  broadcastItemCreated(item);
  res.status(201).json(item);
}));

export default router;
```

## 规范与坑点

- `tsconfig`：`module: commonjs`、`strict: true`、`rootDir: ../..`、`outDir: dist`，并包含 `../../packages/shared/src`。
- `package.json` 里是 `"type": "commonjs"`，源码可以正常使用 TypeScript `import/export`，但不要依赖 ESM-only 运行时语义或 `.mjs` 入口。仓库根的 `eslint.config.mjs` 是唯一例外。
- **数据库访问必须走 adapter / 仓储层**，不要在路由里直接调用 `better-sqlite3` 或 `sql.js` 的特殊 API。新增业务查询时优先扩展 `src/db.ts`，只有 driver 差异才进入 `src/db/drivers/`。
- **sql.js 驱动是单进程模型**：内存中持有唯一 `Database` 实例，写入时整库 dump 回磁盘并通过文件锁串行化；多进程同时写同一个 `data.db` 会互相覆盖，且其他进程的 in-memory 副本不会感知到外部写入。需要多进程或并发服务端部署请改用 `better-sqlite3`（重新跑脚手架并选择该驱动即可）。
- **不要**用 `import 'dotenv/config'` 或 `require('dotenv').config()`，统一靠 Node 的 `--env-file-if-exists=.env` 启动加载。
- **不要**在路由里手写校验（`if (!req.body.title)`），业务路由一律走 `validated(schemas, handler)`；只有需要拆成独立 middleware 时才用 `validate(schema)`。
- **WebSocket 鉴权**：当前 demo 不带鉴权；如需接入，在 `server.on('upgrade')` 里读 `?token=` 并校验，校验失败直接 `socket.destroy()`。
