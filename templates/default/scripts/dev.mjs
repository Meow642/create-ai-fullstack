import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(rootDir, '..');
const isWindows = process.platform === 'win32';
const binExt = isWindows ? '.cmd' : '';

function binCommand(packageDir, name) {
  const command = path.join(workspaceRoot, packageDir, 'node_modules/.bin', `${name}${binExt}`);
  return isWindows ? `"${command}"` : command;
}

const processes = [
  {
    name: 'api',
    cwd: path.join(workspaceRoot, 'apps/api'),
    command: binCommand('apps/api', 'tsx'),
    args: ['watch', '--env-file-if-exists=.env', 'src/index.ts'],
  },
  {
    name: 'web',
    cwd: path.join(workspaceRoot, 'apps/web'),
    command: binCommand('apps/web', 'vite'),
    args: [],
  },
];

let stopping = false;
let remaining = processes.length;
const children = [];

console.log('Starting API and web dev servers...');
console.log('API docs: http://localhost:3000/docs');
console.log('Web app:  http://localhost:5173/items');
console.log('');

for (const processConfig of processes) {
  const child = spawn(processConfig.command, processConfig.args, {
    cwd: processConfig.cwd,
    stdio: 'inherit',
    shell: isWindows,
  });

  children.push(child);

  child.on('error', (error) => {
    if (!stopping) {
      console.error(`[${processConfig.name}] failed to start: ${error.message}`);
      stopAll(1);
    }
  });

  child.on('exit', (code, signal) => {
    remaining -= 1;
    if (stopping) {
      if (remaining === 0) process.exit(0);
      return;
    }

    if (code === 0 || signal === 'SIGINT') {
      if (remaining === 0) process.exit(0);
      return;
    }

    console.error(`[${processConfig.name}] exited with code ${code ?? signal}`);
    stopAll(typeof code === 'number' ? code : 1);
  });
}

process.on('SIGINT', () => {
  console.log('');
  console.log('Stopping dev servers...');
  stopAll(0);
});

process.on('SIGTERM', () => {
  stopAll(0);
});

function stopAll(exitCode) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.killed) child.kill('SIGINT');
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill('SIGTERM');
    }
    process.exit(exitCode);
  }, 1200).unref();
}
