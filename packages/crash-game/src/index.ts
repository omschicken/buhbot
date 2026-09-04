import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { initCrashWS } from './services/crashWS';
import { crashEngine } from './services/crashEngine';
import crashRouter from './routes/crash';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3008;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'crash-game', timestamp: new Date().toISOString() });
});

app.use('/crash', crashRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const server = createServer(app);
initCrashWS(server);

crashEngine.start()
  .then(() => {
    server.listen(PORT, () => console.log(`Crash game running on port ${PORT}`));
  })
  .catch((e) => {
    console.error('Crash engine start failed:', e);
    process.exit(1);
  });
