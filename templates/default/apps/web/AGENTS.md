# AGENTS.md (apps/web)

> **AI 工具兼容**：本文件遵循 [AGENTS.md 开放标准](https://agents.md)。
> Claude Code / OpenCode / Codex / Cursor / Windsurf 均原生或通过 fallback 读取本文件。
> 子目录的 AGENTS.md 在该子目录下工作时优先级更高。
> 当前模板不预置项目级 skills 或子 agent；自动化开发流会在后续阶段重新接入。

本文件为 AI 编码代理在**前端子项目**（`apps/web`）中工作时的指引。Monorepo 根级指引见仓库根目录的 [AGENTS.md](../../AGENTS.md)。

## 命令

> 命令均通过根级 `pnpm -F web <script>` 调用，或在 `apps/web/` 目录里直接 `pnpm <script>`。

- `pnpm dev` — 启动 Vite 开发服务器（HMR）。
- `pnpm build` — 先类型检查（`tsc -b`）再产出生产包。交付前必须通过，TS 步骤不可跳过。
- `pnpm lint` — ESLint（继承根级配置）。
- `pnpm preview` — 本地预览生产包。
- `pnpm test` — `vitest run`（jsdom 环境）。

## 语言

始终使用中文回复用户。

## 技术栈

前端：**Vite 8 + React 19 + TypeScript + React Router v7 + Tailwind CSS v4 + shadcn/ui + TanStack Query + Axios + zustand + react-hook-form + zod**，对接独立的 Express 后端。接口定义以 `@workspace/shared` 和运行时 `http://localhost:3000/docs` 为准。

- **类型与校验**：所有请求/响应类型与表单校验 schema 都来自 `@workspace/shared`，**不在前端手抄 interface**。
- **表单**：统一 `react-hook-form` + `@hookform/resolvers/zod`，schema 与后端共用同一个。

## 架构

- **入口**：[src/main.tsx](src/main.tsx) 在全局 `QueryClientProvider` + `TooltipProvider` + `RouterProvider` 内挂载，并渲染全局 `<Toaster />`（sonner）。新增全局 Provider（主题等）放这里，不要塞进 `App`。
- **路径别名**：`@/*` → `src/*`，在 [vite.config.ts](vite.config.ts) 和 [tsconfig.app.json](tsconfig.app.json) 都配了。**一律用 `@/…`，不要相对路径。** 跨包导入 shared 用 `@workspace/shared`。
- **样式**：Tailwind CSS v4，通过 `@tailwindcss/vite` 接入（**没有 `tailwind.config.js`**，配置写在 CSS 里）。全局 token、`shadcn/tailwind.css` 引入、`dark` 自定义 variant、`@theme inline` CSS 变量绑定都集中在 [src/index.css](src/index.css)。新增设计 token 请扩展那个 `@theme` 块，**不要**另建 Tailwind 配置文件。
- **UI 组件**：shadcn 组件位于 [src/components/ui](src/components/ui/)，配置见 [components.json](components.json)（`style: radix-nova`、`baseColor: neutral`、图标库 `lucide`）。**shadcn/ui 的所有组件已经装好**，直接 `import` 使用即可，不需要再跑 shadcn CLI 添加。
- **基础 Primitive**：同时装了 `radix-ui` 和 `@base-ui/react`，现有 UI 基于 Radix，扩展时保持一致。变体样式用 `class-variance-authority` + [src/lib/utils.ts](src/lib/utils.ts) 里的 `cn()`。
- **路由**：用 `react-router` v7 的 **`createBrowserRouter`**，**不要**使用 React Router 的 Data APIs（`loader` / `action` / `useLoaderData` 等）。数据拉取统一交给 TanStack Query。
- **客户端状态**：`zustand`（server state 归 TanStack Query，client state 才用 zustand）。

## 数据层（API 调用）

**所有请求一律走 TanStack Query + axios**，并使用统一封装的拦截器。API 层集中在 [src/lib/api/](src/lib/api/)：

- [src/lib/api/client.ts](src/lib/api/client.ts) —
  - `api`：axios 实例（`baseURL` 来自 `VITE_API_BASE`，默认 `http://localhost:3000`；10s 超时；默认 `Content-Type: application/json`）。
  - 响应拦截器统一归一化错误为 `ApiError`；401/403/500/网络错误有默认 toast/占位处理。
  - `http.{get,post,put,patch,delete}` —— 在 axios 之上的薄封装，自动解包 `res.data`，并把 `204 No Content` 转成 `null`。**业务层优先用 `http.*` 而不是直接 `api.*`**。
- [src/lib/api/types.ts](src/lib/api/types.ts) — `Paginated<T>`（`{ total, limit, offset, items }`）、`ApiErrorBody`（`{ error: string }`）、`ApiError` 类（含 `status` / `raw`，业务层可 `instanceof` 判别）。`Paginated` 与 `ApiErrorBody` 的 schema 实际来自 `@workspace/shared`，此文件做 re-export 与本地类。
- [src/lib/api/query-client.ts](src/lib/api/query-client.ts) — 全局 `queryClient`：`staleTime 30s`、关 `refetchOnWindowFocus`、4xx 不重试、mutation 不重试。
- [src/lib/api/time.ts](src/lib/api/time.ts) — `parseServerTime(s)`：把后端 `YYYY-MM-DD HH:mm:ss`（UTC、空格分隔，**非 ISO 8601**）转成 `Date`。
- [src/lib/api/ws.ts](src/lib/api/ws.ts) — `useWebSocket(path, { onMessage })` hook，自动重连、心跳。
- [src/lib/api/index.ts](src/lib/api/index.ts) — 桶导出，业务层统一 `from "@/lib/api"`。

后端约定：
- 所有错误响应结构一致：`{ error: string }`。
- 列表接口统一返回 `Paginated<T>`。
- `DELETE` 成功返回 `204`，无 body（`http.delete` 已处理，返回 `null`）。

### 请求/查询示例

```ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { http, queryClient, type Paginated, ApiError } from "@/lib/api";
import type { ItemDto, CreateItemPayload } from "@workspace/shared";

const { data } = useQuery({
  queryKey: ["items", { limit: 20, offset: 0 }],
  queryFn: () =>
    http.get<Paginated<ItemDto>>("/items", { params: { limit: 20, offset: 0 } }),
});

const createItem = useMutation({
  mutationFn: (payload: CreateItemPayload) => http.post<ItemDto>("/items", payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
});

await http.delete(`/items/${id}`);

try {
  await http.post("/items", payload);
} catch (e) {
  if (e instanceof ApiError && e.status === 400) {
    // 字段校验错误，e.message 已是后端返回的人类可读信息
  }
}
```

> 拦截器已处理通用错误 toast，业务层**不要**再对 401/403/500/网络错误重复弹提示，只处理业务相关分支（比如 400/404）。

### 表单示例（react-hook-form + zod）

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateItemPayload, type CreateItemPayload as CreateItemPayloadT } from "@workspace/shared";

const form = useForm<CreateItemPayloadT>({
  resolver: zodResolver(CreateItemPayload),
  defaultValues: { title: "" },
});

const onSubmit = form.handleSubmit((values) => createItem.mutate(values));
```

> **Schema 同源**：与后端用同一份 `CreateItemPayload`。前端校验是为了减少无效请求，**最终权威以后端为准**。

## TypeScript 注意

`tsconfig.app.json` 开启了 `verbatimModuleSyntax`、`noUnusedLocals`、`noUnusedParameters`、`erasableSyntaxOnly`。实际含义：

- 仅用于类型的 import 必须写 `import type { … }`。
- 不要留未使用的变量或参数 —— 会直接让 build 失败，不只是 lint 警告。
- 避免会产出运行时代码的 TS 特性（`enum`、参数属性、`namespace`）；优先用 `as const` 对象或普通 class。
