import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cac from 'cac';
import { runPostScaffold } from './post.js';
import { resolveScaffoldOptions } from './prompts.js';
import { scaffoldProject } from './scaffold.js';
import { type DatabaseDriver } from './types.js';
import { detectPnpm } from './utils/detect-pnpm.js';
import { logger } from './utils/logger.js';

type PackageJson = {
  version: string;
};

const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
const packageVersion = (JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson).version;
const databaseDrivers = new Set<DatabaseDriver>(['better-sqlite3', 'sql-js']);

function parseDatabaseDriver(value: unknown): DatabaseDriver | undefined {
  if (value === undefined) return undefined;
  if (value === 'sql.js') return 'sql-js';
  if (databaseDrivers.has(value as DatabaseDriver)) return value as DatabaseDriver;
  throw new Error('Invalid --db value. Use "better-sqlite3" or "sql-js".');
}

const cli = cac('create-ai-fullstack');

cli
  .command('[dir]', 'Create an AI-friendly fullstack monorepo')
  .option('--no-install', 'Skip pnpm install')
  .option('--no-git', 'Skip git initialization')
  .option('--db <driver>', 'Database driver: better-sqlite3 or sql-js')
  .action(async (dir: string | undefined, flags: { db?: string }) => {
    try {
      await detectPnpm();
      const options = await resolveScaffoldOptions(dir, {
        install: process.argv.includes('--no-install') ? false : undefined,
        git: process.argv.includes('--no-git') ? false : undefined,
        databaseDriver: parseDatabaseDriver(flags.db),
      });
      await scaffoldProject(options);
      await runPostScaffold(options);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

cli.help();
cli.version(packageVersion);
cli.parse();
