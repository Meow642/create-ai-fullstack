# 里程碑 A — CLI 基线 + Fullstack Monorepo 模板（v0.1.0）

> 对应源计划章节：[dev-plan-full.md §A 节（第 1–8 步）](../dev-plan-full.md)
> 发版目标：`create-ai-fullstack@0.1.0`，**独立可发布**，B/C/D 不是其前置。

## 1. 目标

交付一个可通过 `pnpm dlx create-ai-fullstack <app>` 一键生成的、面向 AI 编码代理优化的 monorepo 全栈模板：

- 一个 ESM CLI 包（`@clack/prompts` + `cac` + `picocolors`，`tsup` 打包）。
- 一份完整模板：pnpm workspaces + `packages/shared`（Zod 契约 + OpenAPI 注册）+ `apps/api`（Express 5 + better-sqlite3 + ws）+ `apps/web`（Vite 8 + React 19 + Tailwind v4 + shadcn/ui 全套）。
- 内置 items CRUD + WebSocket 通知 demo，端到端可用。
- 4 份 `CLAUDE.md`（根 / web / api / API 规范）原样落入模板（**A 阶段保持 CLAUDE.md，不做 AGENTS.md 化**——那是 B 阶段的事）。

## 2. 实施范围（必做）

严格按 [dev-plan-full.md §"实施顺序"第 1–8 步](../dev-plan-full.md) 执行：

| 步骤 | 内容 | 关键技术决策引用 |
|---|---|---|
| 1 | CLI 骨架与发布配置（`package.json` / `tsup.config.ts` / `src/index.ts` / `detect-pnpm` / `project-name` 校验） | §核心决策 + §"依赖版本锁定 — CLI 自身" |
| 2 | 模板根骨架（pnpm-workspace、`tsconfig.base.json`、根 ESLint flat config、`packages/shared` 通用 schema） | §关键技术决策 1（shared 不预构建）|
| 3 | Shared 包契约层（`items/schema.ts` + `openapi/{registry,paths,build}.ts`） | §关键技术决策 7（Zod 4 + zod-to-openapi 8）|
| 4 | 后端 items + ws + `/docs`（含 Express 5 `Object.assign(req.query, …)`、Scalar 直读对象） | §关键技术决策 2、6 |
| 5 | 前端 items demo + ws hook（Provider 栈、`use-item-events`、TanStack Query） | §关键技术决策 1（Vite 8 内置 tsconfigPaths）|
| 6 | 文档 + CLAUDE.md（搬入 `docs/根CLAUDE.md` 等 4 份） | — |
| 7 | CLI scaffold 实现（复制、`_` 前缀重命名、`{{PROJECT_NAME}}` 替换共 4 处） | §关键技术决策 4 |
| 8 | 发布前准备（README、LICENSE、`pnpm publish --dry-run`、版本 0.1.0） | — |

**依赖版本**：必须严格使用 [dev-plan-full.md §8 依赖版本锁定](../dev-plan-full.md) 表中数值。任何变更需先跑 `npm view <pkg> version`，把输出贴进本文件再修改。

**Native 模块**：根 `package.json` 必须含 `"pnpm": { "onlyBuiltDependencies": ["better-sqlite3", "esbuild"] }`。

## 3. 不做什么（划清边界）

A 阶段**不**做以下事项（属 B/C/D）：

- ❌ 不写 `AGENTS.md`、不做 `CLAUDE.md → AGENTS.md` 转换、不做 pointer 文件（→ B）。
- ❌ 不创建 `.claude/skills/`、`.claude/agents/`、`.codex/agents/`、`.opencode/skills/`（→ B/C）。
- ❌ 不实现 `full-dev-flow` skill、7 个子 agent、`.dev/` 目录、git worktree 编排、merge-orchestrator（→ C）。
- ❌ 不集成 `@playwright/cli`、不写 `visual-qa.md`、不 vendor Microsoft SKILL（→ D）。
- ❌ 不询问包管理器（只支持 pnpm，启动检测）。
- ❌ 不集成 Turbo、Nx、Rush 等。
- ❌ 不放鉴权 demo。
- ❌ CLI 不生成 `.dev/`、`tests/e2e/` 等占位目录。

## 4. 验收标准

### 4.1 CLI 自身

