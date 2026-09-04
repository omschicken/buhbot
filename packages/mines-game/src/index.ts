import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import minesRouter from './routes/mines';
import { minesService } from './services/mines.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3011;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'] }));
app.use(express.json({ limit: '10kb' }));

app.use('/mines', minesRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'mines-game' }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal error' });
});

minesService.init().then(() => {
  app.listen(PORT, () => console.log(`Mines game running on port ${PORT}`));
}).catch(console.error);
