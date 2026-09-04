import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import baccaratRouter from './routes/baccarat';
import { baccaratService } from './services/baccarat.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3009;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'] }));
app.use(express.json({ limit: '10kb' }));

app.use('/baccarat', baccaratRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'baccarat-game' }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message });
});

baccaratService.init().then(() => {
  app.listen(PORT, () => console.log(`Baccarat game running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to start baccarat service:', err);
  process.exit(1);
});
