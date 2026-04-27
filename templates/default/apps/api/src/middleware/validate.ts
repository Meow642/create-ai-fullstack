import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issue = error.issues[0];
        const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
        res.status(400).json({ error: `${path}${issue.message}` });
        return;
      }
      next(error);
    }
  };
}
