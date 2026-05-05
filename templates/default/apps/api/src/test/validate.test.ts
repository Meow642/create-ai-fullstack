import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z, type ZodType } from 'zod';
import { validate } from '../middleware/validate';

type NextSpy = NextFunction & ReturnType<typeof vi.fn>;

function createResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

function createNext() {
  return vi.fn() as unknown as NextSpy;
}

describe('validate middleware', () => {
  it('parses request body, query, and params before calling next', () => {
    const req = {
      body: { title: 'Parsed title' },
      query: { limit: '5' },
      params: { id: '42' },
    } as unknown as Request;
    const res = createResponse();
    const next = createNext();

    validate({
      body: z.object({ title: z.string().min(1) }),
      query: z.object({ limit: z.coerce.number().int().positive() }),
      params: z.object({ id: z.coerce.number().int().positive() }),
    })(req, res, next);

    expect(req.body).toEqual({ title: 'Parsed title' });
    expect(req.query).toEqual({ limit: 5 });
    expect(req.params).toEqual({ id: 42 });
    expect(next).toHaveBeenCalledWith();
  });

  it('sends a 400 response for validation errors', () => {
    const req = {
      body: { title: '' },
      query: {},
      params: {},
    } as Request;
    const res = createResponse();
    const next = createNext();

    validate({
      body: z.object({ title: z.string().min(1) }),
    })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining('title'),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes non-validation errors to the error handler', () => {
    const req = { body: {}, query: {}, params: {} } as Request;
    const res = createResponse();
    const next = createNext();
    const error = new Error('schema exploded');

    validate({
      body: {
        parse: () => {
          throw error;
        },
      } as unknown as ZodType,
    })(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
