import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bonus-engine', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ service: 'bonus-engine', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`bonus-engine running on port ${PORT}`);
});

export default app;
