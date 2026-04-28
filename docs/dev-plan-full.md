# `create-ai-fullstack` 实施计划

> **2026-04-26 增量更新**：本计划在初稿（**A 节** = 第 1–8 步与对应章节）基础上**追加四块工作**以支撑"AI 全流程自动开发"愿景：
> - **B. 多 AI 工具兼容重构** — `AGENTS.md` 作为单一事实源，`CLAUDE.md` 退化为 pointer，覆盖 Claude Code / OpenCode / Codex / Cursor 等。
> - **C. `full-dev-flow` skill + 7 个子 agent** — 从需求/UI 自动开发的全流程，含三大人类 checkpoint、git worktree 并发、可中断恢复。
> - **D. Playwright CLI 集成** — `@playwright/cli` + Microsoft 官方 SKILL vendored，做视觉验收回路。
> - **E. 总实施 Phase（更新）+ F. 端到端验证（更新）** — 把 A/B/C/D 串成 5 大 Phase，并扩充验证项。
>
> A 节仍按原顺序先做（基础不变），B/C/D 在 A 通过后追加。新章节集中在文件末尾。

## Context

需求：构建一个 npm CLI 工具 `create-ai-fullstack`，用 `pnpm dlx create-ai-fullstack` 调用，在当前目录初始化一个**面向 AI 编码代理优化的 monorepo 全栈模板**。

模板的差异化价值：
- **AI 友好**：根 + 各子项目都有 `CLAUDE.md`，明确"硬性约束"（类型不手抄、走 schema 校验、错误格式锁定…），让 AI 在生成业务代码时能跟规范走。
- **契约三件套**：单一事实源是 `packages/shared` 里的 Zod schema，前后端共享类型与校验，并自动生成 OpenAPI 文档。
- **完整 demo**：自带 items CRUD + WebSocket 通知，不仅是用户体验首启样板，也是 AI 后续生成业务代码的参考范式。

当前仓库是 greenfield，仅有 `docs/` 文件夹（已含 sample 代码片段、API 规范、三份 CLAUDE.md）。文档中已确定的决策见对话记录与 `docs/根CLAUDE.md`。

## 核心决策摘要

| 项 | 决议 |
|---|---|
| CLI 包名 | `create-ai-fullstack` |
| CLI 自身 | 单 package，ESM，`tsup` 打包，`@clack/prompts` + `cac` + `picocolors` |
| Monorepo | pnpm workspaces（不上 Turbo） |
| 包管理器询问 | **不询问，只支持 pnpm**（CLI 启动时检测） |
| 共享包别名 | 固定 `@workspace/shared` |
| Shared 包构建 | **不预构建**，直接暴露 `.ts` 源（tsconfig paths + tsx + Vite 8 内置 `resolve.tsconfigPaths` + 后端 tsc-alias 改写） |
| 前端栈 | Vite 8 + React 19 + TS + RR v7 + Tailwind v4 + shadcn/ui（全套）+ TanStack Query + Axios + zustand + react-hook-form + zodResolver |
| 后端栈 | Express 5 + TS（**CommonJS**）+ better-sqlite3 + ws + zod + @asteasolutions/zod-to-openapi + @scalar/express-api-reference |
| 后端运行 | `tsx watch --env-file=.env`（替代 ts-node-dev，**不装 dotenv**） |
| TS 版本 | **`^6.0.x`**（已 GA，sample 即基准；2026-03-17 正式发布）|
| 测试 | vitest（前后端共用，前端用 jsdom + @testing-library/react） |
| Lint/Format | 根级共享 ESLint flat config + Prettier，子项目 extends |
| Auth 示例 | 不放进模板 |
| Demo | items 完整 CRUD + WebSocket 通知（无鉴权） |
| Node 最低版本 | **`>=22.0.0`**（Node 20 在 2026-04-30 EOL；当前 LTS 是 22.x 与 24.x，且 `--env-file` 已稳定）|
| CLI 询问项 | 项目名 / 是否 git init / 是否立即 install |

## 关键技术决策（最大风险点）

### 1. Shared 包不预构建，直接 `.ts` 出口

`packages/shared/package.json` 的 `exports` 直接指向 `./src/index.ts`：

```json
{
  "name": "@workspace/shared",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts", "./*": "./src/*" }
}
```

通过三种方式各司其职解析：
- **后端 dev**：`tsx` 原生吃 TS，配合根 `tsconfig.base.json` 的 paths。
- **后端 build**：`apps/api/tsconfig.json` 用 `rootDir: "../.."` + `include: ["../../packages/shared/src"]` 把 shared 一起编译；用 `tsc-alias` 改写产物里的 `@workspace/shared` 为相对路径。
- **前端**：用 **Vite 8 内置的 `resolve.tsconfigPaths: true`** 直接读 `tsconfig.base.json`，零额外依赖（Vite 8 在 2026-03 GA 即提供）。如果实施时这个内置选项有性能或兼容问题，回退到 `vite-tsconfig-paths ^6.1.1` 插件。

**好处**：shared 改一行立即生效，无需 build 步骤；少一份维护负担。

### 2. Express 5 的只读 `req.query`

Express 5 把 `req.query` 改为只读 getter。`validate(schema)` 中间件**必须**用 `Object.assign(req.query, ...)`，不能赋值。这是 sample CLAUDE 没强调的关键差异。

### 3. better-sqlite3 native 模块

pnpm 10 默认禁用依赖的 lifecycle scripts。必须在根 `package.json` 加：
```json
"pnpm": { "onlyBuiltDependencies": ["better-sqlite3", "esbuild"] }
```
否则用户 `pnpm install` 后跑不起来。

### 4. CLI 模板分发

- 模板放 `templates/default/`，文件级复制为主（`fs.cp` recursive）。
- npm 会过滤的文件用 `_` 前缀占位：`_gitignore` / `_npmrc` / `_env.example` / `_prettierrc`，复制后重命名。
- 占位符替换只做 `{{PROJECT_NAME}}`，仅 4 处文件（根 `package.json` 的 name、根 `CLAUDE.md` 标题、`apps/web/index.html` 的 title、根 `README.md`）。
- `package.json.files` 必须包含 `"templates"`。

### 5. Sample 版本号即基准（重要）

`docs/sample-frontend/package.json` 与 `docs/sample-backend/package.json` 是**用户手动验证过、当前实际能跑的真实版本**，CLI 模板的依赖版本必须**与 sample 对齐**或更新（不得倒退到旧主版本）。新增依赖按"截至 2026-04 的最新稳定主版本"选定（见下方"依赖版本锁定"）。

> **lucide-react ^1.8.0** 是 2026 年的真实最新版（之前 sub-1 的版本号 `^0.460.x` 是更早的历史版本）；不要把它"修正"回去。

### 6. OpenAPI 站点直读对象

`/docs` 路由用 `apiReference({ content: buildOpenApiDocument() })`，**启动时即时算**而非读 `docs/openapi.json`。避免"忘记跑 gen:openapi 致 docs 与代码不一致"。`docs/openapi.json` 仅作离线工具链消费，由 `pnpm gen:openapi` 手动刷新。

### 7. Zod 4 + zod-to-openapi 8（重要：从 v3/v7 升级）

锁 **`zod ^4.3.6`** + **`@asteasolutions/zod-to-openapi ^8.5.0`**（均为 npm registry 2026-04-26 latest）。Zod 4 是当前主流稳定版；zod-to-openapi v8 原生支持 Zod 4 的 `.meta()` 元数据系统。

**Zod 4 的 breaking change 对本项目的实际影响**：
- ✅ **基础方法 `.min()/.max()/.optional()/.nullable()/.default()` 不变**——items demo 的 schema 不受影响。
- ⚠️ **顶级 format 函数**：`z.string().email()` → `z.email()`，`z.string().url()` → `z.url()`，`z.string().uuid()` → `z.uuid()`。模板若用到任意 format，须用新 API。
- ⚠️ **`z.record(K, V)` 必须两个参数**（v3 是单参）。本项目模板不用 record，无影响。
- ⚠️ **`.strict()/.passthrough()` 改为 `z.strictObject()/z.looseObject()`**。本项目模板不用，无影响。
- ⚠️ **错误对象结构**：`ZodError.issues[i]` 的 `path / message / code` 字段保留，validate 中间件代码无需大改。

**zod-to-openapi v8 用法变化**：
- `registry.register(name, schema)` API 仍可用（向后兼容）。
- 也可以用 Zod 4 原生 `.meta({ id: 'Item', description: '...' })` 替代 `.openapi()`。模板里**两种都演示一次**（contracts 用 `.register`，items schema 用 `.meta`），让 AI 能学到两种范式。
- 生成器从 `OpenApiGeneratorV31` 改为新 v8 API：`new OpenAPIGenerator(registry).generateDocument({...})`（具体名字以 v8 文档为准；实施时确认）。

