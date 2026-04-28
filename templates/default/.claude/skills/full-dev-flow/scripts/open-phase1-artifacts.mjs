import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const rootDir = process.cwd();
const devDir = path.join(rootDir, '.dev');
const planPath = path.join(devDir, 'plan.md');
const flowPath = path.join(devDir, 'flow.mmd');
const previewPath = path.join(devDir, 'flow-preview.html');
const mermaidScriptPath = path.join(rootDir, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
const noOpen = process.env.FULL_DEV_FLOW_NO_OPEN === '1';

await assertFile(planPath, '缺少 .dev/plan.md。请先完成阶段 1 的计划文件。');
await assertFile(flowPath, '缺少 .dev/flow.mmd。请先完成阶段 1 的 Mermaid 流程图。');

const flowSource = await readFile(flowPath, 'utf8');
await mkdir(devDir, { recursive: true });
await writeFile(previewPath, buildPreviewHtml(flowSource), 'utf8');

const hasMermaid = await fileExists(mermaidScriptPath);
if (!hasMermaid) {
  console.warn('未找到 node_modules/mermaid/dist/mermaid.min.js。请先运行 pnpm install，浏览器预览才会渲染 Mermaid 图。');
}

console.log(`已生成 Mermaid 预览：${previewPath}`);

if (noOpen) {
  console.log('FULL_DEV_FLOW_NO_OPEN=1，已跳过自动打开编辑器和浏览器。');
  process.exit(0);
}

if (!hasMermaid) {
  process.exit(1);
}

openPlan(planPath);
openPreview(previewPath);

function buildPreviewHtml(source) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>full-dev-flow Mermaid 预览</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      color: #172033;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 22px;
    }
    .panel {
      padding: 20px;
      border: 1px solid #d7deea;
      border-radius: 8px;
      background: #ffffff;
      overflow-x: auto;
    }
    .hint {
      margin: 0 0 20px;
      color: #526070;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <main>
    <h1>full-dev-flow Mermaid 预览</h1>
    <p class="hint">来源：.dev/flow.mmd。若图未显示，请确认已运行 pnpm install。</p>
    <section class="panel">
      <pre class="mermaid">${escapeHtml(source)}</pre>
    </section>
  </main>
  <script src="../node_modules/mermaid/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, securityLevel: 'strict', theme: 'default' });
  </script>
</body>
</html>
`;
}

function openPlan(filePath) {
  const customEditor = process.env.FULL_DEV_FLOW_EDITOR;
  if (customEditor) {
    spawnShell(`${customEditor} ${quoteShell(filePath)}`);
    return;
  }

  if (process.platform === 'darwin') {
    spawnDetached('open', ['-t', filePath]);
    return;
  }

  if (process.platform === 'win32') {
    spawnDetached('notepad.exe', [filePath]);
    return;
  }

  const linuxEditor = process.env.VISUAL || process.env.EDITOR;
  if (linuxEditor) {
    spawnShell(`${linuxEditor} ${quoteShell(filePath)}`);
    return;
  }

  spawnDetached('xdg-open', [filePath]);
}

function openPreview(filePath) {
  const customBrowser = process.env.FULL_DEV_FLOW_BROWSER;
  if (customBrowser) {
    spawnShell(`${customBrowser} ${quoteShell(filePath)}`);
    return;
  }

  if (process.platform === 'darwin') {
    spawnDetached('open', [filePath]);
    return;
  }

  if (process.platform === 'win32') {
    spawnDetached('cmd', ['/c', 'start', '', filePath]);
    return;
  }

  spawnDetached('xdg-open', [filePath]);
}

function spawnShell(command) {
  const child = spawn(command, {
    detached: true,
    shell: true,
    stdio: 'ignore',
  });
  child.on('error', (error) => {
    console.warn(`无法打开命令：${command}`);
    console.warn(error.message);
  });
  child.unref();
}

function spawnDetached(command, args) {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', (error) => {
    console.warn(`无法打开命令：${command} ${args.join(' ')}`);
    console.warn(error.message);
  });
  child.unref();
}

function quoteShell(value) {
  if (process.platform === 'win32') {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function assertFile(filePath, message) {
  if (await fileExists(filePath)) return;
  console.error(message);
  process.exit(1);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
