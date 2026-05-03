import { Router } from 'express';
import {
  CreateItemPayload,
  ItemDto,
  ItemIdParams,
  ListItemsQuery,
  UpdateItemPayload,
  itemApiExpressPaths,
  type ItemDto as Item,
  type ListItemsQuery as ListQuery,
} from '@workspace/shared';
import { db } from '../db';
import { validate } from '../middleware/validate';
import { broadcastItemCreated } from '../ws/notifications';

type ItemRow = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const router = Router();

const listItems = db.prepare(`
  SELECT id, title, createdAt, updatedAt
  FROM items
  WHERE title LIKE ?
  ORDER BY createdAt DESC, id DESC
  LIMIT ? OFFSET ?
`);

const countItems = db.prepare(`
  SELECT COUNT(*) as total
  FROM items
  WHERE title LIKE ?
`);

const getItem = db.prepare('SELECT id, title, createdAt, updatedAt FROM items WHERE id = ?');
const insertItem = db.prepare('INSERT INTO items (title) VALUES (?)');
const updateItem = db.prepare(`
  UPDATE items
  SET title = COALESCE(?, title),
      updatedAt = datetime('now')
  WHERE id = ?
`);
const deleteItem = db.prepare('DELETE FROM items WHERE id = ?');

function rowToItem(row: ItemRow): Item {
  return ItemDto.parse(row);
}

router.get(itemApiExpressPaths.list, validate({ query: ListItemsQuery }), (req, res) => {
  const { limit, offset, q } = ListItemsQuery.parse(req.query) as ListQuery;
  const pattern = `%${q ?? ''}%`;
  const items = (listItems.all(pattern, limit, offset) as ItemRow[]).map(rowToItem);
  const total = (countItems.get(pattern) as { total: number }).total;
  res.json({ total, limit, offset, items });
});

router.post(itemApiExpressPaths.create, validate({ body: CreateItemPayload }), (req, res) => {
  const payload = req.body as { title: string };
  const result = insertItem.run(payload.title);
  const item = rowToItem(getItem.get(result.lastInsertRowid) as ItemRow);
  broadcastItemCreated(item);
  res.status(201).json(item);
});

router.get(itemApiExpressPaths.detail, validate({ params: ItemIdParams }), (req, res) => {
  const row = getItem.get(req.params.id) as ItemRow | undefined;
  if (!row) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json(rowToItem(row));
});

router.patch(
  itemApiExpressPaths.update,
  validate({ params: ItemIdParams, body: UpdateItemPayload }),
  (req, res) => {
    const existing = getItem.get(req.params.id) as ItemRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const payload = req.body as { title?: string };
    updateItem.run(payload.title ?? null, req.params.id);
    res.json(rowToItem(getItem.get(req.params.id) as ItemRow));
  },
);

router.delete(itemApiExpressPaths.delete, validate({ params: ItemIdParams }), (req, res) => {
  const result = deleteItem.run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.status(204).end();
});

export default router;
