import { readdir } from 'node:fs/promises';
import path from 'node:path';

const npmNamePattern =
  /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;

export function getDefaultProjectName(targetDir?: string) {
  if (!targetDir || targetDir === '.') return 'my-ai-app';
  return path.basename(path.resolve(targetDir));
}

export function validateProjectName(name: string) {
  if (!name.trim()) return 'Project name is required.';
  if (name.length > 214) return 'Project name must be 214 characters or fewer.';
  if (name.startsWith('.') || name.startsWith('_')) {
    return 'Project name cannot start with "." or "_".';
  }
  if (!npmNamePattern.test(name)) {
    return 'Project name must be a valid npm package name.';
  }
  return undefined;
}

export async function assertTargetDirectoryAvailable(targetDir: string) {
  try {
    const entries = await readdir(targetDir);
    const visibleEntries = entries.filter((entry) => entry !== '.DS_Store');
    if (visibleEntries.length > 0) {
      throw new Error(`Target directory is not empty: ${targetDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}
