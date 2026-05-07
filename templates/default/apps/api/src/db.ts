import path from 'node:path';
import { createSqliteAdapter } from './db/driver';

export type ItemRecord = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const dbPath = path.resolve(process.cwd(), process.env.DB_PATH ?? './data.db');
const schemaPath = path.join(process.cwd(), 'schema.sql');
const sqlite = createSqliteAdapter({ dbPath, schemaPath });

export async function listItemsPage(options: {
  limit: number;
  offset: number;
  q?: string;
}): Promise<{ items: ItemRecord[]; total: number }> {
  return sqlite.read((db) => {
    const pattern = `%${options.q ?? ''}%`;
    const items = db.all<ItemRecord>(
      `
        SELECT id, title, createdAt, updatedAt
        FROM items
        WHERE title LIKE ?
        ORDER BY createdAt DESC, id DESC
        LIMIT ? OFFSET ?
      `,
      [pattern, options.limit, options.offset],
    );
    const total = db.get<{ total: number }>(
      `
        SELECT COUNT(*) as total
        FROM items
        WHERE title LIKE ?
      `,
      [pattern],
    )?.total ?? 0;

    return { items, total };
  });
}

export function getItem(id: number): Promise<ItemRecord | undefined> {
  return sqlite.read((db) =>
    db.get<ItemRecord>(
      'SELECT id, title, createdAt, updatedAt FROM items WHERE id = ?',
      [id],
    ),
  );
}

export async function createItem(title: string): Promise<ItemRecord> {
  return sqlite.write((db) => {
    const result = db.run('INSERT INTO items (title) VALUES (?)', [title]);
    const item = db.get<ItemRecord>(
      'SELECT id, title, createdAt, updatedAt FROM items WHERE id = ?',
      [result.lastInsertRowid ?? 0],
    );
    if (!item) {
      throw new Error('Created item was not found');
    }

    return item;
  });
}

export async function updateItem(
  id: number,
  patch: { title?: string },
): Promise<ItemRecord | undefined> {
  return sqlite.write((db) => {
    const result = db.run(
      `
        UPDATE items
        SET title = COALESCE(?, title),
            updatedAt = datetime('now')
        WHERE id = ?
      `,
      [patch.title ?? null, id],
    );
    if (result.changes === 0) {
      return undefined;
    }

    return db.get<ItemRecord>(
      'SELECT id, title, createdAt, updatedAt FROM items WHERE id = ?',
      [id],
    );
  });
}

export async function deleteItem(id: number): Promise<boolean> {
  return sqlite.write((db) => {
    const result = db.run('DELETE FROM items WHERE id = ?', [id]);
    return result.changes > 0;
  });
}
