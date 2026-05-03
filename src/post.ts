import { spawn } from 'node:child_process';
import { type ScaffoldOptions } from './types.js';
import { shouldUseShellForPnpm } from './utils/detect-pnpm.js';
import { logger } from './utils/logger.js';

export async function runPostScaffold(options: ScaffoldOptions) {
  if (options.git) {
    await run('git', ['init'], options.targetDir);
    await run('git', ['add', '-A'], options.targetDir);
    await run('git', ['commit', '-m', 'initial commit'], options.targetDir);
  }

  if (options.install) {
    await run('pnpm', ['install'], options.targetDir);
  }

  logger.success('Project created.');
  console.log('');
  console.log(`Next steps:`);
  console.log(`  cd ${options.targetDir}`);
  if (!options.install) console.log('  pnpm install');
  console.log('  pnpm dev');
  console.log('');
  console.log('Open http://localhost:5173/items, http://localhost:3000/docs, and http://localhost:3000/openapi.yaml');
}

function run(command: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: command === 'pnpm' && shouldUseShellForPnpm(),
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
      }
    });
  });
}
