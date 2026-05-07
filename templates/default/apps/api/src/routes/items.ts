import { Router } from 'express';
import {
  CreateItemPayload,
  ItemDto,
  ItemIdParams,
  ListItemsQuery,
  UpdateItemPayload,
  itemApiExpressPaths,
  type ItemDto as Item,
} from '@workspace/shared';
import {
  createItem,
  deleteItem,
  getItem,
  listItemsPage,
  updateItem,
  type ItemRecord,
} from '../db';
import { validated } from '../middleware/validate';
import { broadcastItemCreated } from '../ws/notifications';

const router = Router();

function recordToItem(record: ItemRecord): Item {
  return ItemDto.parse(record);
}

router.get(
  itemApiExpressPaths.list,
  validated({ query: ListItemsQuery }, async (req, res) => {
    const { limit, offset, q } = req.query;
    const page = await listItemsPage({ limit, offset, q });
    const items = page.items.map(recordToItem);
    const total = page.total;
    res.json({ total, limit, offset, items });
  }),
);

router.post(
  itemApiExpressPaths.create,
  validated({ body: CreateItemPayload }, async (req, res) => {
    const item = recordToItem(await createItem(req.body.title));
    broadcastItemCreated(item);
    res.status(201).json(item);
  }),
);

router.get(
  itemApiExpressPaths.detail,
  validated({ params: ItemIdParams }, async (req, res) => {
    const item = await getItem(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(recordToItem(item));
  }),
);

router.patch(
  itemApiExpressPaths.update,
  validated({ params: ItemIdParams, body: UpdateItemPayload }, async (req, res) => {
    const item = await updateItem(req.params.id, { title: req.body.title });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(recordToItem(item));
  }),
);

router.delete(
  itemApiExpressPaths.delete,
  validated({ params: ItemIdParams }, async (req, res) => {
    if (!(await deleteItem(req.params.id))) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(204).end();
  }),
);

export default router;
