import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import test from 'node:test';
import { URL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('CLI version matches package version', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const cliSource = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(cliSource, /cli\.version\(['"`][^'"`]+['"`]\)/);

  const { stdout } = await execFileAsync(
    process.execPath,
    ['--import', 'tsx', 'src/index.ts', '--version'],
    {
      cwd: new URL('..', import.meta.url),
    },
  );

  assert.equal(stdout.trim().startsWith(`create-ai-fullstack/${packageJson.version} `), true);
});
