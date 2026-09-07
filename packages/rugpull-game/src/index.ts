import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { initRugPullWS } from './services/rugpullWS';
import { rugPullEngine } from './services/rugpullEngine';
import rugpullRouter from './routes/rugpull';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3012;

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));

app.use('/rugpull', rugpullRouter);
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'rugpull-game',
  players: rugPullEngine.getState().playersCount
}));

const server = createServer(app);
initRugPullWS(server);
rugPullEngine.start().catch(console.error);

server.listen(PORT, () => console.log(`Rug Pull game running on port ${PORT}`));
