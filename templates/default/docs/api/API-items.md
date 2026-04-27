# API-items.md

Items demo API。单一事实源是 `packages/shared/src/items/schema.ts`。

## 接口列表

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/items` | 查询 item 列表，支持 `limit`、`offset` 和可选搜索参数 `q`。 |
| POST | `/items` | 创建 item。 |
| GET | `/items/:id` | 查询单个 item。 |
| PATCH | `/items/:id` | 更新单个 item。 |
| DELETE | `/items/:id` | 删除单个 item。 |

## WebSocket

连接 `/ws/notifications`。当 item 创建成功后，服务端会广播：

```json
{
  "type": "item.created",
  "data": {
    "id": 1,
    "title": "Example",
    "createdAt": "2026-04-27 00:00:00",
    "updatedAt": "2026-04-27 00:00:00"
  }
}
```
