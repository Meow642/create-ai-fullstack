import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { isOpenApiAddressAllowed } from '../middleware/openapi-access';

const app = createApp();

describe('OpenAPI endpoint', () => {
  it('serves generated OpenAPI YAML to localhost', async () => {
    const response = await request(app).get('/openapi.yaml').expect(200);

    expect(response.type).toBe('text/yaml');
    expect(response.text).toContain('openapi: 3.1.0');
    expect(response.text).toContain('/items:');
    expect(response.text).toContain('/items/{id}:');
  });

  it('rejects requests from addresses outside the allowlist', async () => {
    const response = await request(app)
      .get('/openapi.yaml')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(403);

    expect(response.body).toEqual({
      error: 'OpenAPI endpoint is not available from this address',
    });
  });

  it('allows configured IPv4 CIDR ranges', () => {
    expect(isOpenApiAddressAllowed('10.42.1.5', '10.42.0.0/16')).toBe(true);
    expect(isOpenApiAddressAllowed('10.43.1.5', '10.42.0.0/16')).toBe(false);
  });

  it('handles localhost aliases, exact allowlist entries, and invalid ranges', () => {
    expect(isOpenApiAddressAllowed('::ffff:127.0.0.1')).toBe(true);
    expect(isOpenApiAddressAllowed('10.42.1.5', '10.42.1.5')).toBe(true);
    expect(isOpenApiAddressAllowed('10.42.1.5', '10.42.1.6')).toBe(false);
    expect(isOpenApiAddressAllowed('10.42.1.5', '10.42.0.0/not-a-number')).toBe(false);
    expect(isOpenApiAddressAllowed('10.42.1.5', '10.42.0.0/33')).toBe(false);
    expect(isOpenApiAddressAllowed('not-an-ip', '0.0.0.0/0')).toBe(false);
    expect(isOpenApiAddressAllowed(undefined, '0.0.0.0/0')).toBe(false);
    expect(isOpenApiAddressAllowed('203.0.113.10', '0.0.0.0/0')).toBe(true);
  });
});
