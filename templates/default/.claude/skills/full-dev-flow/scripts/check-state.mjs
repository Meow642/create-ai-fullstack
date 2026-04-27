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

  console.log(`full-dev-flow state found: phase=${state.phase ?? 'unknown'} wave=${state.wave ?? 'unknown'}`);
  console.log(`last_activity=${state.last_activity ?? 'unknown'}`);
  console.log(`checkpoints=${formatCheckpointStatus(checkpoints) || 'none'}`);

  if (hasPendingCheckpoint) {
    console.log('A checkpoint is not approved. Ask the user whether to continue, restart, or abandon this flow.');
  } else {
    console.log('All checkpoints are approved. Start a new flow only if the user requests it.');
  }
} catch (error) {
  if (error && error.code === 'ENOENT') {
    console.log('No .dev/state.json found. Start full-dev-flow from Phase 1.');
    process.exit(0);
  }

  if (error instanceof SyntaxError) {
    console.error('Invalid .dev/state.json. Ask the user whether to repair, restart, or abandon this flow.');
    process.exit(1);
  }

  throw error;
}
