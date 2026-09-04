import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import plinkoRouter from './routes/plinko';
import { plinkoService } from './services/plinko.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3010;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'] }));
app.use(express.json({ limit: '10kb' }));

app.use('/plinko', plinkoRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'plinko-game' }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message });
});

plinkoService.init().then(() => {
  app.listen(PORT, () => console.log(`Plinko game running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to start plinko service:', err);
  process.exit(1);
});
