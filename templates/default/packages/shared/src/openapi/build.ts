import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import './paths';
import { registry } from './registry';

export function buildOpenApiDocument(): Record<string, unknown> {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'create-ai-fullstack API',
      version: '0.1.0',
    },
  }) as unknown as Record<string, unknown>;
}
