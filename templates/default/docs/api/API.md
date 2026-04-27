# VibeContest API — 通用约定

> 本文档面向前端开发。描述所有接口共用的基础信息、响应格式、错误处理、状态码，便于统一封装 axios / fetch 拦截器。

---

## 基础信息

| 项 | 值 |
|---|---|
| **Base URL（开发）** | `http://localhost:3000` |
| **协议** | HTTP/1.1 |
| **内容格式** | JSON，`Content-Type: application/json` |
| **字符编码** | UTF-8 |
| **鉴权** | 暂无（后续接入后补充 `Authorization: Bearer <token>`） |
| **CORS** | 服务端启用 `cors()` 通配，浏览器可跨域直连 |
| **安全响应头** | `helmet()` 默认策略，但关闭 CSP 以避免 Scalar `/docs` 空白 |

---

## 请求约定

- `GET` / `DELETE`：参数通过 query string 或 path 传递，不带 body。
- `POST` / `PUT` / `PATCH`：body 必须是合法 JSON，**即使是空对象也要传 `{}`** 而不是空字符串。
- 必填 `Content-Type: application/json` 才会被 `express.json()` 解析；否则 `req.body` 为 `undefined`，后端会按「缺字段」报 400。
- Query 参数中的布尔用 **字符串字面量** `"true"` / `"false"`（由后端解析）。

---

## 响应约定

### 成功响应

- **`200 OK`**：GET / PUT 正常返回，body 为资源对象或列表。
- **`201 Created`**：POST 创建成功，body 为新建资源（含 `id` 和时间戳）。
- **`204 No Content`**：DELETE 成功，**无 response body**。前端封装时要判断 `status === 204` 跳过 `res.json()`。

### 列表分页响应（通用）

列表型接口统一返回以下结构：

```ts
interface Paginated<T> {
  total: number;   // 满足过滤条件的总数（不受 limit/offset 影响）
  limit: number;   // 本次返回条数（回显，方便前端展示）
  offset: number;  // 本次偏移量（回显）
  items: T[];      // 数据数组，通常按 createdAt DESC 排序
}
```

### 错误响应（统一格式）

**所有错误**（4xx / 5xx）body 结构一致：

```ts
interface ApiError {
  error: string; // 人类可读的错误描述
}
```

示例：
```json
{ "error": "title is required and must be a non-empty string" }
```

> ⚠️ 目前 `error` 只是字符串，不含 `code` / `details`。若前端需要根据错误类型做分支，暂用 HTTP 状态码区分。后续引入错误码时会在此文档扩展。

---

## 状态码一览

| 码 | 语义 | 何时出现 |
|---|---|---|
| `200 OK` | 请求成功 | GET 查询、PUT 更新返回资源 |
| `201 Created` | 创建成功 | POST 新资源 |
| `204 No Content` | 成功且无返回体 | DELETE 删除成功 |
| `400 Bad Request` | 请求参数/请求体校验失败 | 必填字段缺失、类型错误、非法枚举值 |
| `401 Unauthorized` | 未认证（**预留**） | 未来接入鉴权后使用 |
| `403 Forbidden` | 已认证但无权限（**预留**） | 未来接入权限后使用 |
| `404 Not Found` | 资源不存在或路径未注册 | `GET /items/9999`、`/not-exist` |
| `500 Internal Server Error` | 服务器异常 | 未捕获异常，body 为 `{ error: err.message }` |

---

## 时间字段约定

- 所有时间字段（`createdAt` / `updatedAt` 等）来自 SQLite `datetime('now')`，格式 **`YYYY-MM-DD HH:mm:ss`（UTC，空格分隔）**，**不是** ISO 8601。
- 前端解析建议：

```ts
// 把后端时间字符串转为本地 Date
export const parseServerTime = (s: string) => new Date(s.replace(' ', 'T') + 'Z');
```

---

## axios 封装参考

### 创建实例

```ts
import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? 'http://localhost:3000',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});
```

### 响应拦截器（统一错误）

```ts
interface ApiError { error: string }

api.interceptors.response.use(
  // 成功：直接返回 data；204 时 data 是 ''，按 null 返回
  (res) => (res.status === 204 ? null : res.data),

  // 失败：归一化错误消息
  (err: AxiosError<ApiError>) => {
    const status = err.response?.status;
    const message =
      err.response?.data?.error ??
      err.message ??
      '网络错误';

    // 示例：按状态码做全局处理
    if (status === 401) {
      // TODO: 跳转登录
    } else if (status === 500) {
      // TODO: toast("服务器开小差了")
    }

    return Promise.reject(Object.assign(new Error(message), { status, raw: err }));
  },
);
```

