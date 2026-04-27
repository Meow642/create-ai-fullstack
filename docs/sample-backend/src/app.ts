import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import './db';
import healthRouter from './routes/health';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use(healthRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({ error: message });
});
