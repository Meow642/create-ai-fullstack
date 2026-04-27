# create-ai-fullstack

一键创建面向 AI 编码代理优化的 pnpm 全栈 monorepo 模板。

生成的项目内置共享 Zod 契约、Express API、React 前端、OpenAPI 文档站，以及可端到端运行的 items CRUD + WebSocket 通知 demo。

## 快速开始

```bash
pnpm dlx create-ai-fullstack my-app
cd my-app
pnpm dev
```

## 本地试跑模板

开发 CLI 时，可以不发 npm 包，直接用当前仓库生成一个临时项目并启动前后端：

```bash
pnpm dev:template
```

该命令会：

- 构建当前 CLI。
- 清空 `/tmp/create-ai-fullstack-dev`。
- 在 `/tmp/create-ai-fullstack-dev/app` 生成模板项目。
- 执行 `pnpm install`。
- 启动生成项目的 `pnpm dev`。

可通过 `CAF_DEV_TMP` 覆盖临时目录：

```bash
CAF_DEV_TMP=/tmp/my-caf-run pnpm dev:template
```

## 生成内容

- `apps/api`：Express 5、better-sqlite3、ws、Zod 校验、Scalar API 文档。
- `apps/web`：Vite 8、React 19、Tailwind v4、shadcn/ui、TanStack Query。
- `packages/shared`：共享 Zod schemas、推导类型、OpenAPI registry。

## AI 工具兼容性

生成项目使用 `AGENTS.md` 作为 AI 编码代理指引的单一事实源，并保留 `CLAUDE.md` pointer 兼容 Claude Code。

项目指引原生或通过 fallback 支持：

- Claude Code
- Codex
- OpenCode
- Cursor
- Windsurf

C1 已内置 Claude Code 主路径的 `.claude/skills/full-dev-flow` 与 `.claude/agents/*`。Codex/OpenCode 的 skill mirror 和专用 agent wrapper 留到 C3，当前 scaffold 不生成 `.agents/skills`、`.opencode/skills` 或 `.codex/agents`。

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
