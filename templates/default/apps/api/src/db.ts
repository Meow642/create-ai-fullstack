import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DB_PATH ?? './data.db';

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.join(process.cwd(), 'schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));
