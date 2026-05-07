import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, {
  type Database as SqlDatabase,
  type SqlJsStatic,
} from 'sql.js';
import {
  type SqliteAdapter,
  type SqliteAdapterOptions,
  type SqliteConnection,
  type SqliteValue,
} from '../adapter';

const lockRetryMs = 10;
const lockTimeoutMs = 5_000;
const staleLockMs = 30_000;

// sql.js 驱动假设单进程访问：内存中持有唯一的 Database 实例，写入时整库 dump 到磁盘。
// 多进程同时写同一个文件会互相覆盖；如需多进程，请改用 better-sqlite3。
export function createSqliteAdapter(options: SqliteAdapterOptions): SqliteAdapter {
  const lockPath = `${options.dbPath}.lock`;
  let sqlPromise: Promise<SqlJsStatic> | undefined;
  let dbPromise: Promise<SqlDatabase> | undefined;
  let writeQueue: Promise<unknown> = Promise.resolve();

  function getSql() {
    if (!sqlPromise) {
      sqlPromise = initSqlJs();
    }
    return sqlPromise;
  }

  function getDb() {
    if (!dbPromise) {
      dbPromise = openDb();
    }
    return dbPromise;
  }

  async function openDb() {
    const SQL = await getSql();
    fs.mkdirSync(path.dirname(options.dbPath), { recursive: true });
    const dbExists = fs.existsSync(options.dbPath);
    const db = dbExists
      ? new SQL.Database(new Uint8Array(fs.readFileSync(options.dbPath)))
      : new SQL.Database();

    db.run(fs.readFileSync(options.schemaPath, 'utf8'));
    if (!dbExists) {
      persist(db);
    }
    return db;
  }

  function persist(db: SqlDatabase) {
    const data = db.export();
    const tmpPath = `${options.dbPath}.${process.pid}.${Date.now()}.tmp`;

    try {
      fs.writeFileSync(tmpPath, Buffer.from(data));
      fs.renameSync(tmpPath, options.dbPath);
    } catch (error) {
      try {
        fs.unlinkSync(tmpPath);
      } catch (cleanupError) {
        if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw cleanupError;
        }
      }
      throw error;
    }
  }

  async function enqueueWrite<T>(operation: () => Promise<T>) {
    const result = writeQueue.then(operation, operation);
    writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function withFileLock<T>(operation: () => Promise<T>) {
    const release = await acquireLock();
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async function acquireLock() {
    fs.mkdirSync(path.dirname(options.dbPath), { recursive: true });
    const startedAt = Date.now();

    while (true) {
      try {
        const fd = fs.openSync(lockPath, 'wx');
        fs.writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`);
        return () => {
          fs.closeSync(fd);
          try {
            fs.unlinkSync(lockPath);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              throw error;
            }
          }
        };
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'EEXIST') {
          throw error;
        }

        removeStaleLock();
        if (Date.now() - startedAt > lockTimeoutMs) {
          throw new Error(`Timed out waiting for database lock at ${lockPath}`, {
            cause: error,
          });
        }
        await sleep(lockRetryMs);
      }
    }
  }

  function removeStaleLock() {
    try {
      const stats = fs.statSync(lockPath);
      if (Date.now() - stats.mtimeMs > staleLockMs) {
        fs.unlinkSync(lockPath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  function createConnection(db: SqlDatabase): SqliteConnection {
    return {
      all<T extends Record<string, unknown>>(
        sql: string,
        params: SqliteValue[] = [],
      ) {
        return allFromDb<T>(db, sql, params);
      },
      get<T extends Record<string, unknown>>(
        sql: string,
        params: SqliteValue[] = [],
      ) {
        return allFromDb<T>(db, sql, params)[0];
      },
      run(sql: string, params: SqliteValue[] = []) {
        db.run(sql, params);
        const changes = allFromDb<{ changes: number }>(
          db,
          'SELECT changes() as changes',
        )[0]?.changes ?? 0;
        const lastInsertRowid = allFromDb<{ id: number }>(
          db,
          'SELECT last_insert_rowid() as id',
        )[0]?.id;
        return { changes, lastInsertRowid };
      },
    };
  }

  function allFromDb<T extends Record<string, unknown>>(
    db: SqlDatabase,
    sql: string,
    params: SqliteValue[] = [],
  ) {
    const statement = db.prepare(sql);

    try {
      statement.bind(params);
      const rows: T[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }
      return rows;
    } finally {
      statement.free();
    }
  }

  return {
    async init() {
      await getDb();
    },
    async read(operation) {
      const db = await getDb();
      return operation(createConnection(db));
    },
    async write(operation) {
      return enqueueWrite(() =>
        withFileLock(async () => {
          const db = await getDb();
          const result = await operation(createConnection(db));
          persist(db);
          return result;
        }),
      );
    },
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
