# {{PROJECT_NAME}}

由 `create-ai-fullstack` 生成的 AI 友好全栈 monorepo。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm gen:openapi
```

## 开发地址

- 前端页面：`http://localhost:5173/items`
- API 文档：`http://localhost:3000/docs`
- 健康检查：`http://localhost:3000/health`

## 项目结构

```text
apps/
  api/
  web/
packages/
  shared/
docs/
  api/
  openapi.json
```

## 开发约定

- API 契约的单一事实源是 `packages/shared` 里的 Zod schema。
- 新增或修改接口字段时，先改 schema，再同步 `docs/api/API-*.md`，最后执行 `pnpm gen:openapi`。
- 前端请求统一走 TanStack Query + `src/lib/api` 封装。
- 后端路由统一用 `validate()` 中间件校验 `body/query/params`。
