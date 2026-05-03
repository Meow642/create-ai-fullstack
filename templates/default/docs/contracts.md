# 契约说明

本服务暴露以下机器可读 API 契约和交互文档：

- 版本化契约文件：`api-contracts/api/openapi.yaml`
- 运行时契约端点：`GET /openapi.yaml`
- 交互式文档页面：`GET /docs`

唯一事实源是 `packages/shared` 中的 Zod schema 和 API contract 常量。不要手写或手动修改 YAML。修改 shared schema 或 contract 常量后，运行 `pnpm gen:openapi` 重新生成契约文件。

## API 通用约定

- 开发环境 Base URL：`http://localhost:3000`。
- 内容类型：JSON 请求使用 `Content-Type: application/json`。
- 鉴权：模板默认未启用鉴权。引入鉴权后，在这里补充 `Authorization: Bearer <token>` 约定。
- CORS：API 服务已为浏览器客户端开启 CORS。
- 安全响应头：已启用 `helmet()`；为了让 Scalar `/docs` 正常渲染，默认关闭 CSP。

## 请求约定

- `GET` 和 `DELETE` 使用 path params 或 query string params，不发送请求体。
- `POST`、`PUT`、`PATCH` 使用 JSON 请求体。如果接口需要空对象，请发送 `{}`。
- Query params 由 shared Zod schema 解析，通常使用 `z.coerce` 处理字符串到数字等类型转换。
- API 路由校验必须使用 `validate({ body?, query?, params? })`，不要在 route 中分散编写 `if (!req.body.x)` 这类手动校验。

## 响应约定

- 成功状态码：
  - `200 OK`：读取或更新成功，返回资源或列表。
  - `201 Created`：创建成功，返回新资源。
  - `204 No Content`：删除成功，不返回响应体。
- 所有 4xx/5xx 错误响应使用统一结构：

```json
{ "error": "面向用户或调用方展示的错误信息" }
```

- 列表响应使用统一分页结构：

```ts
type Paginated<T> = {
  total: number;
  limit: number;
  offset: number;
  items: T[];
};
```

## 时间字段

服务端时间字段（例如 `createdAt`、`updatedAt`）使用 SQLite `datetime('now')` 生成的 UTC 字符串：

```text
YYYY-MM-DD HH:mm:ss
```

这些字段不是 ISO 8601 格式。前端代码应使用 `parseServerTime()` 解析。

## 文档来源

- DTO 和字段说明写在 `packages/shared/src/<module>/schema.ts`。
- 接口 summary、description、tag、method、path、request schema、response schema、status code 写在 `packages/shared/src/<module>/contracts.ts`。
- `GET /docs`、`GET /openapi.yaml` 和 `api-contracts/api/openapi.yaml` 都从同一份 shared contract 生成。

## 版本策略

API 版本使用 `v<major>.<minor>.<patch>`。

- Patch：兼容性修复和仅文档变更。
- Minor：向后兼容的接口、字段或行为新增。
- Major：不兼容的 response、request、path 或 status code 变更。

## 消费方登记

依赖本 API 的消费方登记在 `api-contracts/api/consumer.json`。新增 app、service、job 或外部集成时，同步更新该文件。

## 合并前验证

合并契约相关变更前，运行以下命令：

```bash
pnpm gen:openapi
pnpm validate:openapi
pnpm verify:contracts
```
