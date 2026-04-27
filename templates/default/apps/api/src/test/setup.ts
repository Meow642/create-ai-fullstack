import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-api-'));
process.env.DB_PATH = path.join(testDir, 'test.db');