### 8. 依赖版本锁定（截至 2026-04）

下表为 CLI 模板生成的 `package.json` 必须使用的版本范围。**优先 sample 已写明的版本**（标 ✓）；新增依赖按当前稳定主版本（标 ★）。

#### 后端 `apps/api`
| 依赖 | 版本 | 来源 |
|---|---|---|
| express | `^5.2.1` | ✓ sample |
| better-sqlite3 | `^12.9.0` | ✓ sample |
| ws | `^8.20.0` | ★ |
| zod | `^4.3.6` | ★（npm registry 当前 latest）|
| @asteasolutions/zod-to-openapi | `^8.5.0` | ★（适配 Zod 4 `.meta()`；v7 不支持 Zod 4）|
| @scalar/express-api-reference | `^0.9.10` | ★（npm registry 当前 latest）|
| cors | `^2.8.6` | ✓ sample |
| helmet | `^8.1.0` | ✓ sample |
| morgan | `^1.10.1` | ✓ sample |
| typescript | `^6.0.3` | ✓ sample |
| tsx | `^4.21.0` | ★ |
| tsc-alias | `^1.8.16` | ★ |
| vitest | `^4.1.5` | ★（含 Vite 8 兼容修复）|
| supertest | `^7.2.2` | ★ |
| @types/supertest | `^7.2.0` | ★ |
| eslint | `^10.2.1` | ✓ sample（flat config 唯一）|
| typescript-eslint | `^8.59.0` | ✓ sample |
| prettier | `^3.8.3` | ✓ sample |
| @types/better-sqlite3 | `^7.6.13` | ✓ sample |
| @types/cors | `^2.8.19` | ✓ sample |
| @types/express | `^5.0.6` | ✓ sample |
| @types/morgan | `^1.9.10` | ✓ sample |
| @types/node | `^25.6.0` | ✓ sample |
| @types/ws | `^8.18.1` | ★（latest；sample 不含此项）|
| @eslint/js | `^10.0.1` | ✓ sample（与 ESLint 10 对齐）|

#### 共享包 `packages/shared`
| 依赖 | 版本 |
|---|---|
| zod | `^4.3.6` |
| @asteasolutions/zod-to-openapi | `^8.5.0` |
| typescript | `^6.0.3` |

#### 前端 `apps/web`
> 凡 sample 的版本与 npm registry 当前 latest 不同（sample 略旧），统一升到 latest。所有列出版本均经 `npm view <pkg> version` 验证（2026-04-26）。

| 依赖 | 版本 | 来源 |
|---|---|---|
| vite | `^8.0.10` | ★（latest；sample 是 8.0.9）|
| @vitejs/plugin-react | `^6.0.1` | ✓ sample |
| react / react-dom | `^19.2.5` | ✓ sample |
| typescript | `~6.0.2` | ✓ sample |
| @tailwindcss/vite | `^4.2.4` | ✓ sample |
| tailwindcss | `^4.2.4` | ✓ sample |
| @tanstack/react-query | `^5.100.5` | ★（latest；sample 是 5.99.2）|
| @tanstack/eslint-plugin-query | `^5.100.5` | ★ |
| axios | `^1.15.2` | ✓ sample |
| react-router | `^7.14.2` | ✓ sample |
| zustand | `^5.0.12` | ✓ sample |
| react-hook-form | `^7.74.0` | ★（**稳定版 7.x**；8.x 仍是 alpha/beta，不要用）|
| @hookform/resolvers | `^5.2.2` | ★（已支持 zod 4，以 `from "@hookform/resolvers/zod"` 引入）|
| zod | `^4.3.6` | ★ |
| shadcn | `^4.5.0` | ★（latest；sample 是 4.4.0）|
| @base-ui/react | `^1.4.1` | ✓ sample |
| radix-ui | `^1.4.3` | ✓ sample |
| lucide-react | `^1.11.0` | ★（latest；sample 是 1.8.0；继续是当前真最新）|
| class-variance-authority | `^0.7.1` | ✓ sample |
| sonner | `^2.0.7` | ✓ sample |
| next-themes | `^0.4.6` | ✓ sample |
| date-fns | `^4.1.0` | ✓ sample |
| cmdk | `^1.1.1` | ✓ sample |
| vaul | `^1.1.2` | ✓ sample |
| recharts | `^3.8.1` | ★（latest；sample 是 3.8.0）|
| input-otp | `^1.4.2` | ✓ sample |
| embla-carousel-react | `^8.6.0` | ✓ sample |
| react-day-picker | `^9.14.0` | ✓ sample |
| react-resizable-panels | `^4.10.0` | ✓ sample |
| @fontsource-variable/geist | `^5.2.8` | ✓ sample |
| tailwind-merge | `^3.5.0` | ✓ sample |
| tw-animate-css | `^1.4.0` | ✓ sample |
| clsx | `^2.1.1` | ✓ sample |
| vite-tsconfig-paths | _不装_ | **改用 Vite 8 内置 `resolve.tsconfigPaths: true`**；若内置有问题 fallback 到 `^6.1.1` |
| vitest | `^4.1.5` | ★（含 vite 8 兼容修复）|
| @testing-library/react | `^16.3.2` | ★（兼容 React 19）|
| @testing-library/jest-dom | `^6.9.1` | ★ |
| @testing-library/user-event | `^14.6.1` | ★ |
| jsdom | `^29.0.2` | ★（2026-03 GA）|
| @playwright/cli | `^0.1.9` | ★（npm registry 当前 latest；D 节使用，需 Node 18+）|
| eslint | `^9.39.4` | ✓ sample（前端用 ESLint 9，与后端 ^10.2.1 不一致，**前后端各自独立 lockfile** 即可，不强行统一）|
| eslint-plugin-react-hooks | `^7.1.1` | ✓ sample（兼容 ESLint 9 / React 19）|
| eslint-plugin-react-refresh | `^0.5.2` | ✓ sample |

> **ESLint 9 vs 10 不强行统一**：sample 前端是 `^9.39.4`，后端是 `^10.2.1`。ESLint 10 已彻底移除 eslintrc 系统（仅支持 flat config），但前端 plugin 生态（`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh` 等）对 ESLint 10 的 peer 声明尚不完整。**保留 sample 现状**：前端 ^9.39.4 + 后端 ^10.2.1，各自 lockfile 独立。根级 `eslint.config.mjs` 仍可写共享规则集（flat config 在 9 与 10 都支持），子项目 extends 即可。

#### CLI 自身（`create-ai-fullstack` 包）
| 依赖 | 版本 | 备注 |
|---|---|---|
| @clack/prompts | `^1.2.0` | 1.x 是 GA 最新稳定；不要用 0.x |
| cac | `^7.0.0` | npm registry 当前 latest；6→7 升级文档少，**实施时先验证 cli.option/cli.parse 等核心 API 行为，若有 break 回退到 ^6.7.14** |
| picocolors | `^1.1.1` | 注意 1.x 起需 default import（v1 已转 ESM 友好）|
| tsup（dev） | `^8.5.1` | esbuild + ESM/CJS 双输出，行业标准 |
| typescript（dev） | `^6.0.3` | 与模板对齐 |
| Node 引擎 | `>=22.0.0` | Node 20 EOL 2026-04-30；22 LTS 维护到 2027-04 |

### 9. Breaking changes 备注汇总（vs 较老的"心理基线"）

下表把本计划用到的**主要主版本升级**逐一列出 breaking change，方便实施时不踩坑。Zod 4 / TS 6 / Vite 8 等都是 2026 年 Q1 才 GA 的版本，与"约 2024 年知识基线"差异很大。

