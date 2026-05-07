import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {
  type SqliteAdapter,
  type SqliteAdapterOptions,
  type SqliteConnection,
  type SqliteValue,
} from '../adapter';

type BetterSqliteDatabase = ReturnType<typeof Database>;

export function createSqliteAdapter(options: SqliteAdapterOptions): SqliteAdapter {
  let db: BetterSqliteDatabase | undefined;

  function open() {
    if (db) return db;

    fs.mkdirSync(path.dirname(options.dbPath), { recursive: true });
    db = new Database(options.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(fs.readFileSync(options.schemaPath, 'utf8'));
    return db;
  }

  function createConnection(database: BetterSqliteDatabase): SqliteConnection {
    return {
      all<T extends Record<string, unknown>>(
        sql: string,
        params: SqliteValue[] = [],
      ) {
        return database.prepare(sql).all(...params) as T[];
      },
      get<T extends Record<string, unknown>>(
        sql: string,
        params: SqliteValue[] = [],
      ) {
        return database.prepare(sql).get(...params) as T | undefined;
      },
      run(sql: string, params: SqliteValue[] = []) {
        const result = database.prepare(sql).run(...params);
        return {
          changes: result.changes,
          lastInsertRowid: Number(result.lastInsertRowid),
        };
      },
    };
  }

  return {
    async init() {
      open();
    },
    async read(operation) {
      return operation(createConnection(open()));
    },
    async write(operation) {
      return operation(createConnection(open()));
    },
  };
}
