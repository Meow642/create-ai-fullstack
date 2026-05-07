import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type DatabaseDriver, type ScaffoldOptions } from './types.js';
import { assertTargetDirectoryAvailable } from './utils/project-name.js';
import { renamePlaceholderFile } from './utils/rename.js';

const templateDir = fileURLToPath(new URL('../templates/default', import.meta.url));

const ignoredTemplateDirectories = new Set([
  'node_modules',
  '.pnpm-store',
  'dist',
  'coverage',
]);

const replacementFiles = [
  'package.json',
  'AGENTS.md',
  'apps/web/index.html',
  'README.md',
];

const unusedDatabaseDriverFiles: Record<DatabaseDriver, string[]> = {
  'better-sqlite3': ['apps/api/src/db/drivers/sql-js.ts'],
  'sql-js': ['apps/api/src/db/drivers/better-sqlite3.ts'],
};

const databaseDriverDocs: Record<DatabaseDriver, Record<string, string>> = {
  'better-sqlite3': {
    DATABASE_DRIVER_NAME: 'better-sqlite3',
    DATABASE_DRIVER_DESCRIPTION:
      '本地 SQLite 数据库，速度更快，适合服务端部署，但安装时需要原生依赖构建或可用的预编译包。',
    DATABASE_DRIVER_NOTE:
      '速度更快，适合服务端部署；Windows 安装失败时可重新生成并选择 sql.js',
  },
  'sql-js': {
    DATABASE_DRIVER_NAME: 'sql.js',
    DATABASE_DRIVER_DESCRIPTION:
      'WASM SQLite 数据库，无需本机 C++ 编译环境，适合 Windows 与本地 demo。',
    DATABASE_DRIVER_NOTE:
      '安装时不依赖 node-gyp、Visual Studio Build Tools 或 GitHub Release 预编译包',
  },
};

export async function scaffoldProject(options: ScaffoldOptions) {
  await assertTargetDirectoryAvailable(options.targetDir);
  await mkdir(options.targetDir, { recursive: true });
  await cp(templateDir, options.targetDir, {
    recursive: true,
    filter: shouldCopyTemplateEntry,
  });
  await renamePlaceholders(options.targetDir);
  await replaceProjectName(options);
  await applyDatabaseDriver(options);
  await writeGitAttributes(options.targetDir);
}

function shouldCopyTemplateEntry(sourcePath: string) {
  const relativePath = path.relative(templateDir, sourcePath);
  if (!relativePath) return true;

  return !relativePath
    .split(path.sep)
    .some((segment) => ignoredTemplateDirectories.has(segment));
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

async function applyDatabaseDriver(options: ScaffoldOptions) {
  await writeDatabaseDriverIndex(options);
  await replaceDatabaseDriverDocs(options);
  await updateApiPackageJson(options);
  await updateRootPackageJson(options);
  await removeUnusedDatabaseDriverFiles(options);
}

async function writeDatabaseDriverIndex(options: ScaffoldOptions) {
  const filePath = path.join(options.targetDir, 'apps/api/src/db/driver.ts');
  await writeFile(
    filePath,
    `export { createSqliteAdapter } from './drivers/${options.databaseDriver}';\n`,
  );
}

async function replaceDatabaseDriverDocs(options: ScaffoldOptions) {
  const docsFiles = ['AGENTS.md', 'README.md', 'apps/api/AGENTS.md'];
  const replacements = databaseDriverDocs[options.databaseDriver];

  for (const relativePath of docsFiles) {
    const filePath = path.join(options.targetDir, relativePath);
    let content = await readFile(filePath, 'utf8');
    for (const [name, value] of Object.entries(replacements)) {
      content = content.replaceAll(`{{${name}}}`, value);
    }
    await writeFile(filePath, content);
  }
}

async function updateApiPackageJson(options: ScaffoldOptions) {
  const filePath = path.join(options.targetDir, 'apps/api/package.json');
  const packageJson = JSON.parse(await readFile(filePath, 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  delete packageJson.dependencies['better-sqlite3'];
  delete packageJson.dependencies['sql.js'];
  delete packageJson.devDependencies['@types/better-sqlite3'];
  delete packageJson.devDependencies['@types/sql.js'];

  if (options.databaseDriver === 'better-sqlite3') {
    packageJson.dependencies['better-sqlite3'] = '^12.9.0';
    packageJson.devDependencies['@types/better-sqlite3'] = '^7.6.13';
  } else {
    packageJson.dependencies['sql.js'] = '^1.13.0';
    packageJson.devDependencies['@types/sql.js'] = '^1.4.11';
  }

  await writeFile(filePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function updateRootPackageJson(options: ScaffoldOptions) {
  const filePath = path.join(options.targetDir, 'package.json');
  const packageJson = JSON.parse(await readFile(filePath, 'utf8')) as {
    pnpm?: {
      onlyBuiltDependencies?: string[];
      allowedDeprecatedVersions?: Record<string, string>;
    };
  };
  const pnpm = packageJson.pnpm ?? {};
  packageJson.pnpm = pnpm;

  const onlyBuiltDependencies = new Set(pnpm.onlyBuiltDependencies ?? []);
  if (options.databaseDriver === 'better-sqlite3') {
    onlyBuiltDependencies.add('better-sqlite3');
    pnpm.allowedDeprecatedVersions = {
      ...(pnpm.allowedDeprecatedVersions ?? {}),
      'prebuild-install': '7.1.3',
    };
  } else {
    onlyBuiltDependencies.delete('better-sqlite3');
    if (pnpm.allowedDeprecatedVersions) {
      delete pnpm.allowedDeprecatedVersions['prebuild-install'];
    }
  }

  pnpm.onlyBuiltDependencies = [...onlyBuiltDependencies].sort();
  await writeFile(filePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function removeUnusedDatabaseDriverFiles(options: ScaffoldOptions) {
  for (const relativePath of unusedDatabaseDriverFiles[options.databaseDriver]) {
    await rm(path.join(options.targetDir, relativePath), { force: true });
  }
}

async function writeGitAttributes(targetDir: string) {
  await writeFile(path.join(targetDir, '.gitattributes'), '* text=auto\n');
}
