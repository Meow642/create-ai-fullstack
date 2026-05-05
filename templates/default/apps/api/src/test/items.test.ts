import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

const app = createApp();

describe('items API', () => {
  it('reports health', async () => {
    await request(app).get('/health').expect(200, { ok: true });
  });

  it('creates, lists, reads, updates, and deletes an item', async () => {
    const created = await request(app)
      .post('/items')
      .send({ title: 'First item' })
      .expect(201);

    expect(created.body).toMatchObject({ title: 'First item' });

    const list = await request(app).get('/items').query({ q: 'First' }).expect(200);
    expect(list.body.total).toBeGreaterThanOrEqual(1);
    expect(list.body.items[0].title).toBe('First item');

    const id = created.body.id;
    await request(app).get(`/items/${id}`).expect(200);

    const updated = await request(app)
      .patch(`/items/${id}`)
      .send({ title: 'Updated item' })
      .expect(200);
    expect(updated.body.title).toBe('Updated item');

    await request(app).delete(`/items/${id}`).expect(204);
    await request(app).get(`/items/${id}`).expect(404);
  });

  it('returns 400 for invalid payloads', async () => {
    const response = await request(app).post('/items').send({ title: '' }).expect(400);
    expect(response.body.error).toContain('title');
  });

  it('returns 400 for invalid list query params', async () => {
    const response = await request(app).get('/items').query({ limit: 0 }).expect(400);
    expect(response.body.error).toContain('limit');
  });

  it('returns 404 for unknown routes', async () => {
    await request(app).get('/missing-route').expect(404, { error: 'Not found' });
  });

  it('returns 500 for malformed JSON bodies', async () => {
    const response = await request(app)
      .post('/items')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(500);

    expect(response.body.error).toContain('JSON');
  });

  it('returns 404 when updating or deleting a missing item', async () => {
    await request(app).patch('/items/999999').send({ title: 'Missing item' }).expect(404);
    await request(app).delete('/items/999999').expect(404);
  });
});
