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

## AI 工具兼容性

本项目使用 `AGENTS.md` 作为 AI 编码代理指引的单一事实源，并保留 `CLAUDE.md` pointer 兼容 Claude Code。

支持 Claude Code、Codex、OpenCode、Cursor、Windsurf 等工具读取项目指引。

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
