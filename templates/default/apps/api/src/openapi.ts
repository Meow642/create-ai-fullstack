import fs from 'node:fs/promises';
import path from 'node:path';
import { buildOpenApiDocument } from '@workspace/shared';

const outputPath = path.resolve(process.cwd(), '../../docs/openapi.json');

async function main() {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
