import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { buildOpenApiDocument } from '@workspace/shared';
import healthRouter from './routes/health';
import itemsRouter from './routes/items';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  app.use(healthRouter);
  app.use(itemsRouter);

  app.use('/docs', apiReference({ content: buildOpenApiDocument() }));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  };
  app.use(errorHandler);

  return app;
}