- [ ] `pnpm build` 产出 `dist/index.mjs`，shebang `#!/usr/bin/env node` 正确。
- [ ] `pnpm publish --dry-run` 输出包含：`dist/`、`templates/`、`README.md`、`LICENSE`；不含 `src/`、`node_modules/`、`docs/`。
- [ ] `node dist/index.mjs` 在缺 pnpm 时报友好提示并以非零码退出。
- [ ] 项目名校验：非法 npm name / 已存在非空目录 → 报错；合法名 → 通过。
- [ ] CLI 询问项仅 3 项：项目名 / 是否 git init / 是否立即 install。

### 4.2 模板生成结果（在 `/tmp/cf-smoke/app` 干净目录）

```bash
rm -rf /tmp/cf-smoke && mkdir -p /tmp/cf-smoke
node "$(pwd)/dist/index.mjs" /tmp/cf-smoke/app --no-install --no-git
cd /tmp/cf-smoke/app
pnpm install
pnpm typecheck
pnpm -r run lint
pnpm -F api test
pnpm -F web test
pnpm -F web build
pnpm -F api build
```

每条命令必须 0 退出码。

### 4.3 端到端运行（手动）

- [ ] `pnpm dev` 同时启动前后端（5173 / 3000）。
- [ ] `curl http://localhost:3000/health` → `{"ok":true}`。
- [ ] 浏览器 `http://localhost:3000/docs` 看到 Scalar 文档站，端点齐全。
- [ ] 浏览器 `http://localhost:5173/items`：列表 / 搜索 / 分页 / 新建 / 编辑 / 删除全可用。
- [ ] 双 tab：A 创建 item → B 收到 toast 并自动刷新（WebSocket 路径 `/ws/notifications`）。
- [ ] `pnpm gen:openapi` 写出有效的 `docs/openapi.json`。
- [ ] `pnpm -F api start`（基于 `tsc-alias` 改写后的产物）能起，`/items` 可用。

### 4.4 文件结构

模板生成结果与 [dev-plan-full.md §"模板结构"](../dev-plan-full.md) 完全一致；占位符仅在 4 个目标文件出现（根 `package.json#name`、根 `CLAUDE.md` 标题、`apps/web/index.html#title`、根 `README.md`）。

## 5. 回归测试

在仓库内提交 `scripts/verify-template.sh`（即 [dev-plan-full.md §第 7 步验证](../dev-plan-full.md) 的脚本），CI 与本地都跑：

```bash
#!/usr/bin/env bash
set -euo pipefail
rm -rf /tmp/cf-smoke && mkdir -p /tmp/cf-smoke
node "$(pwd)/dist/index.mjs" /tmp/cf-smoke/app --no-install --no-git
cd /tmp/cf-smoke/app
pnpm install
pnpm typecheck
pnpm -r run lint
pnpm -F api test
pnpm -F web test
pnpm -F web build
pnpm -F api build
pnpm -F api start &
SERVER_PID=$!
sleep 3
curl -fsS http://localhost:3000/health
kill $SERVER_PID
```

退出码为 0 才算通过。后续 B/C/D 阶段会在此脚本上**追加**断言（不删既有断言）。

## 6. 交付物

- `package.json`（CLI 包，`bin: { "create-ai-fullstack": "dist/index.mjs" }`，`engines.node >=22.0.0`，`files: ["dist","templates","README.md","LICENSE"]`，version `0.1.0`）。
- `src/`：`index.ts` / `prompts.ts` / `scaffold.ts` / `post.ts` / `utils/{project-name,detect-pnpm,rename,logger}.ts` / `types.ts`。
- `tsup.config.ts`（target node22，esm，banner shebang）。
- `templates/default/`：完整模板树，含 `_gitignore` / `_npmrc` / `_env.example` / `_prettierrc` 占位文件，含 4 份 CLAUDE.md，含 shadcn/ui 57 个组件（原样从 `docs/sample-frontend/` 搬入）。
- `scripts/verify-template.sh`。
- `README.md`（CLI 用法 + 模板特性 + 生成结构图）、`LICENSE`（MIT）。
- 标签 / 发布：`v0.1.0`，npm publish 完成。

## 7. 风险与确认点（实施时再核一次）

- TS 6 / Vite 8 / Zod 4 / zod-to-openapi 8 / cac 7 / clack 1 全是 2026 Q1 GA 的版本，**实施时若某个 latest 已 minor 漂移**，按 caret 自动包含；若 major 跳变，先 `npm view <pkg> versions --json` 取证再决定是否调整。
- `@scalar/express-api-reference` 仍是 0.x，API 可能有微调，以最新 README 为准。
- Vite 8 内置 `resolve.tsconfigPaths: true` 若实测有问题，回退到 `vite-tsconfig-paths ^6.1.1`；回退也属于"依赖表变更"，需附 npm view 输出。
