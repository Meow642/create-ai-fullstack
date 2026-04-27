# API-items.md

Items demo API. The source of truth is `packages/shared/src/items/schema.ts`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/items` | List items with `limit`, `offset`, and optional `q` search. |
| POST | `/items` | Create an item. |
| GET | `/items/:id` | Get one item. |
| PATCH | `/items/:id` | Update one item. |
| DELETE | `/items/:id` | Delete one item. |

## WebSocket

Connect to `/ws/notifications`. On item creation the server broadcasts:

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
