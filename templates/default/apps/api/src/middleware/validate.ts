import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type z, type ZodType } from 'zod';

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

type InferBody<T extends Schemas> = T['body'] extends ZodType
  ? z.infer<T['body']>
  : Request['body'];
type InferQuery<T extends Schemas> = T['query'] extends ZodType
  ? z.infer<T['query']>
  : Request['query'];
type InferParams<T extends Schemas> = T['params'] extends ZodType
  ? z.infer<T['params']>
  : Request['params'];

type ValidatedRequest<T extends Schemas> = Request<
  InferParams<T>,
  unknown,
  InferBody<T>,
  InferQuery<T>
>;
type ValidatedHandler<T extends Schemas> = (
  req: ValidatedRequest<T>,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      parseRequest(req, schemas);
      next();
    } catch (error) {
      if (sendValidationError(error, res)) return;
      next(error);
    }
  };
}

export function validated<T extends Schemas>(
  schemas: T,
  handler: ValidatedHandler<T>,
): RequestHandler {
  return (req, res, next) => {
    try {
      parseRequest(req, schemas);
    } catch (error) {
      if (sendValidationError(error, res)) return;
      next(error);
      return;
    }

    void Promise.resolve(handler(req as ValidatedRequest<T>, res, next)).catch(
      next,
    );
  };
}

function parseRequest(req: Request, schemas: Schemas) {
  if (schemas.body) req.body = schemas.body.parse(req.body);
  if (schemas.query)
    setRequestValue(
      req,
      'query',
      schemas.query.parse(req.query) as Request['query'],
    );
  if (schemas.params)
    req.params = schemas.params.parse(req.params) as Request['params'];
}

function setRequestValue<T extends keyof Request>(
  req: Request,
  key: T,
  value: Request[T],
) {
  Object.defineProperty(req, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function sendValidationError(error: unknown, res: Response) {
  if (!(error instanceof ZodError)) return false;

  const issue = error.issues[0];
  const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
  res.status(400).json({ error: `${path}${issue.message}` });
  return true;
}
