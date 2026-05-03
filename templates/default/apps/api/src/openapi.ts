import fs from 'node:fs/promises';
import path from 'node:path';
import { buildOpenApiYaml } from './openapi-document';

const outputPath = path.resolve(process.cwd(), '../../api-contracts/api/openapi.yaml');

async function main() {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buildOpenApiYaml());
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
