import { rename } from 'node:fs/promises';
import path from 'node:path';

const placeholderNames = new Map([
  ['_gitignore', '.gitignore'],
  ['_npmrc', '.npmrc'],
  ['_env.example', '.env.example'],
  ['_prettierrc', '.prettierrc'],
]);

export async function renamePlaceholderFile(filePath: string) {
  const basename = path.basename(filePath);
  const replacement = placeholderNames.get(basename);
  if (!replacement) return;
  await rename(filePath, path.join(path.dirname(filePath), replacement));
}
