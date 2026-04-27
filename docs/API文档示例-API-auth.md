# Auth API（登录 / 注册）

> 实时评论墙的账号体系。涵盖注册、登录、登出、获取当前用户。
>
> 通用约定（Base URL、错误格式、状态码、时间字段等）见 [API.md](./API.md)，本文档只描述 Auth 模块的独有部分。
>
> **字段命名一次定稿**：下文出现的字段名（`username` / `displayName` / `avatarUrl` / `token` 等）为前后端契约，实现时不得随意重命名或增删。

---

## 鉴权方式

- **方案**：`Authorization: Bearer <token>`，token 由 `POST /auth/login` 或 `POST /auth/register` 下发。
- **Token 类型**：JWT（HS256），`exp` 默认 7 天。前端保存在 `localStorage`，刷新页面后仍可登录（对应 Figma 中的「自动登录」）。
- **携带方式**：所有需要登录态的接口都读 `Authorization` 头。未携带或非法 → `401`；token 合法但无权操作某资源 → `403`。
- **登出**：前端丢弃 token 即可；服务端当前不维护黑名单（未来如需强制踢下线再扩展）。`POST /auth/logout` 做为可选埋点，始终返回 `204`。
- **WebSocket 鉴权**：建立连接时，客户端通过 query（`?token=<jwt>`）或连接后首帧消息把 token 传给服务端（具体格式见后续 `API-realtime.md`，本文档不展开）。

### 受保护接口列表（全量）

| 作用域 | 接口 | 说明 |
|---|---|---|
| 必须登录 | `GET /auth/me` | 取当前用户 |
| 必须登录 | `POST /auth/logout` | 登出（幂等） |
| 必须登录 | `POST /comments` | 发表评论卡片 |
| 必须登录 | `PUT /comments/:id` | 仅本人卡片可改（内容 / 位置） |
| 必须登录 | `DELETE /comments/:id` | 仅本人卡片可删 |
| 必须登录 | `POST /comments/:id/like` | 点赞（不可给自己点赞由业务判定） |
| 必须登录 | `DELETE /comments/:id/like` | 取消点赞 |
| 公共 | `GET /comments` | 未登录也可读画板 |
| 公共 | `POST /auth/register` / `POST /auth/login` | 登录 / 注册本身 |

> 评论相关接口定义在后续的 `API-comments.md`，此处仅列出以便后端统一做中间件。

---

## 资源模型

### 表结构（SQLite，建议）

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,          -- 登录账号，唯一
  password_hash TEXT    NOT NULL,                 -- bcrypt / argon2，不出参
  display_name  TEXT    NOT NULL,                 -- 展示昵称，注册时默认 = username
  avatar_url    TEXT    NOT NULL DEFAULT '',      -- 头像 URL，可空串
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### 响应实体 `User`（公开视图，所有接口统一用这个结构返回用户）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `number` (int) | 自增主键 |
| `username` | `string` | 登录账号，唯一 |
| `displayName` | `string` | 展示昵称（卡片署名、侧边栏 hover 名等都用这个） |
| `avatarUrl` | `string` | 头像 URL，允许空串（前端空串时回退到首字母 / 默认图） |
| `createdAt` | `string` | UTC `"YYYY-MM-DD HH:mm:ss"` |
| `updatedAt` | `string` | 同上 |

> **绝对不会返回** `passwordHash` / `password` 字段。

### 登录响应实体 `AuthSession`

| 字段 | 类型 | 说明 |
|---|---|---|
| `token` | `string` | JWT，前端放进 `Authorization: Bearer <token>` |
| `expiresAt` | `string` | UTC `"YYYY-MM-DD HH:mm:ss"`，token 过期时间（前端可用于做主动刷新提示，暂不实现刷新端点） |
| `user` | `User` | 当前用户公开视图 |

### TypeScript 类型（前端直接复制）

```ts
export interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: User;
}

export interface RegisterPayload {
  username: string;      // 必填，3–30，[A-Za-z0-9_.@-]
  password: string;      // 必填，6–30，任意可打印字符
  displayName?: string;  // 可选，1–30；省略时后端置为 username
  avatarUrl?: string;    // 可选，默认 ""
}

export interface LoginPayload {
  username: string;
  password: string;
}
```

---

## 字段约束（前后端统一校验）

| 字段 | 约束 | 错误消息（后端返回） |
|---|---|---|
| `username` | 必填；`trim` 后长度 3–30；仅允许 `A–Z a–z 0–9 _ . @ -` | `username must be 3-30 chars of [A-Za-z0-9_.@-]` |
| `password` | 必填；长度 6–30；不做 `trim`（允许前后空格） | `password must be 6-30 chars` |
| `displayName` | 可选；`trim` 后长度 1–30；任意字符（含中文） | `displayName must be 1-30 chars` |
| `avatarUrl` | 可选；长度 ≤ 500；必须是 `http(s)://` 或空串 | `avatarUrl must be a valid http(s) url or empty` |

> 前端也必须按上表做输入校验，避免多余请求；但**最终权威以后端为准**。

---

## 1. 注册

**`POST /auth/register`**

### 请求体（`RegisterPayload`）

```json
{
  "username": "charles",
  "password": "hunter2!",
  "displayName": "杜晨"
}
```

### 响应 `201`：返回 `AuthSession`

