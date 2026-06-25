import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { AxiosError } from 'axios';
import routes from './routes/index';

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', routes);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const axiosErr = err instanceof AxiosError ? err : null;
  const status = axiosErr?.response?.status ?? 500;
  const message =
    (axiosErr?.response?.data as { detail?: string } | undefined)?.detail ??
    (err instanceof Error ? err.message : 'Internal server error');
  console.error(`[error] ${req.method} ${req.path} — ${message}`);
  res.status(status).json({ error: message });
});

export default app;
