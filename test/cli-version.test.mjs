import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

test('CLI version matches package version', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const cliSource = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8');

  assert.match(cliSource, new RegExp(`cli\\.version\\('${packageJson.version}'\\)`));
});
