export type DatabaseDriver = 'better-sqlite3' | 'sql-js';

export interface CliFlags {
  install?: boolean;
  git?: boolean;
  databaseDriver?: DatabaseDriver;
}

export interface ScaffoldOptions {
  projectName: string;
  targetDir: string;
  install: boolean;
  git: boolean;
  databaseDriver: DatabaseDriver;
}
