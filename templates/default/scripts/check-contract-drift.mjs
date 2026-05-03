import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const contractPath = 'api-contracts/api/openapi.yaml';

if (!existsSync('.git')) {
  console.log('Skipping contract drift check because this directory is not a git repository.');
  process.exit(0);
}

const result = spawnSync('git', ['diff', '--exit-code', '--', contractPath], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
