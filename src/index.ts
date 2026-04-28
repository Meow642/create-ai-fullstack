import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cac from 'cac';
import { runPostScaffold } from './post.js';
import { resolveScaffoldOptions } from './prompts.js';
import { scaffoldProject } from './scaffold.js';
import { detectPnpm } from './utils/detect-pnpm.js';
import { logger } from './utils/logger.js';

type PackageJson = {
  version: string;
};

const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
const packageVersion = (JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson).version;

const cli = cac('create-ai-fullstack');

cli
  .command('[dir]', 'Create an AI-friendly fullstack monorepo')
  .option('--no-install', 'Skip pnpm install')
  .option('--no-git', 'Skip git initialization')
  .action(async (dir: string | undefined) => {
    try {
      await detectPnpm();
      const options = await resolveScaffoldOptions(dir, {
        install: process.argv.includes('--no-install') ? false : undefined,
        git: process.argv.includes('--no-git') ? false : undefined,
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
