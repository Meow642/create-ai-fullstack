import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function shouldUseShellForPnpm(platform: NodeJS.Platform = process.platform) {
  return platform === 'win32';
}

export async function detectPnpm() {
  try {
    const { stdout } = await execFileAsync('pnpm', ['--version'], {
      shell: shouldUseShellForPnpm(),
    });
    return stdout.trim();
  } catch {
    throw new Error(
      'pnpm is required. Enable it with `corepack enable`, then rerun this command.',
    );
  }
}
