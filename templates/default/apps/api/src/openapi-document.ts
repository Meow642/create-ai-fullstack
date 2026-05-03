import { stringify } from 'yaml';
import { buildOpenApiDocument } from '@workspace/shared';

export function buildOpenApiYaml() {
  return stringify(buildOpenApiDocument(), { lineWidth: 0 });
}