注册成功**直接登录**（避免前端再发一次 login），返回与 `/auth/login` 同结构。

```json
{
  "token": "eyJhbGciOi...",
  "expiresAt": "2026-04-30 15:23:32",
  "user": {
    "id": 7,
    "username": "charles",
    "displayName": "杜晨",
    "avatarUrl": "",
    "createdAt": "2026-04-23 15:23:32",
    "updatedAt": "2026-04-23 15:23:32"
  }
}
```

### 错误

| 状态码 | error | 触发条件 |
|---|---|---|
| `400` | `username must be 3-30 chars of [A-Za-z0-9_.@-]` | 非法 |
| `400` | `password must be 6-30 chars` | 非法 |
| `400` | `displayName must be 1-30 chars` | 非法 |
| `400` | `avatarUrl must be a valid http(s) url or empty` | 非法 |
| `409` | `username already exists` | 账号重复（注意这是本模块唯一 `409`） |

### 示例

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"charles","password":"hunter2!","displayName":"杜晨"}'
```

---

## 2. 登录

**`POST /auth/login`**

### 请求体（`LoginPayload`）

```json
{ "username": "charles", "password": "hunter2!" }
```

### 响应 `200`：返回 `AuthSession`（结构同注册）

### 错误

| 状态码 | error | 触发条件 |
|---|---|---|
| `400` | `username must be 3-30 chars of [A-Za-z0-9_.@-]` | 格式非法（**不泄漏是否存在**） |
| `400` | `password must be 6-30 chars` | 同上 |
| `401` | `invalid username or password` | 账号不存在 **或** 密码错误（合并，防枚举） |

> 对应 Figma 里「账号密码错误！」红 toast —— 前端拿到 `401 invalid username or password` 直接显示即可。

### 示例

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"charles","password":"hunter2!"}'
```

---

## 3. 获取当前用户

**`GET /auth/me`**

### 请求头

```
Authorization: Bearer <token>
```

### 响应 `200`：返回 `User`

用途：
- 页面刷新时，前端拿 localStorage 里的 token 调 `/auth/me` 判断是否仍有效；
- 有效 → 静默进入登录态（对应「自动登录」）；
- 失败（`401`） → 清掉本地 token，回到未登录态。

### 错误

| 状态码 | error |
|---|---|
| `401` | `missing or invalid token` |
| `401` | `token expired` |

### 示例

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

## 4. 登出

**`POST /auth/logout`**

### 请求头

```
Authorization: Bearer <token>
```

### 响应 `204 No Content`（**无 body**）

- 幂等：即便 token 已过期或无效，也返回 `204`。前端调用后无条件清掉本地 token。
- 服务端当前**不维护黑名单**；如未来需要强制踢下线，再单独扩展。

### 示例

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer eyJhbGciOi..." -i
```

---

## 前端封装参考（axios）

基于项目里的 `http` 封装（见 [src/lib/api/client.ts](../src/lib/api/client.ts)，拦截器已把 `204 → null`、错误归一化为 `ApiError`）。

### token 注入

在 `api` 实例上再加一个请求拦截器即可（全局一次性配置）：

```ts
// src/lib/api/auth-token.ts
import { api } from "./client";

const KEY = "vc.token";

export const authToken = {
  get: () => localStorage.getItem(KEY),
  set: (t: string) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
};

api.interceptors.request.use((config) => {
  const t = authToken.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
```

### API 方法

```ts
export const authApi = {
  register: (payload: RegisterPayload) =>
    http.post<AuthSession>("/auth/register", payload),

  login: (payload: LoginPayload) =>
    http.post<AuthSession>("/auth/login", payload),

  me: () => http.get<User>("/auth/me"),

  logout: () => http.post<null>("/auth/logout", {}),
};
```

### TanStack Query 用法

```ts
// 自动登录（App 挂载时跑一次）
const meQuery = useQuery({
  queryKey: ["auth", "me"],
  queryFn: authApi.me,
  enabled: !!authToken.get(),  // 无 token 直接跳过
  retry: false,                // 401 不重试
  staleTime: Infinity,
});

// 登录 mutation
const loginMut = useMutation({
  mutationFn: authApi.login,
  onSuccess: (session) => {
    authToken.set(session.token);
    queryClient.setQueryData(["auth", "me"], session.user);
  },
});

// 登出
const logoutMut = useMutation({
  mutationFn: authApi.logout,
  onSettled: () => {
    authToken.clear();
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.invalidateQueries(); // 清掉其他需要登录的数据
  },
});
```

---

## 联调 checklist

- [ ] 注册成功后 `token` 能直接用于 `/auth/me`。
- [ ] 重复 `username` 注册返回 `409 username already exists`。
- [ ] 密码错误返回 `401 invalid username or password`（与账号不存在**同一个错误消息**）。
- [ ] `/auth/me` 在无 token / token 非法 / token 过期时均返回 `401`。
- [ ] `/auth/logout` 无论 token 状态均返回 `204`。
- [ ] 刷新页面后，存在有效 token 时能静默恢复登录态（自动登录）。
- [ ] 响应中**不包含** `password` / `passwordHash` 字段。
- [ ] 所有时间字段格式为 `"YYYY-MM-DD HH:mm:ss"`（UTC、空格分隔），前端用 `parseServerTime()` 解析。