| 包 | 版本跳变 | 对本项目的关键 breaking change | 应对 |
|---|---|---|---|
| **TypeScript** | 5.x → **6.0.3** | (a) `module: classic` 移除（不影响，我们用 `commonjs` / `bundler`）；(b) `target` 默认从 ES3 → ES2023，`module` 默认 → ESNext，`types` 默认 `[]`；(c) ES3/ES5 target 弃用（最低 ES2015）；(d) 非 ESM 文件强制 `"use strict"`；(e) 严格模式默认开 | 我们的 tsconfig **显式**设置 `target / module / moduleResolution`，不依赖默认值，因此不受影响。`types` 默认空对我们也是好事。**实施时验证**：`pnpm typecheck` 在 TS 6 下全过 |
| **Zod** | 3.x → **4.3.6** | 见 §7。核心：`z.string().email()` → `z.email()`；`.strict()/.passthrough()` → `z.strictObject()/z.looseObject()`；`z.record(K, V)` 强制双参；error customization API 改 | items demo 不用 email/url/record/strict，**实际 0 影响**。模板里若需要演示 email，必须用 `z.email()` |
| **@asteasolutions/zod-to-openapi** | 7.x → **8.5.0** | (a) 适配 Zod 4 的 `.meta()` 元数据系统；(b) `OpenApiGeneratorV3 / V31` 类继续存在，构造器签名不变；(c) `registry.register / registerPath` 向后兼容 | 用 `OpenApiGeneratorV31` + `.register()` 起步；可选用 Zod 4 的 `.meta()` 替代 `.openapi()` |
| **Vite** | 7.x → **8.0.10** | (a) **Rolldown 替代 esbuild + Rollup**（Rust 实现，10–30× 构建提速）；(b) `import.meta.hot.accept(url)` 改为 `accept(id)`；(c) Lightning CSS 默认压缩 CSS；(d) 浏览器 baseline 为 2026-01-01 widely available；(e) `optimizeDeps.esbuildOptions` 弃用，转 `rolldownOptions`；(f) **`resolve.tsconfigPaths: true` 内置**（替代 vite-tsconfig-paths 插件）| 我们用 `resolve.tsconfigPaths: true`；不写 `import.meta.hot.accept(url)`；不调 `optimizeDeps.esbuildOptions`。**所有现成 Vite 7 范例代码都需按 8 校对一遍** |
| **Vitest** | 3.x → **4.1.5** | (a) 与 Vite 8 同步升级，要求 `vite ^6 \|\| ^7 \|\| ^8`；(b) 类型 export 调整 | 与 Vite 8 配套 OK |
| **ESLint** | 8.x → 9.x（前端）/ **10.2.1**（后端） | (a) ESLint 9 起 flat config 默认，eslintrc 仍支持但已 deprecated；(b) **ESLint 10 完全移除 eslintrc + `.eslintignore`**；(c) CLI 不再接受 eslintrc 参数 | 全仓使用 flat config；不写 `.eslintrc.*` / `.eslintignore`；前端 ^9.39.4 + 后端 ^10.2.1 各自独立 |
| **typescript-eslint** | 7.x → **8.59.0** | (a) 启用 flat config（`tseslint.configs.recommended`）；(b) 部分规则名调整；(c) parser/eslint-plugin 合并为一个包入口（`from "typescript-eslint"`）| 用 `import tseslint from 'typescript-eslint'` + `tseslint.configs.recommended` |
| **Express** | 4.x → **5.2.1** | (a) **`req.query` 改为只读 getter**（不可直接赋值，必须 `Object.assign`）；(b) `req.params` 同；(c) async error 自动透传；(d) `res.redirect()` 默认 302→302（实际无变化）；(e) path-to-regexp 升级，路径语法稍变 | `validate(schema)` 中间件用 `Object.assign(req.query, parsed)`；async 路由可省略 try/catch（自动 next(err)） |
| **React** | 18 → **19.2.5** | (a) 新 hooks（`use`、`useActionState`、`useOptimistic`、`useFormStatus`）；(b) `forwardRef` 不再必需（function component 直接收 ref）；(c) ref cleanup callback；(d) `<Context>` 替代 `Context.Provider`；(e) `dangerouslySetInnerHTML` 等 SSR 改进 | items demo 用得不深，无须显式利用新特性；shadcn 组件已适配 React 19 |
| **React Router** | 6 → **7.14.2** | (a) 包改名 `react-router-dom` → `react-router`（**关键**）；(b) Data API（`loader`/`action`/`useLoaderData`）保留但**我们不用**；(c) 类型导出位置变；(d) Framework Mode（FS-based routing）可选，本项目**不用**——继续用 `createBrowserRouter` 配置式 | `import { createBrowserRouter, RouterProvider } from 'react-router'`；**禁用** Data APIs（数据走 TanStack Query） |
| **Tailwind CSS** | 3 → **4.2.4** | (a) **无 `tailwind.config.js`**，配置写在 CSS 里（`@import "tailwindcss"` + `@theme`）；(b) Vite 集成改用 `@tailwindcss/vite` 插件（不再走 PostCSS）；(c) `@apply` 仍可用但建议减少；(d) 默认色板调整；(e) `oklch()` 替代 `hsl()` 在 token 中 | 模板里 `index.css` 沿用 sample（`@import "tailwindcss" / @theme inline / oklch(...)` 全套）；`vite.config.ts` 装 `@tailwindcss/vite()` |
| **shadcn/ui** | v2/v3 → **v4.5.0** | (a) registry 模型升级；(b) 默认 style 从 `default` 出现 `radix-nova` 等新主题；(c) 与 Tailwind v4 token 系统集成；(d) icon library 配置（lucide）保留 | sample `components.json` 已是 v4 风格（`style: radix-nova`），原样保留 |
| **TanStack Query** | 4 → **5.100.5** | (a) `cacheTime` → `gcTime`；(b) `useQuery` 不再支持回调式 `onSuccess/onError`（改用 `useEffect` 或 mutation 的 `onSuccess`）；(c) 严格 mode 下 dev tool 表现优化 | 我们的 demo 不用 onSuccess 回调（用 mutation 的）；query-client 配置里若有 `cacheTime` 改 `gcTime` |
| **better-sqlite3** | 11 → **12.9.0** | (a) Node 22+ 支持的预编译 binary；(b) `Statement.raw()` 行为微调；(c) prepared statement 缓存策略改 | API 大体兼容，sample 已是 12.x |
| **helmet** | 7 → **8.1.0** | (a) 默认 CSP 收紧；(b) 部分老 header 移除（`X-Download-Options` 等）；(c) `crossOriginEmbedderPolicy` 默认 `require-corp` 可能影响图片 | 后端 `helmet()` 默认设置 OK；如开发联调遇到 CSP 阻 Vite HMR，**单独**调整 helmet 选项 |
| **morgan** | 1.10 之后保持稳定 | 无重大变化 | 直接用 `morgan('dev')` |
| **ws** | 8.18 → **8.20.0** | 仅安全/性能补丁，无 API 改 | 无须特殊处理 |
| **better-sqlite3 / esbuild native modules in pnpm 10** | （非版本变化，是 pnpm 行为变化） | pnpm 10 默认禁依赖的 lifecycle scripts | 根 `package.json` 必须有 `pnpm.onlyBuiltDependencies: ["better-sqlite3", "esbuild"]` |
| **react-hook-form** | 7.x 内升级 | sample 没用到，新增。**8.x 仍是 alpha/beta**，必须用 7.74.0；与 `@hookform/resolvers ^5.2.2` 配套 | 范式见 D 节 |
| **@hookform/resolvers** | 4 → **5.2.2** | 拆 entry：`from '@hookform/resolvers/zod'` 不变，但 v5 起官方明确支持 Zod 4（`zod/v4` 子路径也支持） | OK |
| **scalar/express-api-reference** | 0.6 → **0.9.10** | (a) 包多次重命名/重组；(b) `apiReference({ url? content?, ... })` 选项形式收敛；(c) 默认主题 / 配色更新 | 实施时以官方 README 为准（版本 0.x 仍在频繁迭代，别假设 API 稳定）；锁 `^0.9.x` 即可 |
| **@types/supertest** | 6 → **7.2.0** | 跟 supertest 7.x 主版本对齐；类型签名 strict 化 | 一并升 |
| **jsdom** | 24/25 → **29.0.2** | (a) 大量 web 标准 API 补全（`URLPattern`、`structuredClone` 等）；(b) Node 22+；(c) `--experimental-vm-modules` 不再需要 | OK，与 Node 22 配套 |
| **@playwright/cli** | 新包（2026 Q1 GA） | 无 v 历史；从零开始 | 见 D 节 |
| **cac** | 6 → **7.0.0** | 6→7 文档极少；据 GitHub release 主要是 ESM-only / TS 重写 / 边界 case 修复，**核心 API（`cli.option/.command/.parse/.help`）保留** | 实施时先小验证；若 ESM-only 不兼容我们 CLI 的 ESM 输出，回退 ^6.7.14 |
| **clack/prompts** | 0.x → **1.2.0** | (a) 默认 export 行为整顿；(b) `intro/outro/spinner` 等 API 稳定 | 用 1.x 范式（[clack.cc](https://www.clack.cc) 官方）|
| **Node.js** | 20 → **22 LTS** | (a) `--env-file` 已 stable；(b) 内置 fetch；(c) `node:test` 内置；(d) `import.meta.dirname/filename` 可用 | `engines.node >=22.0.0`；后端 dev 用 `node --env-file=.env`（不再 `import 'dotenv/config'`） |

> **如何用此表**：实施过程中如果某段范例代码或某个调用看起来"按以前的方式应该这样写"，先回到此表对照——可能要换新 API。

### 10. 时效性内容审计（实施前最后 sanity check）

下表枚举本计划中**所有依赖时效性 / 外部生态版本**的论断，对应可能需要在实施时再核实一次的内容：

| 论断 | 验证状态 | 备注 |
|---|---|---|
| `npm` 上各依赖最新版本 | ✓ 2026-04-26 通过 `npm view <pkg> version` 实测 | 实施时再跑一次 `npm view`，若漂移到下一个 minor，按 caret 自动包含 |
| Microsoft `playwright-cli` SKILL 的 vendoring 来源 | ⚠️ URL 验证存在 | 实施时拉取并记 commit-sha；license 文件一并核对 |
| AGENTS.md 标准（agents.md） | ✓ Linux Foundation 旗下 Agentic AI Foundation 维护 | 各家工具兼容性会持续扩大，无须回滚 |
| OpenCode 的 skill 扫描路径（`.opencode/skills/` + `.claude/skills/` + `.agents/skills/`） | ✓ 官方 docs 验证 | OpenCode 仍在快速迭代，实施时建议再读一眼 [opencode.ai/docs/skills](https://opencode.ai/docs/skills/) |
| Codex CLI 的 skill 路径 `.agents/skills/<name>/SKILL.md` | ✓ 官方 docs 验证 | Codex skill 机制 2026 Q1 引入，仍可能调整 |
| Codex agent TOML 的 `instructions_file` 字段 | ⚠️ 来自搜索结果摘要，未直接读官方 schema | **实施时务必从 Codex 官方 docs 验证**字段名拼写（可能是 `instructions_path` 或 `prompt_file` 等变体），如有出入按官方修正 |
| Vite 8 的 `resolve.tsconfigPaths: true` | ✓ 官方公告 | 实施时跑通 `pnpm -F web dev` 与 `vite build`；若内置选项性能/兼容有问题，回退到 `vite-tsconfig-paths ^6.1.1` |
| `eslint-plugin-react-refresh ^0.5.2` 对 ESLint 9 的 peer 支持 | ✓ sample 已经在用 | 已确认 |
| Node `--env-file` 在 Node 22 是 stable 而非 experimental | ✓ Node 22 LTS 默认 | 已确认 |
| @scalar/express-api-reference 仍以 `apiReference({ content })` 接对象 | ⚠️ 0.x 包，API 仍有变更可能 | 实施时以最新 README 为准 |
| @asteasolutions/zod-to-openapi v8 的 `OpenApiGeneratorV31` 构造器签名 | ✓ deepwiki/官方 README 仍标 `new OpenApiGeneratorV31(definitions)` | 已确认 |
| TS 6 与 sample 中各 `.tsconfig` 的兼容 | ⚠️ sample 已用 TS 6 但未必全压力测试过 | 实施时跑全仓 `tsc -b` 看是否有 deprecation 警告/错误 |
| pnpm 10 对 `onlyBuiltDependencies` 的支持 | ✓ 官方 pnpm 10 迁移说明 | 模板锁 `packageManager: pnpm@10.33.0` 或更新 |
| Microsoft `playwright-cli` 的 SKILL.md 版本 | ⚠️ 上游可能已改 | CLI 模板每次 minor 升级都重新 vendor 一次，记录 commit sha |
| Codex `agents.max_depth` 默认 1 | ✓ 官方 docs | 我们的 7 个并发子 agent 在 depth=1 即满足（顶层 skill 直接 spawn 子 agent，不嵌套）|

---

## 仓库结构（CLI 自身）

```
create-ai-fullstack/                 # 仓库根（也是 CLI 包根）
├─ src/
│  ├─ index.ts                       # 入口 (#!/usr/bin/env node)
│  ├─ prompts.ts                     # @clack/prompts 询问
│  ├─ scaffold.ts                    # 复制模板 + 重命名 + 占位符替换
│  ├─ post.ts                        # git init / pnpm install / next-steps
│  ├─ utils/{project-name,rename,logger,detect-pnpm}.ts
│  └─ types.ts
├─ templates/default/                # 完整 monorepo 文件树（见下）
├─ scripts/verify-template.sh        # 本地烟雾测试
├─ docs/                             # 已存在，保留
├─ package.json                      # bin: create-ai-fullstack
├─ tsconfig.json
├─ tsup.config.ts
└─ README.md
```

## 模板结构（`templates/default/`）

```
templates/default/
├─ _gitignore
├─ _npmrc                            # auto-install-peers=true
├─ package.json                      # name = {{PROJECT_NAME}}
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ tsconfig.json                     # project references 顶层
├─ eslint.config.mjs                 # 根级共享
├─ _prettierrc
├─ CLAUDE.md                         # 根级 AI 导航
├─ README.md
├─ apps/
│  ├─ web/                           # Vite 8 + React 19 + ...
│  │  ├─ index.html                  # title = {{PROJECT_NAME}}
│  │  ├─ vite.config.ts              # tailwindcss + react + resolve.tsconfigPaths(Vite 8 内置)
│  │  ├─ vitest.config.ts
│  │  ├─ tsconfig.{json,app.json,node.json}
│  │  ├─ eslint.config.js            # extends 根级
│  │  ├─ components.json             # 沿用 sample（radix-nova / neutral / lucide）
│  │  ├─ CLAUDE.md
│  │  ├─ public/
│  │  └─ src/
│  │     ├─ main.tsx                 # 含 QueryClientProvider + RouterProvider + Toaster
│  │     ├─ routes.tsx
│  │     ├─ index.css                # 沿用 sample
│  │     ├─ pages/{home,not-found}.tsx
│  │     ├─ components/ui/           # shadcn 全套（57 个组件）
│  │     ├─ features/items/          # 见下
│  │     ├─ lib/{utils.ts,api/*}     # client/types/query-client/time/ws/index
│  │     ├─ hooks/{use-mobile,use-item-events}.ts
│  │     └─ test/{setup.ts,items-list.test.tsx}
│  └─ api/                           # Express 5 + CJS + better-sqlite3 + ws + zod
│     ├─ _env.example                # PORT=3000\nDB_PATH=./data.db
│     ├─ _gitignore
│     ├─ schema.sql                  # items 表 DDL
│     ├─ tsconfig.json
│     ├─ vitest.config.ts
│     ├─ eslint.config.mjs
│     ├─ CLAUDE.md
│     └─ src/
│        ├─ index.ts                 # http.createServer + listen + attachWebSocket
│        ├─ app.ts                   # helmet/cors/morgan/json + 路由 + /docs + 404 + err
│        ├─ db.ts                    # better-sqlite3 单例
│        ├─ openapi.ts               # 写 docs/openapi.json
│        ├─ middleware/validate.ts
│        ├─ routes/{health,items}.ts
│        ├─ ws/{index,notifications}.ts
│        └─ test/{items.test.ts,ws.test.ts}
├─ packages/
│  └─ shared/
│     ├─ package.json                # name: @workspace/shared, exports: ./src/index.ts
│     ├─ tsconfig.json               # composite: true
│     └─ src/
│        ├─ index.ts                 # 桶导出
│        ├─ common/schema.ts         # Paginated, ApiError zod schema
│        ├─ items/schema.ts          # ItemDto / CreateItemPayload / ListItemsQuery / ...
│        └─ openapi/
│           ├─ registry.ts           # OpenAPIRegistry 单例
│           ├─ paths.ts              # registerPath(...)
│           └─ build.ts              # buildOpenApiDocument()
├─ docs/
│  ├─ api/
│  │  ├─ API.md                      # 通用约定
│  │  └─ API-items.md                # items 模块完整文档
│  └─ openapi.json                   # 占位 {}，install 后跑 gen:openapi 重写
└─ scripts/
   └─ gen-openapi.ts                 # 根级薄壳（被 `pnpm gen:openapi` 调用）
```

---

## 实施顺序

### 第 1 步：CLI 骨架与发布配置

**关键文件**：
- `package.json` — bin、files、engines、type=module、tsup 脚本
- `tsup.config.ts` — entry: src/index.ts, format: esm, **target: node22**, banner: `#!/usr/bin/env node`
- `src/index.ts` — cac 解析 + clack 交互的最小骨架（先打 console.log 不真做事）
- `src/utils/detect-pnpm.ts` — 检测 `pnpm --version`，缺失时友好提示并退出
- `src/utils/project-name.ts` — 校验：npm name 规则 + 目录可用

**验证**：`pnpm build && node dist/index.mjs my-app` 能跑完交互流。

### 第 2 步：模板根骨架（不含具体业务）

先把 monorepo 协作骨架搭起来：
- `templates/default/package.json` / `pnpm-workspace.yaml`（带 `pnpm.onlyBuiltDependencies`）
- `tsconfig.base.json`（`paths.@workspace/shared`）
- `tsconfig.json`（顶层 references）
- 根级 `eslint.config.mjs` + `_prettierrc`
- `packages/shared/{package.json,tsconfig.json,src/index.ts}` — 先放 `Paginated` / `ApiError` 通用 schema
- `apps/api/{package.json,tsconfig.json}` — 加 `tsc-alias` 依赖
- `apps/web/{package.json,vite.config.ts,tsconfig.*}` — 用 Vite 8 内置 `resolve.tsconfigPaths: true`（不装 vite-tsconfig-paths）

**验证**：手工 `cd templates/default && pnpm install && pnpm typecheck` 通过。

### 第 3 步：Shared 包契约层

- `src/items/schema.ts` — Zod schemas（ItemDto / CreateItemPayload / UpdateItemPayload / ListItemsQuery / ItemIdParams）
- `src/openapi/registry.ts` — `export const registry = new OpenAPIRegistry()`
- `src/openapi/paths.ts` — `registry.registerPath(...)` 注册 5 个 items 端点
- `src/openapi/build.ts` — `buildOpenApiDocument()` 用 `OpenApiGeneratorV31`
- `src/index.ts` — 桶导出

**验证**：在 shared 目录跑一个临时 `tsx -e` 脚本调用 `buildOpenApiDocument()`，确认输出有效 OpenAPI 3.1 对象。

### 第 4 步：后端 items + ws + /docs

按 `docs/后端项目的CLAUDE.md` 落地：
- `src/middleware/validate.ts` — 关键点：用 `Object.assign(req.query, ...)`（Express 5 兼容）
- `src/routes/items.ts` — 5 个端点 + `rowToItem` 辅助 + POST 调 `broadcastItemCreated`
- `src/ws/index.ts` — `attachWebSocket(server)`，按 url path 路由
- `src/ws/notifications.ts` — 维护 `Set<WebSocket>`，导出 `broadcastItemCreated`
- `src/app.ts` — 挂 `apiReference({ content: buildOpenApiDocument() })` 到 `/docs`
- `src/index.ts` — `http.createServer(app)` + `attachWebSocket` + listen
- `src/openapi.ts` — 写 `docs/openapi.json` 的脚本（被 `pnpm gen:openapi` 调用）
- `schema.sql` — items 表 DDL（含 `items_created_at_idx`）

**验证**：
- `pnpm -F api dev` 启动
- `curl http://localhost:3000/health` → `{"ok":true}`
- 浏览器打开 `http://localhost:3000/docs` 看到 Scalar 文档站
- `curl -X POST -H 'Content-Type: application/json' -d '{"title":"hi"}' http://localhost:3000/items` → 201 + 对象
- `curl http://localhost:3000/items` → Paginated
- `pnpm -F api build && pnpm -F api start` 也能跑（验证 tsc-alias 改写正确）

### 第 5 步：前端 items demo + ws hook

- `src/lib/api/*` — client、types、query-client、time（`parseServerTime`）、ws（`useWebSocket` hook 含自动重连）、index
- `src/main.tsx` — 补全 Provider 栈
- `src/routes.tsx` — 4 路由
- `src/features/items/` — list 页、detail 页、form-dialog、search、items-table、api 模块、`use-items-query` hook
- `src/hooks/use-item-events.ts` — 订阅 `/ws/notifications`，`item.created` 时 toast + `invalidateQueries`

**验证**：
- `pnpm dev`（根级）同时启动前后端
- 浏览器 http://localhost:5173/items：列表、搜索、分页、新建/编辑/删除全可用
- 开两个 tab，A 创建 item，B 看到 toast 并自动刷新
- `pnpm -F web build` 通过

### 第 6 步：文档 + CLAUDE.md

- 把 `docs/根CLAUDE.md` 内容（带 `{{PROJECT_NAME}}` 占位）写入 `templates/default/CLAUDE.md`
- 把 `docs/前端项目CLAUDE.md` → `templates/default/apps/web/CLAUDE.md`
- 把 `docs/后端项目的CLAUDE.md` → `templates/default/apps/api/CLAUDE.md`
- 把 `docs/前后端API对接规范.md` → `templates/default/docs/api/API.md`
- 写 `templates/default/docs/api/API-items.md`（按 sample auth 文档结构）
- `docs/openapi.json` 放占位 `{}`

### 第 7 步：CLI scaffold 实现

- `src/scaffold.ts` —
  1. 校验目标目录
  2. `fs.cp` 递归复制 `templates/default`
  3. 遍历重命名 `_gitignore` / `_npmrc` / `_env.example` / `_prettierrc`
  4. 在 4 个目标文件做 `replaceAll('{{PROJECT_NAME}}', name)`
- `src/post.ts` —
  1. 可选 `git init && git add -A && git commit -m "initial commit"`
  2. 可选 `pnpm install`（注意要让用户看到原始 stdout，用 `spawn` 继承 stdio）
  3. 打印 next steps（含 dev 启动 / 浏览器地址 / 阅读 CLAUDE.md 的提示）

**验证**：`scripts/verify-template.sh`：
```bash
rm -rf /tmp/cf-smoke && mkdir -p /tmp/cf-smoke
node "$(pwd)/dist/index.mjs" /tmp/cf-smoke/app --no-install --no-git
cd /tmp/cf-smoke/app
pnpm install
pnpm typecheck
pnpm -r run lint
pnpm -F api test
pnpm -F web build
pnpm -F api build && pnpm -F api start &  # 短跑一会儿
sleep 2 && curl -f http://localhost:3000/health && kill %1
```

### 第 8 步：发布前准备

- README：使用方法、模板特性、生成结构图
- LICENSE（MIT）
- `pnpm publish --dry-run` 看 tarball 内容（确认 `templates/`、`dist/`、README、LICENSE 在内；不应有 src/ 与 node_modules）
- 版本：`0.1.0`

---

## 关键文件 / 引用清单

CLI 实现：
- `src/index.ts`、`src/scaffold.ts`、`src/prompts.ts`、`src/utils/project-name.ts`、`src/utils/detect-pnpm.ts`

模板核心（最容易踩坑）：
- `templates/default/tsconfig.base.json`（paths 集中地）
- `templates/default/package.json`（`pnpm.onlyBuiltDependencies` + 顶层脚本）
- `templates/default/packages/shared/package.json`（`exports` 指向 `.ts`）
- `templates/default/apps/api/tsconfig.json`（`rootDir: ../..` + include shared）
- `templates/default/apps/api/src/middleware/validate.ts`（Express 5 `Object.assign` 坑）
- `templates/default/apps/api/src/ws/index.ts`（`noServer` + `upgrade` 事件）
- `templates/default/apps/web/vite.config.ts`（启用 Vite 8 内置 `resolve.tsconfigPaths: true`）
- `templates/default/apps/web/src/main.tsx`（Provider 栈完整）

可复用的现有内容（不要重写）：
- `docs/sample-frontend/src/components/ui/*`（57 个 shadcn 组件，**原样复制到模板**，依赖版本一律以 sample 为准）
- `docs/sample-frontend/src/index.css`（Tailwind v4 + 设计 token，原样保留）
- `docs/sample-frontend/components.json`（保留 radix-nova / neutral / lucide）
- `docs/sample-backend/eslint.config.mjs` / `.prettierrc`（作为各子项目 extends 模板）
- `docs/根CLAUDE.md` / `docs/前端项目CLAUDE.md` / `docs/后端项目的CLAUDE.md` / `docs/前后端API对接规范.md`（已写好的 AI 友好文档，搬入模板）

---

## 端到端验证（实施完成后）

1. **本地 CLI 烟雾**：`scripts/verify-template.sh` 全绿
2. **手动交互流**：在干净空目录 `pnpm dlx file:$PWD my-app`，回答交互项，观察：
   - 目录已创建、`.git` 在
   - `pnpm install` 自动跑完，better-sqlite3 自动 rebuild 无错
   - `pnpm dev` 同时拉起前后端，端口 5173 / 3000
   - 浏览器 http://localhost:3000/docs 看到 Scalar 文档站
   - 浏览器 http://localhost:5173/items：CRUD 全可用
   - 双 tab 验证 WebSocket 广播
3. **类型检查与 lint**：`pnpm typecheck` / `pnpm lint` / `pnpm test` 全绿
4. **生产构建**：`pnpm build && pnpm -F api start` 后端能起、`pnpm -F web preview` 前端能起
5. **OpenAPI 生成**：`pnpm gen:openapi` 后 `docs/openapi.json` 内容更新且与 `/docs` 站点一致
6. **AI 友好性自查**：
   - 根 CLAUDE.md 能让 AI 一眼知道"前端进哪、后端进哪、契约在哪"
   - 各 CLAUDE.md 的"硬性约束"清单具体可执行
   - items demo 的代码风格能被 AI 模仿出 users / posts / 等业务模块
7. **发布预演**：`pnpm publish --dry-run` 内容正确

---

# B. 多 AI 工具兼容重构（AGENTS.md 化）

## B.1 决策摘要

| 项 | 决议 |
|---|---|
| 项目规则事实源 | `AGENTS.md`（根 + 各子目录） |
| `CLAUDE.md` | 一行 pointer：`See [AGENTS.md](./AGENTS.md).` |
| Skill 物理位置 | `.claude/skills/<name>/SKILL.md`（唯一物理副本） |
| Skill 兼容副本 | `.agents/skills/<name>` 与 `.opencode/skills/<name>`（Mac/Linux 用 symlink；Windows fallback 为复制） |
| 子 Agent (Markdown) | `.claude/agents/<name>.md`（Claude Code + OpenCode 共用） |
| 子 Agent (TOML) | `.codex/agents/<name>.toml`，用 `instructions_file = "../../.claude/agents/<name>.md"` 引用同一份提示词，提示词单一来源 |
| AGENTS.md 体积上限 | 根 ≤ 8 KB（Codex 默认 32 KiB 限制下留余量），细节散到子目录 AGENTS.md |

## B.2 文件迁移（A 节产出 → B 节调整）

A 节生成的 4 份 `CLAUDE.md` 全部转换：

| 原文件 | 改成 | 内容来源 |
|---|---|---|
| `templates/default/CLAUDE.md` | `templates/default/AGENTS.md`（事实源）+ `CLAUDE.md`（pointer） | 来自 `docs/根CLAUDE.md`，**精简到 ≤ 8 KB**：保留导航表 + 硬性约束清单，把"内置 demo 详细说明"挪到 `apps/web/AGENTS.md` / `apps/api/AGENTS.md` |
| `templates/default/apps/web/CLAUDE.md` | `apps/web/AGENTS.md` + `apps/web/CLAUDE.md`（pointer） | 来自 `docs/前端项目CLAUDE.md` 原文 |
| `templates/default/apps/api/CLAUDE.md` | `apps/api/AGENTS.md` + `apps/api/CLAUDE.md`（pointer） | 来自 `docs/后端项目的CLAUDE.md` 原文 |
| 新增 `packages/shared/AGENTS.md` | — | 简短说明：单一事实源、命名约定、改字段三处同步 |

`pointer` 内容（4 份完全一致，写死）：

```markdown
# CLAUDE.md

This project uses **[AGENTS.md](./AGENTS.md)** as the single source of project guidance for AI coding agents (Claude Code / OpenCode / Codex / Cursor / Windsurf 等). 请直接阅读 AGENTS.md。
```

## B.3 AGENTS.md 顶部"AI 工具兼容性"标准头

每份 AGENTS.md 顶部插入：

```markdown
> **AI 工具兼容**：本文件遵循 [AGENTS.md 开放标准](https://agents.md)。
> Claude Code / OpenCode / Codex / Cursor / Windsurf 均原生或通过 fallback 读取本文件。
> 子目录的 AGENTS.md 在该子目录下工作时优先级更高。
> 项目级 skill 物理路径：`.claude/skills/`；OpenCode/Codex 通过 `.opencode/skills/` 与 `.agents/skills/` 软链找到同一份。
> 子 Agent：`.claude/agents/*.md`（Claude/OpenCode 共用）+ `.codex/agents/*.toml`（Codex；TOML 仅做配置壳，提示词 `instructions_file` 引用同一份 `.md`）。
```

## B.4 Codex TOML agent 模板

`templates/default/.codex/agents/<name>.toml` 写法：

```toml
name = "backend-developer"
description = "Develop one backend module per concurrent instance, following AGENTS.md."
model_reasoning_effort = "high"
instructions_file = "../../.claude/agents/backend-developer.md"
# tools / sandbox_mode / mcp_servers 等按需扩展，未填则继承父会话
```

> 提示词单一来源是 `.claude/agents/<name>.md`，TOML 仅做 Codex 配置壳。模板里 7 份 TOML 与 7 份 Markdown 名字一一对应。

## B.5 Symlink 创建（CLI scaffold 阶段）

`src/scaffold.ts` 在复制完模板文件后：

1. **检测平台**：`process.platform === 'win32'` ? 复制 : symlink。
2. **Mac/Linux**：
   ```ts
   await fs.symlink(
     path.relative(parent, target),  // 相对路径，方便 git 追踪
     linkPath,
     'dir'
   );
   ```
3. **Windows fallback**：`fs.cp(target, linkPath, { recursive: true })`。
4. 在生成项目里写 `.gitattributes` 加一行 `* text=auto` 与必要时的 symlink 处理说明。

模板 tarball 里**不存** `.agents/skills/` 与 `.opencode/skills/` 这两个目录（避免 npm tarball 跨平台行为不一）—— scaffold 阶段动态创建 symlink/复制，目标都是同一份物理文件 `.claude/skills/<name>/`。

## B.6 测试与验证（B 节专属）

- `pnpm dlx file:$PWD my-app` 后：
  - `cat my-app/CLAUDE.md` → 一行 pointer
  - `cat my-app/AGENTS.md` → 真实内容（含兼容性标准头）
  - `wc -c my-app/AGENTS.md` ≤ 8192
  - `ls -la my-app/.agents/skills/full-dev-flow` → symlink 指向 `../../.claude/skills/full-dev-flow`（Mac/Linux）
  - `cat my-app/.codex/agents/backend-developer.toml` → `instructions_file` 相对路径正确
  - 在 my-app 目录用 Claude Code / OpenCode / Codex 各开一次，各自能找到指引（手动验证）

---

# C. `full-dev-flow` Skill + 7 个子 Agent

## C.1 总体流程

```
Phase 1: 需求理解
  人 → 上传需求文档（md/pdf）+ 设计图（截图） 至 .dev/requirements/
  Skill → 主动澄清模糊点（AskUserQuestion）
  Skill → 产出 .dev/plan.md + .dev/flow.mmd（含 P0/P1/P2 最小闭环划分，由人勾选）
  ⏸ Checkpoint 1：人类确认计划与最小闭环范围

Phase 2: 任务拆分
  Skill → 产出 .dev/tasks/contracts.md（所有 shared schema 列表）
  Skill → 产出 .dev/tasks/backend/task-pX-NN-<module>.md
  Skill → 产出 .dev/tasks/frontend-components/task-pX-NN-<comp>.md
  Skill → 产出 .dev/tasks/frontend-pages/task-pX-NN-<page>.md
  Skill → 产出 .dev/merge-plan.md（合并顺序 + 文件归属表 + 冲突协议）
  ⏸ Checkpoint 2：人类确认任务拆分

Phase 3: 多 Agent 并发开发（按波次 P0 → P1 → P2）
  3.1 串行：contract-author 写所有当波 shared schema 并合入主分支
  3.2 串行：frontend-page-developer 写 routes-skeleton（仅第一波）
  3.3 并发：backend-developer × ≤2（每模块一个 worktree）
  3.4 串行：frontend-component-developer 写完所有当波共享组件
  3.5 并发：frontend-page-developer × ≤3（每页面一个 worktree）
  3.6 每个 task 完成 → test-runner 跑 vitest/supertest → status: done
  3.7 串行：merge-orchestrator 按 merge-plan.md 顺序合并所有 done 的 worktree
  → 进入下一波次（P1 / P2）

Phase 4: 视觉验收（见 D 节）
  visual-qa 用 @playwright/cli 跑流程 + 截图对比设计图
  差异 ≤ 3 轮自动修复
  ⏸ Checkpoint 3：人类最终验收
```

**首次启动检测**：skill 进入时先检查 `.dev/state.json`，存在且未完成则提示"是否续跑？"

## C.2 三大人类 Checkpoint

| # | 时机 | Skill 行为 | 用户输出 |
|---|---|---|---|
| 1 | Phase 1 末 | 主动 `AskUserQuestion`/暂停等回复"确认 / 改 X" | 确认 / 修改建议 / 调整 P0 范围 |
| 2 | Phase 2 末 | 同上 | 确认 / 调整任务拆分 |
| 3 | Phase 4 末 | 给出最终差异报告 | 接受 / 继续修 |

其余阶段（编码、测试、合并）全自动跑，不打扰人类。

## C.3 七个子 Agent

| Agent | 模式 | 并发上限 | 职责 |
|---|---|---|---|
| `contract-author` | 串行 | 1 | 写 `packages/shared/src/<module>/schema.ts` 与 OpenAPI 注册；**唯一**能改 `packages/shared/` 的 agent |
| `backend-developer` | 并发 | 2 | 每个后端模块一个实例（routes / db / ws），**唯一**能改自己模块文件 |
| `frontend-component-developer` | 串行 | 1 | 写 `apps/web/src/components/shared/*` 复用组件；**唯一**能改 shared 组件目录 |
| `frontend-page-developer` | 并发 | 3 | 每个页面一个实例（写 `apps/web/src/features/<page>/*`），**禁止**改 `routes.tsx` |
| `test-runner` | 按需 | 不限 | 跑 vitest + supertest + lint，回写 task.md 的 Status Log |
| `visual-qa` | 串行 | 1 | 见 D 节 |
| `merge-orchestrator` | 串行 | 1 | 读 worktrees.log + merge-plan.md，按序 merge；冲突写到 `.dev/conflicts/<task>.md` 等人类 |

**特殊任务**：第一波由 `frontend-page-developer` 负责的 `task-p0-00-routes-skeleton.md` 一次性写好所有路由占位，后续 page agent **禁止改** `routes.tsx`。同理后端 `apps/api/src/app.ts` 的路由注册由 `contract-author` 在写 schema 阶段一次性注册全部模块占位 router（实际 router 实现由 backend-developer 后续填）。

## C.4 任务文档固定模板（9-section）

每份 `task-pX-NN-<name>.md` 必须包含 9 节，模板放 `.claude/skills/full-dev-flow/templates/task-template.md`：

```markdown
# Task pX-NN: <module/page/component name>

**Agent**: backend-developer | frontend-page-developer | ...
**Wave**: P0 | P1 | P2
**Depends on**: [task-pX-MM, ...]    # 必须先完成才能开
**Status**: pending | running | done | failed | merged

## 1. 目标
（一句话）

## 2. 输入数据
（route params / query / body schema 或 component props，**必须引用 @workspace/shared 里的 schema 名**）

## 3. 输出数据
（response schema / render output / event）

## 4. 依赖
- shared schema: ItemDto / CreateItemPayload
- 其他任务产出: task-p0-01 提供的 X
- 第三方库: react-hook-form

## 5. 实现要点
- 关键算法 / 边界情况 / 错误处理
- 必须遵循的项目规范引用（指向 AGENTS.md 的具体小节）

## 6. 文件清单
- 新建: apps/api/src/routes/items.ts
- 修改: apps/api/src/app.ts (注册 router 占位已存在，仅替换实现)
- 不动: apps/api/src/db.ts

## 7. 验收标准
- 单元测试: items.test.ts 中 X/Y/Z case 通过
- 集成测试: curl <example>
- 静态: pnpm typecheck + pnpm lint 全过

## 8. 不做（反向澄清）
- 不做分页/搜索（属 P1）
- 不做权限控制
- 不写 e2e 测试

## 9. Status Log
（agent 完成后追加）
- [2026-04-26T10:00] running on worktree X
- [2026-04-26T10:25] done; tests pass; ready to merge
```

`contracts.md` / `merge-plan.md` 不用 9-section 模板，各自单独。

## C.5 `.dev/` 目录约定与中断恢复

```
.dev/
├─ state.json                    # 当前 phase / 当前 wave / 上次活动时间 / checkpoints 状态
├─ requirements/                 # 用户上传的 .md / .png / .pdf
├─ plan.md                       # Phase 1 输出
├─ flow.mmd                      # Mermaid 流程图
├─ tasks/
│  ├─ contracts.md               # shared schema 总索引
│  ├─ backend/task-pX-NN-*.md
│  ├─ frontend-components/task-pX-NN-*.md
│  └─ frontend-pages/task-pX-NN-*.md
├─ merge-plan.md                 # 合并顺序 + 文件归属表 + 冲突协议
├─ worktrees.log                 # YAML，所有 worktree 注册表（见 C.6）
├─ conflicts/                    # merge-orchestrator 写入冲突报告
└─ visual-diff/<page>-<iter>/
   ├─ design.png  (输入设计图副本)
   ├─ actual.png  (playwright-cli 截图)
   ├─ diff.md     (AI 视觉描述差异 + 修复建议)
   └─ patches/    (每轮 AI 应用的代码 patch，便于回溯)
```

**`.gitignore` 追加**：
```
.dev/visual-diff/**/*.png
.dev/visual-diff/**/*.jpg
```
其余 `.dev/` 内容**全部提交 git**。

**`state.json` 格式**（程序读写）：
```json
{
  "phase": 3,
  "wave": "P0",
  "last_activity": "2026-04-26T10:30:00Z",
  "running_tasks": ["task-p0-02-items-backend"],
  "completed_tasks": ["task-p0-00-routes-skeleton", "task-p0-01-contracts-items"],
  "checkpoints": { "1": "approved", "2": "approved", "3": "pending" }
}
```

模板里**只放一份 `.dev/.gitkeep`** 让目录被 git 追踪；其余内容由 skill 运行时按需创建。

## C.6 Git Worktree 编排

**`worktrees.log` 格式**（YAML，追加式，人类可读 + 易追加）：
```yaml
- task_id: task-p0-02-items-backend
  branch: feat/p0/items-backend
  worktree_path: ../<project>.wt/p0-items-backend
  agent: backend-developer
  started_at: 2026-04-26T10:00:00Z
  status: running          # running | done | failed | merged | abandoned
  commits: []              # 完成时填 commit SHA 数组
  notes: ""

- task_id: task-p0-03-items-page
  branch: feat/p0/items-page
  worktree_path: ../<project>.wt/p0-items-page
  agent: frontend-page-developer
  ...
```

**Worktree 命名约定**：`../<project>.wt/<wave>-<short-task-name>`，主仓库**外**的兄弟目录，避免 nested 影响 IDE。

**`merge-plan.md` 关键内容**：
1. **合并顺序**（按 wave + 拓扑）：`contracts → routes-skeleton → backend × N → components → pages × N`，同 wave 内按 `worktrees.log` 顺序串行 merge。
2. **文件归属表**（防撞核心）：
   ```
   packages/shared/**                        → contract-author（独占）
   apps/api/src/routes/<name>.ts             → backend-developer:<name>（独占）
   apps/api/src/app.ts                       → contract-author 一次性写好所有路由注册占位
   apps/web/src/routes.tsx                   → frontend-page-developer:routes-skeleton（独占首波）
   apps/web/src/components/shared/**         → frontend-component-developer
   apps/web/src/features/<n>/**              → frontend-page-developer:<n>（独占）
   apps/web/src/lib/api/**                   → contract-author + 第一个 frontend agent
   ```
3. **冲突协议**：merge 冲突时**不**自动 resolve，写 `.dev/conflicts/<task>.md` 含三栏（base / ours / theirs）+ 推荐解决方案，等人类批改 → `merge-orchestrator` 续跑。

**`merge-orchestrator` 流程**：
```
1. 读 worktrees.log，筛 status: done 的
2. 按 merge-plan.md 顺序 + 拓扑排序
3. 对每个 worktree：
   git fetch <wt-branch>
   git merge --no-ff <wt-branch>
   if conflict:
     生成 .dev/conflicts/<task>.md
     更新该任务 status: blocked
     break  ← 不继续后续 merge
   else:
     更新 status: merged
     git worktree remove <wt-path>
4. 全部 merged 后写 .dev/state.json 进入下一 wave
```

**中断恢复逻辑**（skill 启动时）：
```
1. 读 .dev/state.json
2. 读 worktrees.log，找出 status: running 但超过 30 分钟无活动的
3. AskUserQuestion: 续跑 / 放弃（git worktree remove + status: abandoned） / 重启
4. 按用户回复执行
```

## C.7 文件清单（CLI 模板新增）

```
templates/default/
├─ AGENTS.md                                # 见 B 节（事实源）
├─ CLAUDE.md                                # pointer
├─ _gitignore                              # 已存在，加 .dev/visual-diff 二进制规则
├─ .claude/
│  ├─ skills/
│  │  ├─ full-dev-flow/
│  │  │  ├─ SKILL.md                       # YAML frontmatter + 完整流程
│  │  │  ├─ templates/
│  │  │  │  ├─ task-template.md            # 9-section 模板
│  │  │  │  ├─ plan-template.md            # Phase 1 计划模板（含 P0/P1/P2 勾选区）
│  │  │  │  ├─ contracts-template.md
│  │  │  │  └─ merge-plan-template.md
│  │  │  └─ scripts/
│  │  │     └─ check-state.mjs             # 启动时读 state.json + worktrees.log
│  │  └─ playwright-cli/                    # 见 D 节
│  └─ agents/
│     ├─ contract-author.md
│     ├─ backend-developer.md
│     ├─ frontend-component-developer.md
│     ├─ frontend-page-developer.md
│     ├─ test-runner.md
│     ├─ visual-qa.md
│     └─ merge-orchestrator.md
└─ .codex/
   └─ agents/
      ├─ contract-author.toml
      ├─ backend-developer.toml
      ├─ frontend-component-developer.toml
      ├─ frontend-page-developer.toml
      ├─ test-runner.toml
      ├─ visual-qa.toml
      └─ merge-orchestrator.toml
```

## C.8 SKILL.md frontmatter 标准头

```yaml
---
name: full-dev-flow
description: 从需求文档+UI图全自动开发整个项目；分 4 phase 含 3 人类 checkpoint，并发子 agent + git worktree + playwright 视觉验收。
---
```

OpenCode / Claude Code / Codex 都支持同一份 frontmatter。

---

# D. Playwright CLI 集成与视觉验收回路

## D.1 决策摘要

| 项 | 决议 |
|---|---|
| 包 | `@playwright/cli`（**不**装 `@playwright/test`） |
| 装在 | `apps/web/devDependencies` |
| 调用方式 | `pnpm -F web exec playwright-cli <subcommand>` |
| 官方 SKILL | vendored 在 `templates/default/.claude/skills/playwright-cli/SKILL.md`（带版本号 + 原仓库链接 + license attribution） |
| 生成的 e2e | 保存到 `apps/web/tests/e2e/<flow>.spec.ts`，留作回归用（用户后续可装 @playwright/test 跑回归，模板默认不装） |
| 视觉差异判定 | AI 视觉模型读截图描述差异，**不**做像素 diff |
| 自动修复轮数 | ≤ 3 轮，超出则交人类 |
| 修复约束 | visual-qa 只能改 `*.css` / Tailwind className / 样式相关 props，**禁止**改业务逻辑 / props 形状 / 路由 |

## D.2 SKILL vendoring 流程

模板生成时直接内置 Microsoft 官方 `playwright-cli` SKILL 的快照：

1. **首次集成**：CLI 开发者手动从 https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md 抓取并定版。
2. **vendored 文件**：`templates/default/.claude/skills/playwright-cli/SKILL.md`，文件**最末尾**加注释：
   ```markdown
   <!--
   Vendored from microsoft/playwright-cli @ <commit-sha>
   Source: https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md
   License: <upstream license>
   -->
   ```
3. **更新策略**：CLI 模板版本升级时（`create-ai-fullstack` 自身版本升级）抓最新 SKILL，不在用户机器上动态拉。

## D.3 visual-qa 子 Agent 工作流

`templates/default/.claude/agents/visual-qa.md` 内容核心：

```
Input:
- .dev/requirements/<page>-design.png   # 设计图
- 当前页面 URL（dev server 已起）

Steps:
1. 用 playwright-cli open <url>
2. 等待页面 ready 后 playwright-cli screenshot → .dev/visual-diff/<page>-iter-N/actual.png
3. 用视觉模型对比 design.png vs actual.png，输出差异列表（含影响区域 + 严重度）
4. 若所有差异均 minor：写 diff.md，返回 done
5. 若有 major 差异且 iter < 3：
   - 生成针对性的 className/CSS patch（仅样式相关）
   - 应用 patch 并保存到 patches/ 目录
   - 重启 page → 回到 step 2
6. 若 iter ≥ 3 仍未达标：写 diff.md 标 needs-human，返回 blocked
```

**严重度判定**：
- minor：色差 / 微小 spacing / 字号 ≤ 1px 差异
- major：布局错位 / 元素缺失 / 颜色完全不对 / 文案错误

## D.4 与 dev server 的协作

visual-qa 启动前：
- 读 `.dev/state.json` 确认 dev server 是否已启动；若未启动，运行 `pnpm dev` 后台启动并 `wait-on http://localhost:5173`
- 验收完成后**不**杀 dev server（用户可能在用）

## D.5 文件清单（CLI 模板新增）

```
templates/default/
├─ apps/web/
│  ├─ package.json                           # devDependencies 加 @playwright/cli
│  └─ tests/
│     └─ e2e/.gitkeep                        # 占位，留作 playwright-cli 生成 .spec.ts 的目标
└─ .claude/
   ├─ skills/playwright-cli/SKILL.md          # vendored from Microsoft
   └─ agents/visual-qa.md
```

---

# E. 总实施 Phase（更新）

合并 A/B/C/D 后，整个项目的实施分 5 个大 Phase：

## Phase 1（A 节）：基础模板
按 A 节"实施顺序"第 1–8 步执行。
**完成标志**：`pnpm dlx file:$PWD my-app` 跑出可工作的 monorepo（前后端 dev / build / test 全绿，items demo + WS demo 端到端可用）。

## Phase 2（B 节）：AGENTS.md 化
- 把 4 份 CLAUDE.md 改造为 AGENTS.md + pointer
- 根 AGENTS.md 缩到 ≤ 8 KB
- 新增 `packages/shared/AGENTS.md`
- CLI scaffold 加上 symlink/复制逻辑（`.agents/skills/`、`.opencode/skills/`）
- 写 7 份 `.codex/agents/*.toml`（指向同一份 `.claude/agents/*.md`）

**完成标志**：scaffold 后 `cat my-app/AGENTS.md` 正确，symlink/复制按平台正确创建，体积 ≤ 8 KB。

## Phase 3（C 节）：full-dev-flow Skill + 子 Agent
- 写 `.claude/skills/full-dev-flow/SKILL.md`（含 4 份 templates/* 与 helper 脚本）
- 写 7 份 `.claude/agents/<name>.md`
- 写对应 7 份 `.codex/agents/<name>.toml`（仅引用 `.md`）
- 每份 agent 文档明确"独占文件归属"+"禁止改"清单

**完成标志**：在生成的项目里手动跑一次 `/full-dev-flow`（用一个非常小的需求，如"加一个 todo 字段"），观察 Phase 1–3 流转、`.dev/` 目录文件齐全、worktree 创建/合并/清理无误。

## Phase 4（D 节）：Playwright CLI + 视觉验收
- vendoring `playwright-cli` SKILL（含原仓库 commit sha 与 license attribution）
- 写 `visual-qa.md`
- `apps/web/package.json` 加 `@playwright/cli`
- 模板里 `apps/web/tests/e2e/` 加 `.gitkeep`

**完成标志**：在 Phase 3 的小需求验证基础上，跑 visual-qa 给 items 列表做一次截图比对（即便没有正式设计图也走通流程，输出 diff.md）。

## Phase 5：端到端验证 + 发布
1. 完整跑 `scripts/verify-template.sh`
2. 在干净空目录用 Claude Code / OpenCode / Codex CLI 各开一次，验证 AGENTS.md / skill / agent 都被正确发现
3. `pnpm publish --dry-run` 确认 tarball 包含：
   - `dist/`、`templates/`、`README.md`、`LICENSE`
   - `templates/default/.claude/skills/`、`.claude/agents/`、`.codex/agents/` 全部齐全
   - **不**包含 `templates/default/.dev/visual-diff/` 内的二进制
4. 版本：`0.1.0`（首版同时含 A/B/C/D），后续 minor 升级 vendored playwright-cli SKILL

---

# F. 端到端验证（更新）

在 A 节"端到端验证"7 项基础上追加：

8. **多工具发现性**：
   - Claude Code 在生成的项目里跑：`AGENTS.md` 被读、`.claude/skills/full-dev-flow` 被发现、`.claude/agents/*.md` 7 个全在
   - OpenCode：手动在项目根跑 OpenCode CLI，验证 `AGENTS.md` 被引用、`.claude/skills/` 被扫到（OpenCode 已支持）
   - Codex CLI：`codex` 启动时读 `AGENTS.md`、`.agents/skills/full-dev-flow`（symlink）、`.codex/agents/*.toml` 7 个全识别
9. **Symlink 跨平台**：
   - macOS / Linux：symlink 创建成功，`git status` 干净（追踪相对路径符号链接）
   - Windows：scaffold 自动 fallback 为复制，运行无错（生成的项目可工作但不复用文件，多占空间）
10. **Skill 触发**：在 Claude Code 里手动 `/full-dev-flow`，能正确进入 Phase 1 并主动 `AskUserQuestion`
11. **Worktree 全流程**：用一个 mini 需求（如增加 `Item.tag` 字段）跑通 P0 单波次：
    - contract-author worktree 创建 + schema 改动 + merge
    - backend worktree + frontend page worktree 并发
    - merge-orchestrator 串行合并、无冲突
    - `.dev/state.json` 与 `worktrees.log` 状态一致
12. **Visual QA 闭环**：visual-qa 跑一次截图对比、生成 diff.md、在 ≤ 3 轮内输出 done 或 needs-human
13. **中断恢复**：在 Phase 3 中途强行 `kill` skill，再启动检测 `state.json` + 提示续跑，能从断点继续
14. **AGENTS.md 体积**：`wc -c AGENTS.md` ≤ 8192（≤ 8 KB）
