export type SqliteValue = string | number | null;

export type SqliteRunResult = {
  changes: number;
  lastInsertRowid?: number;
};

export type SqliteConnection = {
  all<T extends Record<string, unknown>>(
    sql: string,
    params?: SqliteValue[],
  ): T[];
  get<T extends Record<string, unknown>>(
    sql: string,
    params?: SqliteValue[],
  ): T | undefined;
  run(sql: string, params?: SqliteValue[]): SqliteRunResult;
};

export type SqliteAdapter = {
  init(): Promise<void>;
  read<T>(operation: (db: SqliteConnection) => T | Promise<T>): Promise<T>;
  write<T>(operation: (db: SqliteConnection) => T | Promise<T>): Promise<T>;
};

export type SqliteAdapterOptions = {
  dbPath: string;
  schemaPath: string;
};
