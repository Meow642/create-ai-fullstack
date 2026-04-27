import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ScaffoldOptions } from './types.js';
import { assertTargetDirectoryAvailable } from './utils/project-name.js';
import { renamePlaceholderFile } from './utils/rename.js';

const templateDir = fileURLToPath(new URL('../templates/default', import.meta.url));

const replacementFiles = [
  'package.json',
  'AGENTS.md',
  'apps/web/index.html',
  'README.md',
];

export async function scaffoldProject(options: ScaffoldOptions) {
  await assertTargetDirectoryAvailable(options.targetDir);
  await mkdir(options.targetDir, { recursive: true });
  await cp(templateDir, options.targetDir, { recursive: true });
  await renamePlaceholders(options.targetDir);
  await replaceProjectName(options);
  await writeGitAttributes(options.targetDir);
}

async function renamePlaceholders(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await renamePlaceholders(entryPath);
    } else {
      await renamePlaceholderFile(entryPath);
    }
  }
}

async function replaceProjectName(options: ScaffoldOptions) {
  for (const relativePath of replacementFiles) {
    const filePath = path.join(options.targetDir, relativePath);
    const content = await readFile(filePath, 'utf8');
    await writeFile(filePath, content.replaceAll('{{PROJECT_NAME}}', options.projectName));
  }
}

async function writeGitAttributes(targetDir: string) {
  await writeFile(path.join(targetDir, '.gitattributes'), '* text=auto\n');
}
