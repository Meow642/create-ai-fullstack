# create-ai-fullstack

一键创建面向 AI 编码代理优化的 pnpm 全栈 monorepo 模板。

生成的项目内置共享 Zod 契约、Express API、React 前端、OpenAPI 文档站，以及可端到端运行的 items CRUD + WebSocket 通知 demo。

## 快速开始

```bash
pnpm dlx create-ai-fullstack my-app
cd my-app
pnpm dev
```

## 生成内容

- `apps/api`：Express 5、better-sqlite3、ws、Zod 校验、Scalar API 文档。
- `apps/web`：Vite 8、React 19、Tailwind v4、shadcn/ui、TanStack Query。
- `packages/shared`：共享 Zod schemas、推导类型、OpenAPI registry。

## 开发地址

- 前端页面：`http://localhost:5173/items`
- API 文档：`http://localhost:3000/docs`
- 健康检查：`http://localhost:3000/health`

## CLI 参数

```bash
create-ai-fullstack [dir] [--no-install] [--no-git]
```

- `[dir]`：目标项目目录。传入时项目名默认使用目录名。
- `--no-install`：只生成文件，不自动执行 `pnpm install`。
- `--no-git`：不初始化 git 仓库。

## 环境要求

- Node.js `>=22.0.0`
- pnpm `>=9`

当前版本只支持 pnpm，不会询问包管理器。
