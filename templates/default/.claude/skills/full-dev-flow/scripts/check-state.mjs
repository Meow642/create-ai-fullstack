import { readFile } from 'node:fs/promises';
import path from 'node:path';

const statePath = path.join(process.cwd(), '.dev', 'state.json');

function formatCheckpointStatus(checkpoints) {
  return Object.entries(checkpoints ?? {})
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}

try {
  const raw = await readFile(statePath, 'utf8');
  const state = JSON.parse(raw);
  const checkpoints = state.checkpoints ?? {};
  const hasPendingCheckpoint = Object.values(checkpoints).some((value) => value !== 'approved');

  console.log(`发现 full-dev-flow 状态：phase=${state.phase ?? 'unknown'} wave=${state.wave ?? 'unknown'}`);
  console.log(`last_activity=${state.last_activity ?? 'unknown'}`);
  console.log(`checkpoints=${formatCheckpointStatus(checkpoints) || '无'}`);

  if (hasPendingCheckpoint) {
    console.log('存在尚未批准的 checkpoint。请先询问用户要继续、重开还是放弃当前流程。');
  } else {
    console.log('所有 checkpoint 都已批准。只有在用户明确要求时才开始新流程。');
  }
} catch (error) {
  if (error && error.code === 'ENOENT') {
    console.log('未发现 .dev/state.json。请从阶段 1 开始 full-dev-flow。');
    process.exit(0);
  }

  if (error instanceof SyntaxError) {
    console.error('.dev/state.json 格式无效。请询问用户要修复、重开还是放弃当前流程。');
    process.exit(1);
  }

  throw error;
}