### 使用示例

```ts
// 列表
const { items, total } = await api.get<Paginated<Item>>('/items', {
  params: { limit: 20, offset: 0, q: '咖啡' },
});

// 创建
const item = await api.post<Item>('/items', { title: '新任务' });

// 删除（204 → null）
await api.delete(`/items/${id}`);
```

> 注意拦截器里已经 `return res.data`，所以 `api.get<T>(...)` 的返回值实际就是 `T`，不用再 `.data`。如果你的拦截器保持默认（返回 `AxiosResponse`），记得调用方 `.data` 取值。

---

## 请求/响应调试建议

- **推荐工具**：curl、Postman、或浏览器 DevTools Network。
- **CORS 排错**：若浏览器控制台报跨域，先确认后端已启动（`npm run dev`）、Base URL 正确；默认是通配 `*`，一般不会有问题。
- **400 排错**：优先检查 `Content-Type` 和 JSON 合法性；后端错误消息会明确指出是哪个字段。
- **连不上**：`curl http://localhost:3000/health` 应返回 `{"ok":true}`。

---

## 契约三件套（重要）

本仓库的 API 契约由三层构成，**单一事实源是 Zod schema**：

| 层 | 位置 | 角色 | 谁来读 |
|---|---|---|---|
| **Zod schema** | `packages/shared/src/<module>/schema.ts` | 唯一事实源；定义请求/响应/参数结构与校验规则 | 后端中间件、前端类型推导、OpenAPI 生成器 |
| **API-xx.md** | `docs/api/API-<module>.md` | 人类可读契约；写字段语义、错误码语义、curl 示例 | 前后端开发、AI Code Agent |
| **openapi.json** | `docs/openapi.json`（自动生成）| 机器可读契约；驱动 `/docs` 站点和潜在的代码生成 | 工具链、客户端 |

### 工作流约束

1. **新增/修改字段**：先改 `packages/shared` 里的 Zod schema，**再**同步 `API-<module>.md`，最后跑 `pnpm gen:openapi` 刷新 `docs/openapi.json`。
2. **后端使用**：路由用 `validate(schema)` 中间件统一校验 `body / query / params`，校验失败直接 400 + `{ error: string }`（错误消息取 Zod issue 的 `message`）。**禁止**手写散落的 `if (!req.body.x)` 校验。
3. **前端使用**：从 `@workspace/shared` 直接 `import type { ItemDto, CreateItemPayload }`，不再手抄 interface。表单用 `react-hook-form` + `zodResolver(schema)`，与后端共用同一 schema。
4. **OpenAPI 站点**：后端启动时挂 `/docs`（使用 `@scalar/express-api-reference`），开发时直接浏览器打开 `http://localhost:3000/docs` 即可看到所有接口。

### shared 包导出约定

```ts
// packages/shared/src/items/schema.ts
import { z } from "zod";

export const ItemDto = z.object({
  id: z.number().int(),
  title: z.string().min(1).max(200),
  createdAt: z.string(), // 后端原生 SQLite 时间格式，不强约束
  updatedAt: z.string(),
});
export type ItemDto = z.infer<typeof ItemDto>;

export const CreateItemPayload = z.object({
  title: z.string().trim().min(1).max(200),
});
export type CreateItemPayload = z.infer<typeof CreateItemPayload>;

export const ListItemsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
});
```

> **命名**：schema 与推导出的类型同名（`export const X` + `export type X`），引用方一律 `import { X, type X } from "@workspace/shared"`。

### 时间字段提醒

后端返回的 `createdAt / updatedAt` 是 SQLite 原生格式 `"YYYY-MM-DD HH:mm:ss"`（UTC、空格分隔，**不是 ISO 8601**）。Zod schema 仅声明 `z.string()`，**不**用 `z.string().datetime()`，否则会校验失败。前端解析统一用 `parseServerTime()`。

---

## 已有接口索引

| 模块 | 文档 |
|---|---|
| 健康检查 | `GET /health` → `{ "ok": true }` |
