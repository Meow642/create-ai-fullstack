# CLAUDE.md (apps/api)

本文件为 Claude Code 在**后端子项目**（`apps/api`）中工作时的指引。Monorepo 根级指引见仓库根目录的 [CLAUDE.md](../../CLAUDE.md)。

## 语言

始终使用中文回复用户。

## 技术栈

Node.js 后端：**Express 5 + TypeScript (CommonJS) + better-sqlite3 + ws + zod**。不使用 ORM，直接用 `db.prepare(...)` 写裸 SQL。

- **校验**：所有路由的 `body / query / params` 一律用 `zod` schema 校验，schema 来自 `@workspace/shared`。
- **OpenAPI**：用 `@asteasolutions/zod-to-openapi` 把 shared 中的 schema 注册到 OpenAPI registry，由 `pnpm -F api gen:openapi` 输出 `docs/openapi.json`。开发时挂载 `@scalar/express-api-reference` 到 `/docs`。
- **WebSocket**：用 `ws` 包，与 Express 共用同一个 HTTP server（`server.on('upgrade', ...)`）。

## 常用命令

> 命令均通过根级 `pnpm -F api <script>` 调用，或在 `apps/api/` 目录里直接 `pnpm <script>`。

- `pnpm dev` — `tsx watch --env-file=.env src/index.ts`，热重载并自动加载 `.env`（Node 20+ 原生支持，**不依赖 dotenv 包**）。
- `pnpm build` — `tsc -p tsconfig.json` 编译到 `dist/`。
- `pnpm start` — `node --env-file=.env dist/index.js`。
- `pnpm gen:openapi` — 从 shared 包的 schema 注册表生成 `docs/openapi.json`。
- `pnpm test` — `vitest run`。
- `pnpm lint` — ESLint（继承根级配置）。
- `pnpm format` — Prettier（继承根级配置）。

环境变量（见 `.env.example`，由 `--env-file` 参数加载，**不要**在代码里手动 `import 'dotenv/config'`）：
- `PORT`（默认 `3000`）
- `DB_PATH`（默认当前工作目录下的 `./data.db`）

## 架构

两层结构：**routes → db**。不引入 service / controller 层。

- `src/index.ts` — 创建 HTTP server，挂载 Express 与 WebSocket，`server.listen(PORT)`。
- `src/app.ts` — 构建 Express 应用并导出（不 listen，便于测试）。中间件顺序固定：`helmet({ contentSecurityPolicy: false }) → cors → morgan('dev') → express.json`，然后挂路由 → `/docs` Scalar 站点 → 404 兜底 → 错误处理。**新路由要注册在 404 handler 之前。** CSP 关闭是为了避免 Scalar 文档页被浏览器拦成空白。
- `src/db.ts` — 模块级单例。在 `DB_PATH` 打开 better-sqlite3，开启 `journal_mode=WAL` 和 `foreign_keys=ON`，从 `process.cwd()` 读取 `schema.sql` 并 `db.exec()` 执行。任何位置 `import { db } from './db'`，首次 import 触发初始化。
- `src/middleware/validate.ts` — `validate({ body?, query?, params? })` 高阶中间件。校验失败统一返回 `400 { error: string }`，错误消息取自第一条 Zod issue 的 `path` + `message`。
- `src/routes/*.ts` — 一个 feature 一个文件，每个文件默认导出一个 `Router`，在 `src/app.ts` 里注册。**路由处理函数从 `req.body / req.query / req.params` 取值时，类型由 `validate` 中间件覆写为 schema 的推导类型**（参见 `validate.ts` 内的类型实现）。
- `src/ws/*.ts` — WebSocket 处理。`src/ws/index.ts` 导出 `attachWebSocket(server)`，在 `index.ts` 中调用。每个频道一个文件（如 `notifications.ts`），用一个简单的 `Set<WebSocket>` 维护客户端。广播由路由处理函数主动调用（如 `POST /items` 成功后调 `broadcastItemCreated(item)`）。
- `src/openapi.ts` — 调用 `@workspace/shared` 暴露的 `registry`，写出 `docs/openapi.json`。`pnpm gen:openapi` 即跑此脚本。
- `schema.sql` — 建表 DDL 的唯一来源。**语句必须幂等**（`CREATE TABLE IF NOT EXISTS ...`），因为每次启动都会执行。没有迁移 runner；改已有表结构需要手动处理。

## API 契约（对前端的承诺）

**新增/修改任何路由前必读 [docs/api/API.md](../../docs/api/API.md)**，它定义了与前端锁定的通用约定：

- 错误响应统一为 `{ error: string }`（4xx/5xx 都用这个结构，不要自造字段）。
- 列表响应统一为 `{ total, limit, offset, items }`，`items` 按 `createdAt DESC` 排序。
- 时间字段用 SQLite `datetime('now')` 原生格式（`"YYYY-MM-DD HH:mm:ss"` UTC），字段名一律 camelCase（`createdAt` / `updatedAt`），**不要**返回下划线风格。
- 状态码语义：`201` 创建、`204` 删除（无 body）、`400` 校验失败、`404` 不存在。
- DELETE 成功必须 `res.status(204).end()`，不要带 body。

**契约三件套**（Zod schema → API-xx.md → openapi.json）见根级 [前后端API对接规范.md](../../docs/api/API.md) 的相应章节。新增/改字段务必三处同步：
1. 先在 `packages/shared/src/<module>/schema.ts` 改 Zod schema（**单一事实源**）。
2. 同步 `docs/api/API-<module>.md`。
3. `pnpm -F api gen:openapi` 刷新 `docs/openapi.json`。

## 路由编写模板

```ts
// apps/api/src/routes/items.ts
import { Router } from 'express';
import { CreateItemPayload, ListItemsQuery, ItemDto } from '@workspace/shared';
import { validate } from '../middleware/validate';
import { db } from '../db';
import { broadcastItemCreated } from '../ws/notifications';

const router = Router();

router.get('/items', validate({ query: ListItemsQuery }), (req, res) => {
  const { limit, offset, q } = req.query; // 已被 validate 覆写为推导类型
  // ... db.prepare(...).all(...)
  res.json({ total, limit, offset, items });
});

router.post('/items', validate({ body: CreateItemPayload }), (req, res) => {
  const { title } = req.body;
  // ... db.prepare(...).run(...)
  const item: ItemDto = /* ... */;
  broadcastItemCreated(item);
  res.status(201).json(item);
});

export default router;
```

## 规范与坑点

- `tsconfig`：`module: commonjs`、`strict: true`、`rootDir: src`、`outDir: dist`。`moduleResolution` **故意省略**（TS 6 已弃用 `"node"`），让它从 `module` 推导，不要再加回去。
- `package.json` 里是 `"type": "commonjs"` —— 不要在 `src/` 里写依赖 `.mjs` 解析的 ESM 风格 import。仓库根的 `eslint.config.mjs` 是唯一例外。
- **`better-sqlite3` 是同步 API**，绝对不要套 `async` / `await`。用 `db.prepare(sql).get() / .all() / .run()`，多语句原子操作用 `db.transaction(fn)`。
- **不要**用 `import 'dotenv/config'` 或 `require('dotenv').config()`，统一靠 `node --env-file=.env` 启动加载。
- **不要**在路由里手写校验（`if (!req.body.title)`），一律走 `validate(schema)` 中间件。
- **WebSocket 鉴权**：当前 demo 不带鉴权；如需接入，在 `server.on('upgrade')` 里读 `?token=` 并校验，校验失败直接 `socket.destroy()`。
